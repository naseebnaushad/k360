-- Everyday words for each category, so a search for what people want
-- ("flowers", "medical shop", "petrol") finds the right kind of place even
-- when shop names do not contain the word. Lowercase; edit as data, no code.

alter table public.place_categories
  add column keywords text[] not null default '{}'
    check (cardinality(keywords) <= 100);

comment on column public.place_categories.keywords is
  'Lowercase search synonyms (English and transliterated Malayalam).';

update public.place_categories set keywords = array['food', 'meals', 'biryani', 'biriyani', 'shawarma', 'porotta', 'parotta', 'sadya', 'seafood', 'fish fry', 'hotel', 'mess', 'thattukada', 'fast food'] where slug = 'restaurants';
update public.place_categories set keywords = array['coffee', 'tea', 'chai', 'chaya', 'juice', 'shake', 'ice cream', 'snacks', 'tea shop', 'chayakada'] where slug = 'cafes';
update public.place_categories set keywords = array['bakery', 'cake', 'cakes', 'pastry', 'sweets', 'puffs', 'bread', 'confectionery', 'halwa'] where slug = 'bakeries';
update public.place_categories set keywords = array['grocery', 'supermarket', 'provisions', 'provision store', 'vegetables', 'fruits', 'fish', 'meat', 'chicken', 'beef', 'kirana', 'store'] where slug = 'groceries';
update public.place_categories set keywords = array['flower', 'flowers', 'bouquet', 'garland', 'mala', 'mulla', 'jasmine', 'roses', 'plants', 'nursery', 'garden'] where slug = 'florists';
update public.place_categories set keywords = array['medical shop', 'medical store', 'medicine', 'medicines', 'chemist', 'drug store', 'pharmacy'] where slug = 'pharmacies';
update public.place_categories set keywords = array['hospital', 'clinic', 'doctor', 'dentist', 'dental', 'health', 'emergency', 'medical'] where slug = 'healthcare';
update public.place_categories set keywords = array['clothes', 'dress', 'saree', 'sari', 'textiles', 'tailor', 'shoes', 'footwear', 'boutique', 'mundu', 'churidar', 'kurta', 'shirt'] where slug = 'clothing';
update public.place_categories set keywords = array['jewelry', 'jewellery', 'gold', 'silver', 'diamond', 'watch', 'watches', 'ornaments'] where slug = 'jewellery';
update public.place_categories set keywords = array['mobile', 'phone', 'mobile phone', 'laptop', 'computer', 'tv', 'appliances', 'charger', 'repair'] where slug = 'electronics';
update public.place_categories set keywords = array['hardware', 'tools', 'paint', 'plumbing', 'electrical', 'furniture', 'home', 'cement', 'sanitary'] where slug = 'hardware';
update public.place_categories set keywords = array['books', 'book shop', 'stationery', 'pens', 'notebooks', 'school supplies'] where slug = 'books';
update public.place_categories set keywords = array['salon', 'beauty parlour', 'parlor', 'barber', 'haircut', 'spa', 'cosmetics', 'makeup', 'unisex salon'] where slug = 'beauty';
update public.place_categories set keywords = array['gym', 'fitness', 'yoga', 'sports', 'sports shop', 'swimming'] where slug = 'fitness';
update public.place_categories set keywords = array['hotel', 'stay', 'lodge', 'homestay', 'resort', 'hostel', 'rooms', 'guest house'] where slug = 'hotels';
update public.place_categories set keywords = array['tourist', 'sightseeing', 'museum', 'fort', 'palace', 'beach', 'church', 'temple', 'viewpoint', 'things to do'] where slug = 'attractions';
update public.place_categories set keywords = array['bank', 'atm', 'cash', 'money exchange', 'forex'] where slug = 'banks';
update public.place_categories set keywords = array['petrol', 'diesel', 'petrol pump', 'fuel', 'ev charging', 'charging station', 'cng'] where slug = 'fuel';

-- Search keywords as well as names. A slightly stricter fuzzy threshold
-- (0.6) applies to keywords because each category has many of them.
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
                    or extensions.word_similarity(term.value, c.name) >= 0.5
         or term.value = any (c.keywords)
         or extensions.word_similarity(term.value, array_to_string(c.keywords, ' ')) >= 0.6
                    or term.value = any (c.keywords)
                    or extensions.word_similarity(term.value, array_to_string(c.keywords, ' ')) >= 0.6
                  then 0.8 else 0 end,
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
         or term.value = any (c.keywords)
         or extensions.word_similarity(term.value, array_to_string(c.keywords, ' ')) >= 0.6
         or p.address ilike term.pattern
       )
  )
  select m.*, count(*) over () as total_count
    from matches m
   order by m.rank desc, m.name, m.id
   limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
$$;
