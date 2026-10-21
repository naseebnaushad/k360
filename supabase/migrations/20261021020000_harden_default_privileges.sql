-- Supabase's default privileges give the API roles TRUNCATE, REFERENCES,
-- TRIGGER and MAINTAIN on every new table. TRUNCATE in particular bypasses
-- row-level security, so the public roles must never hold it. Access is
-- granted explicitly per table instead (see the *_grants migrations).

revoke truncate, references, trigger, maintain
  on all tables in schema public
  from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- Functions are executable by PUBLIC unless revoked. Internal helpers live in
-- the private schema and are only called by triggers.
revoke execute on all functions in schema private from public, anon, authenticated;

alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
