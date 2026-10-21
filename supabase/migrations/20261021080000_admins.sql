-- Maintainers who review "Report a problem" submissions.
-- Accounts are created in the Supabase dashboard; `npm run admin:add` grants access.

create table public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.admins is 'Users allowed to review place reports. Managed with npm run admin:add.';

alter table public.admins enable row level security;

-- A signed-in user can only ever see their own row, i.e. learn whether they are an admin.
create policy "Users can see their own admin row"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.admins from anon, authenticated;
grant select on table public.admins to authenticated;

-- ─── Reports: admins can read them and change their status ──────
alter table public.place_reports
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

create policy "Admins can read reports"
  on public.place_reports for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

create policy "Admins can review reports"
  on public.place_reports for update
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

grant select on table public.place_reports to authenticated;
-- Only the status is editable; who and when are filled in by the trigger below.
grant update (status) on table public.place_reports to authenticated;

create function private.stamp_place_report_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := case when new.status = 'open' then null else now() end;
    new.reviewed_by := case when new.status = 'open' then null else (select auth.uid()) end;
  end if;
  return new;
end;
$$;

revoke execute on function private.stamp_place_report_review() from public, anon, authenticated;

create trigger stamp_place_report_review
  before update on public.place_reports
  for each row execute function private.stamp_place_report_review();
