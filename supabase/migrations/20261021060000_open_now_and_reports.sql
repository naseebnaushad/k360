-- "Open now" and "Report a problem".

-- ─── City time zone ─────────────────────────────────────────────
-- Opening hours are local times, so "open now" needs each city's IANA zone.
alter table public.cities
  add column timezone text not null default 'UTC'
    check (char_length(timezone) <= 64 and timezone ~ '^[A-Za-z]+(?:/[A-Za-z0-9_+-]+)*$');

comment on column public.cities.timezone is 'IANA time zone, e.g. Asia/Kolkata. Used for opening hours.';

update public.cities set timezone = 'Asia/Kolkata' where country_code = 'IN' and timezone = 'UTC';

-- ─── Structured opening hours ───────────────────────────────────
-- Minutes since Monday 00:00 local time (0–10080) when the place is open,
-- parsed from opening_hours by the app (scripts/hours-sync). Null when the
-- text is missing or could not be understood.
alter table public.places
  add column weekly_hours int4multirange
    check (weekly_hours <@ int4multirange(int4range(0, 10080)));

comment on column public.places.weekly_hours is
  'Open intervals as minutes since Monday 00:00 local time. Derived from opening_hours.';

-- ─── find_places: "open now" filter and the hours text ──────────
drop function public.find_places(
  uuid, text, uuid[], double precision, double precision, integer,
  boolean, boolean, boolean, text, integer, integer
);

create function public.find_places(
  p_city_id uuid,
  p_query text default null,
  p_category_ids uuid[] default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m integer default null,
  p_has_phone boolean default false,
  p_has_website boolean default false,
  p_has_hours boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0,
  -- Local time as minutes since Monday 00:00; only places open then match.
  p_open_at integer default null
)
returns table (
  id uuid,
  slug text,
  name text,
  local_name text,
  address text,
  lat double precision,
  lng double precision,
  category_slug text,
  category_name text,
  has_phone boolean,
  has_website boolean,
  has_hours boolean,
  opening_hours text,
  rank real,
  distance_m double precision,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      nullif(lower(btrim(left(coalesce(p_query, ''), 100))), '') as raw_term,
      case
        when p_lat between -90 and 90 and p_lng between -180 and 180
          then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      end as origin,
      least(greatest(coalesce(p_radius_m, 0), 0), 50000) as radius,
      case when p_open_at between 0 and 10079 then p_open_at end as open_at
  ),
  q as (
    select
      origin,
      radius,
      open_at,
      raw_term,
      case when char_length(raw_term) >= 2 then raw_term end as term,
      '%' || replace(replace(replace(coalesce(raw_term, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from input
  ),
  matches as (
    select
      p.id, p.slug, p.name, p.local_name, p.address, p.lat, p.lng,
      c.slug as category_slug, c.name as category_name,
      p.phone is not null as has_phone,
      p.website is not null as has_website,
      p.opening_hours is not null as has_hours,
      p.opening_hours,
      case when q.term is null then 0 else greatest(
        case
          when lower(p.name) = q.term then 3
          when p.name ilike substr(q.pattern, 2) then 2
          when p.name ilike q.pattern then 1.5
          else 0
        end,
        extensions.word_similarity(q.term, p.name),
        case when p.local_name ilike q.pattern then 1 else 0 end,
        case
          when c.name ilike q.pattern
            or extensions.word_similarity(q.term, c.name) >= 0.5
            or q.term = any (c.keywords)
            or extensions.word_similarity(q.term, array_to_string(c.keywords, ' ')) >= 0.6
          then 0.8 else 0
        end,
        case when p.address ilike q.pattern then 0.4 else 0 end
      ) end::real as rank,
      case when q.origin is not null then extensions.st_distance(p.location, q.origin) end as distance_m
    from q
    join public.places p on p.city_id = p_city_id
    left join public.place_categories c on c.id = p.category_id
    where (coalesce(cardinality(p_category_ids), 0) = 0 or p.category_id = any (p_category_ids))
      and (not coalesce(p_has_phone, false) or p.phone is not null)
      and (not coalesce(p_has_website, false) or p.website is not null)
      and (not coalesce(p_has_hours, false) or p.opening_hours is not null)
      and (q.open_at is null or p.weekly_hours @> q.open_at)
      and (q.origin is null or q.radius = 0 or extensions.st_dwithin(p.location, q.origin, q.radius))
      -- A query too short to search matches nothing, rather than everything.
      and not (q.raw_term is not null and q.term is null)
      and (
        q.term is null
        or p.name ilike q.pattern
        or extensions.word_similarity(q.term, p.name) >= 0.5
        or p.local_name ilike q.pattern
        or c.name ilike q.pattern
        or extensions.word_similarity(q.term, c.name) >= 0.5
        or q.term = any (c.keywords)
        or extensions.word_similarity(q.term, array_to_string(c.keywords, ' ')) >= 0.6
        or p.address ilike q.pattern
      )
  )
  select m.*, count(*) over () as total_count
    from matches m
   order by
     case when p_sort = 'distance' then m.distance_m end asc nulls last,
     case when p_sort = 'relevance' then m.rank end desc nulls last,
     m.name, m.id
   limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
$$;

comment on function public.find_places is
  'Search, filter and sort a city''s places in one call. Inputs are clamped; never trusts the caller.';

grant execute on function public.find_places(
  uuid, text, uuid[], double precision, double precision, integer,
  boolean, boolean, boolean, text, integer, integer, integer
) to anon, authenticated;

-- ─── Problem reports ────────────────────────────────────────────
-- Anyone may report a problem with a place, without an account. Reports are
-- write-only from the API: nobody can read, change or delete them except
-- maintainers through the dashboard. Abuse is limited by the trigger below.
create type public.place_report_reason as enum (
  'closed', 'wrong_location', 'wrong_contact', 'wrong_hours', 'duplicate', 'other'
);
create type public.place_report_status as enum ('open', 'resolved', 'dismissed');

create table public.place_reports (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places (id) on delete cascade,
  reason      public.place_report_reason not null,
  note        text check (char_length(note) <= 1000),
  status      public.place_report_status not null default 'open',
  created_at  timestamptz not null default now()
);

comment on table public.place_reports is 'Problems visitors reported with a place. Write-only for the API.';

create index place_reports_place_created_idx on public.place_reports (place_id, created_at desc);
create index place_reports_status_created_idx on public.place_reports (status, created_at desc);

alter table public.place_reports enable row level security;

create policy "Anyone can report a visible place"
  on public.place_reports for insert
  to anon, authenticated
  with check (
    status = 'open'
    -- Evaluated with the caller's own access, so only places they can see qualify.
    and exists (select 1 from public.places p where p.id = place_id)
  );

revoke all on table public.place_reports from anon, authenticated;
grant insert (place_id, reason, note) on table public.place_reports to anon, authenticated;

-- Rate limits. Runs with the owner's rights so it can count reports the
-- caller cannot read; it is a trigger only and nobody can call it directly.
create function private.limit_place_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.place_reports r
       where r.place_id = new.place_id and r.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'This place was reported several times recently. Please try again later.'
      using errcode = 'P0001';
  end if;
  if (select count(*) from public.place_reports r
       where r.created_at > now() - interval '10 minutes') >= 200 then
    raise exception 'Too many reports right now. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function private.limit_place_reports() from public, anon, authenticated;

create trigger limit_place_reports
  before insert on public.place_reports
  for each row execute function private.limit_place_reports();
