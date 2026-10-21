-- Development seed data. Applied by `supabase db reset` (local) only.

insert into public.cities
  (slug, name, local_name, tagline, region, country_code, languages, timezone, center_lat, center_lng, default_zoom, status)
values
  ('kochi', 'Kochi', 'കൊച്ചി', null, 'Kerala', 'IN', array['en', 'ml'], 'Asia/Kolkata', 9.9816, 76.2999, 12, 'live')
on conflict (slug) do nothing;
