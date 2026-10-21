-- Places: shops, restaurants, services and landmarks within a city.

-- ─── Service area ───────────────────────────────────────────────
alter table public.cities
  add column service_radius_m integer not null default 15000
    check (service_radius_m between 1000 and 100000);

comment on column public.cities.service_radius_m is
  'Radius around the city centre that the city covers (imports, search).';

-- ─── Categories ─────────────────────────────────────────────────
create table public.place_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
                check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  -- OpenStreetMap tags that map to this category, as "key=value".
  osm_tags    text[] not null default '{}',
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.place_categories is 'Global taxonomy for places, shared by all cities.';

create trigger set_updated_at
  before update on public.place_categories
  for each row execute function private.set_updated_at();

alter table public.place_categories enable row level security;

create policy "Categories are publicly readable"
  on public.place_categories for select
  to anon, authenticated
  using (true);

grant select on table public.place_categories to anon, authenticated;

-- ─── Places ─────────────────────────────────────────────────────
create type public.place_status as enum ('published', 'hidden');
create type public.place_source as enum ('community', 'osm');

create table public.places (
  id             uuid primary key default gen_random_uuid(),
  city_id        uuid not null references public.cities (id) on delete cascade,
  category_id    uuid references public.place_categories (id) on delete set null,
  slug           text not null
                   check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120),
  name           text not null check (char_length(name) between 1 and 200),
  local_name     text check (char_length(local_name) <= 200),
  description    text check (char_length(description) <= 2000),
  address        text check (char_length(address) <= 300),
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  location       extensions.geography(Point, 4326) generated always as (
                   extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                 ) stored,
  phone          text check (char_length(phone) <= 50),
  website        text check (website ~* '^https?://' and char_length(website) <= 500),
  opening_hours  text check (char_length(opening_hours) <= 500),
  source         public.place_source not null default 'community',
  osm_type       text check (osm_type in ('node', 'way', 'relation')),
  osm_id         bigint,
  status         public.place_status not null default 'published',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (city_id, slug),
  unique (osm_type, osm_id),
  check ((osm_type is null) = (osm_id is null))
);

comment on table public.places is 'Places within a city. Imported from OpenStreetMap or added by the community.';

create index places_location_idx on public.places using gist (location);
create index places_city_category_name_idx on public.places (city_id, category_id, name);
create index places_name_trgm_idx on public.places using gin (name extensions.gin_trgm_ops);

create trigger set_updated_at
  before update on public.places
  for each row execute function private.set_updated_at();

alter table public.places enable row level security;

create policy "Published places in live cities are publicly readable"
  on public.places for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.cities c
      where c.id = places.city_id and c.status = 'live'
    )
  );

grant select on table public.places to anon, authenticated;

-- ─── Category counts per city ───────────────────────────────────
-- security_invoker makes the view respect the caller's RLS policies.
create view public.city_category_counts
  with (security_invoker = true)
as
select p.city_id, p.category_id, count(*)::integer as place_count
from public.places p
where p.category_id is not null
group by p.city_id, p.category_id;

grant select on public.city_category_counts to anon, authenticated;
