-- The platform's RLS safety-net event trigger function should not be callable
-- through the API. Event triggers fire regardless of EXECUTE privileges.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
