-- Database security invariants. Every row returned is a violation.
with api_roles(role) as (values ('anon'), ('authenticated')),
-- Functions intentionally callable through the API. Each must be SECURITY INVOKER.
public_functions(name) as (values ('find_places'), ('places_near')),
relations as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity, c.reloptions
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
)
select 'table without row-level security' as problem, relname as name
  from relations where relkind in ('r', 'p') and not relrowsecurity
union all
select 'view without security_invoker', relname
  from relations
 where relkind in ('v', 'm') and not coalesce(reloptions @> array['security_invoker=true'], false)
union all
select 'API role can ' || lower(priv), relname || ' (' || role || ')'
  from relations, api_roles,
       unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) priv
 where has_table_privilege(role, relations.oid, priv)
union all
-- Column-level grants are invisible to has_table_privilege, so check them separately.
-- Allowed: anonymous problem reports (insert only; RLS and a rate-limit trigger apply),
-- and signed-in users changing a report's status (RLS limits that to public.admins).
select 'API role can ' || lower(priv) || ' some columns', relname || ' (' || role || ')'
  from relations, api_roles, unnest(array['INSERT', 'UPDATE', 'REFERENCES']) priv
 where has_any_column_privilege(role, relations.oid, priv)
   and not (relname = 'place_reports' and priv = 'INSERT')
   and not (relname = 'place_reports' and priv = 'UPDATE' and role = 'authenticated'
            and not exists (select 1 from pg_attribute a
                             where a.attrelid = relations.oid and a.attnum > 0
                               and not a.attisdropped and a.attname <> 'status'
                               and has_column_privilege(role, relations.oid, a.attnum, 'UPDATE')))
union all
select 'anonymous role can read reports', relname
  from relations
 where relname in ('place_reports', 'admins')
   and has_any_column_privilege('anon', relations.oid, 'SELECT')
union all
-- Admin-only tables must have no policy that lets anonymous visitors through.
select 'admin-only table has a policy for anon', tablename || ': ' || policyname
  from pg_policies
 where schemaname = 'public' and tablename in ('place_reports', 'admins')
   and cmd <> 'INSERT' and ('anon' = any (roles) or 'public' = any (roles))
union all
select 'API role can execute function', n.nspname || '.' || p.proname || ' (' || role || ')'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace, api_roles
 where n.nspname in ('public', 'private') and has_function_privilege(role, p.oid, 'execute')
   and not (n.nspname = 'public' and p.proname in (select name from public_functions))
union all
select 'public function is SECURITY DEFINER', p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef and p.proname in (select name from public_functions)
union all
select 'API role can use private schema', role
  from api_roles where has_schema_privilege(role, 'private', 'usage')
union all
select 'security definer function without fixed search_path', n.nspname || '.' || p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'private') and p.prosecdef
   and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
order by 1, 2;
