-- One query function for browsing, searching and "near me": free text,
-- several categories, distance from a point, data filters and sorting.
-- Replaces search_places. SECURITY INVOKER: row-level security still applies.

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
  p_offset integer default 0
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
      least(greatest(coalesce(p_radius_m, 0), 0), 50000) as radius
  ),
  q as (
    select
      origin,
      radius,
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
      and (q.origin is null or q.radius = 0 or extensions.st_dwithin(p.location, q.origin, q.radius))
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
  'Browse, search and sort visible places in a city, optionally by distance. Respects RLS.';

grant execute on function public.find_places(
  uuid, text, uuid[], double precision, double precision, integer,
  boolean, boolean, boolean, text, integer, integer
) to anon, authenticated;

drop function public.search_places(uuid, text, uuid, integer, integer);
