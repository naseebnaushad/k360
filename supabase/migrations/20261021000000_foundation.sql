-- Foundation: extensions and shared helpers used by every feature.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Private schema for helpers that must never be exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Keeps `updated_at` columns current. Attach with:
--   create trigger set_updated_at before update on <table>
--   for each row execute function private.set_updated_at();
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
