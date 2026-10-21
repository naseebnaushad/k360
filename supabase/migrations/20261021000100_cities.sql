-- Cities: each city is a tenant, served at <slug>.<root domain>.

create type public.city_status as enum ('draft', 'live', 'archived');

create table public.cities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  name          text not null check (char_length(name) between 1 and 100),
  local_name    text check (char_length(local_name) <= 100),
  tagline       text check (char_length(tagline) <= 200),
  region        text not null check (char_length(region) between 1 and 100),
  country_code  char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  languages     text[] not null default array['en']
                  check (cardinality(languages) between 1 and 10),
  center_lat    double precision not null check (center_lat between -90 and 90),
  center_lng    double precision not null check (center_lng between -180 and 180),
  default_zoom  smallint not null default 12 check (default_zoom between 1 and 20),
  status        public.city_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.cities is 'Cities served by the platform; one subdomain each.';

create index cities_status_idx on public.cities (status);

create trigger set_updated_at
  before update on public.cities
  for each row execute function private.set_updated_at();

-- Row Level Security: deny by default, then allow only what is intended.
alter table public.cities enable row level security;

create policy "Live cities are publicly readable"
  on public.cities for select
  to anon, authenticated
  using (status = 'live');

-- No insert/update/delete policies: changes go through admin tooling only.
