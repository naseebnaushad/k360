-- Emergency phone numbers shown on each city's /emergency page.
-- Country-wide numbers have no city; a city can add its own local numbers.

create table public.emergency_contacts (
  id            uuid primary key default gen_random_uuid(),
  country_code  char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city_id       uuid references public.cities (id) on delete cascade,
  number        text not null check (number ~ '^\+?[0-9]{2,15}$'),
  label         text not null check (char_length(label) between 1 and 80),
  description   text check (char_length(description) <= 200),
  kind          text not null
                  check (kind in ('general', 'police', 'fire', 'medical', 'women',
                                  'children', 'cyber', 'disaster', 'other')),
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique nulls not distinct (country_code, city_id, number)
);

comment on table public.emergency_contacts is 'Emergency numbers per country, plus optional per-city numbers.';

create index emergency_contacts_country_idx on public.emergency_contacts (country_code, sort_order);

create trigger set_updated_at
  before update on public.emergency_contacts
  for each row execute function private.set_updated_at();

alter table public.emergency_contacts enable row level security;

create policy "Emergency numbers are publicly readable"
  on public.emergency_contacts for select
  to anon, authenticated
  using (
    city_id is null
    or exists (select 1 from public.cities c where c.id = emergency_contacts.city_id and c.status = 'live')
  );

revoke all on table public.emergency_contacts from anon, authenticated;
grant select on table public.emergency_contacts to anon, authenticated;

-- India: national numbers (Ministry of Home Affairs / state services).
insert into public.emergency_contacts (country_code, number, label, description, kind, sort_order) values
  ('IN', '112',  'Emergency',            'Police, fire and ambulance: one number for all emergencies', 'general',  10),
  ('IN', '100',  'Police',               null,                                                        'police',   20),
  ('IN', '101',  'Fire & rescue',        null,                                                        'fire',     30),
  ('IN', '108',  'Ambulance',            'Free emergency ambulance',                                  'medical',  40),
  ('IN', '1091', 'Women helpline',       null,                                                        'women',    50),
  ('IN', '1098', 'Child helpline',       null,                                                        'children', 60),
  ('IN', '1930', 'Cyber fraud',          'Report online or banking fraud quickly',                    'cyber',    70),
  ('IN', '1077', 'Disaster control room','District emergency operations centre (floods, storms)',    'disaster', 80);
