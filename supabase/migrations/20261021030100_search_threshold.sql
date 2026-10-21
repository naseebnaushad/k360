-- Loosens typo tolerance in search_places. pg_trgm's default word-similarity
-- threshold (0.6, used by the <% operator) misses common local spelling
-- variants: "biryani" vs "Biriyani" scores 0.55, "shavarma" vs "Shawarma"
-- 0.50, while unrelated words stay well below (e.g. "pizza"/"Plaza" 0.20).
-- Hosted Supabase does not allow changing the threshold setting, so the
-- comparison is explicit. This scans the city's places instead of using the
-- trigram index, which is fast at city scale (thousands of rows); revisit
-- with a prefilter if a city grows past ~100k places.

create or replace function public.search_places(
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
                    or extensions.word_similarity(term.value, c.name) >= 0.5 then 0.8 else 0 end,
             case when p.address ilike term.pattern then 0.4 else 0 end
           )::real as rank
      from term
      join public.places p on p.city_id = p_city_id
      left join public.place_categories c on c.id = p.category_id
     where (p_category_id is null or p.category_id = p_category_id)
       and (
         p.name ilike term.pattern
         or extensions.word_similarity(term.value, p.name) >= 0.5
         or p.local_name ilike term.pattern
         or c.name ilike term.pattern
         or extensions.word_similarity(term.value, c.name) >= 0.5
         or p.address ilike term.pattern
       )
  )
  select m.*, count(*) over () as total_count
    from matches m
   order by m.rank desc, m.name, m.id
   limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
$$;
