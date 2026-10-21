-- Place search and proximity queries, exposed to the API as RPC functions.
-- Both are SECURITY INVOKER, so the caller's row-level security still decides
-- which places are visible; they only add matching, ranking and distance.

-- Text search over name, local name, category and address. Tolerates typos
-- through trigram word similarity (pg_trgm), e.g. "biriyani" finds "Biryani".
create function public.search_places(
  p_city_id uuid,
  p_query text,
  p_category_id uuid default null,
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
  rank real,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (
    select t.value as value,
           '%' || replace(replace(replace(t.value, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
      from (select lower(btrim(left(coalesce(p_query, ''), 100))) as value) t
     where char_length(t.value) >= 2
  ),
  matches as (
    select p.id, p.slug, p.name, p.local_name, p.address, p.lat, p.lng,
           c.slug as category_slug, c.name as category_name,
           greatest(
             case
               when lower(p.name) = term.value then 3
               when p.name ilike substr(term.pattern, 2) then 2
               when p.name ilike term.pattern then 1.5
               else 0
             end,
             extensions.word_similarity(term.value, p.name),
             case when p.local_name ilike term.pattern then 1 else 0 end,
             case when c.name ilike term.pattern
                    or term.value operator(extensions.<%) c.name then 0.8 else 0 end,
             case when p.address ilike term.pattern then 0.4 else 0 end
           )::real as rank
      from term
      join public.places p on p.city_id = p_city_id
      left join public.place_categories c on c.id = p.category_id
     where (p_category_id is null or p.category_id = p_category_id)
       and (
         p.name ilike term.pattern
         or term.value operator(extensions.<%) p.name
         or p.local_name ilike term.pattern
         or c.name ilike term.pattern
         or term.value operator(extensions.<%) c.name
         or p.address ilike term.pattern
       )
  )
  select m.*, count(*) over () as total_count
    from matches m
   order by m.rank desc, m.name, m.id
   limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
$$;

comment on function public.search_places is
  'Ranked, typo-tolerant search of visible places in a city. Respects RLS.';

-- Places near a point, closest first. Used for "Nearby" on place pages.
create function public.places_near(
  p_city_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 1000,
  p_exclude_id uuid default null,
  p_limit integer default 6
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
  distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as point
     where p_lat between -90 and 90 and p_lng between -180 and 180
  )
  select p.id, p.slug, p.name, p.local_name, p.address, p.lat, p.lng,
         c.slug, c.name,
         extensions.st_distance(p.location, origin.point) as distance_m
    from origin
    join public.places p
      on p.city_id = p_city_id
     and extensions.st_dwithin(p.location, origin.point, least(greatest(coalesce(p_radius_m, 1000), 50), 20000))
    left join public.place_categories c on c.id = p.category_id
   where p_exclude_id is null or p.id <> p_exclude_id
   order by p.location operator(extensions.<->) origin.point
   limit least(greatest(coalesce(p_limit, 6), 1), 50);
$$;

comment on function public.places_near is
  'Visible places in a city within a radius of a point, nearest first. Respects RLS.';

-- Execute is revoked by default (see harden_default_privileges); grant explicitly.
grant execute on function public.search_places(uuid, text, uuid, integer, integer) to anon, authenticated;
grant execute on function public.places_near(uuid, double precision, double precision, integer, uuid, integer) to anon, authenticated;
