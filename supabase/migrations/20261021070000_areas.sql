-- Areas (neighbourhoods) within a city, e.g. "Kakkanad" or "Fort Kochi", so
-- people can search the way they think about the city. Imported from
-- OpenStreetMap place nodes; every place belongs to its nearest area.

create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references public.cities (id) on delete cascade,
  slug        text not null
                check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120),
  name        text not null check (char_length(name) between 1 and 120),
  local_name  text check (char_length(local_name) <= 120),
  kind        text not null
                check (kind in ('town', 'suburb', 'quarter', 'neighbourhood', 'village')),
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  location    extensions.geography(Point, 4326) generated always as (
                extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
              ) stored,
  osm_type    text check (osm_type in ('node', 'way', 'relation')),
  osm_id      bigint,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (city_id, slug),
  unique (osm_type, osm_id),
  check ((osm_type is null) = (osm_id is null))
);

comment on table public.areas is 'Neighbourhoods within a city. Places are assigned to the nearest one.';

create index areas_location_idx on public.areas using gist (location);

create trigger set_updated_at
  before update on public.areas
  for each row execute function private.set_updated_at();

alter table public.areas enable row level security;

create policy "Areas in live cities are publicly readable"
  on public.areas for select
  to anon, authenticated
  using (exists (select 1 from public.cities c where c.id = areas.city_id and c.status = 'live'));

revoke all on table public.areas from anon, authenticated;
grant select on table public.areas to anon, authenticated;

alter table public.places
  add column area_id uuid references public.areas (id) on delete set null;

create index places_city_area_idx on public.places (city_id, area_id);

-- Place counts per area, for the area filter.
create view public.city_area_counts
  with (security_invoker = true)
as
select p.city_id, p.area_id, count(*)::integer as place_count
from public.places p
where p.area_id is not null
group by p.city_id, p.area_id;

grant select on public.city_area_counts to anon, authenticated;

-- ─── find_places: area filter, area names in search and results ─
drop function public.find_places(
  uuid, text, uuid[], double precision, double precision, integer,
  boolean, boolean, boolean, text, integer, integer, integer
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
  p_open_at integer default null,
  p_area_id uuid default null
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
  area_name text,
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
      a.name as area_name,
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
        case when lower(a.name) = q.term then 0.6 else 0 end,
        case when p.address ilike q.pattern then 0.4 else 0 end
      ) end::real as rank,
      case when q.origin is not null then extensions.st_distance(p.location, q.origin) end as distance_m
    from q
    join public.places p on p.city_id = p_city_id
    left join public.place_categories c on c.id = p.category_id
    left join public.areas a on a.id = p.area_id
    where (coalesce(cardinality(p_category_ids), 0) = 0 or p.category_id = any (p_category_ids))
      and (p_area_id is null or p.area_id = p_area_id)
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
        or lower(a.name) = q.term
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
  boolean, boolean, boolean, text, integer, integer, integer, uuid
) to anon, authenticated;
