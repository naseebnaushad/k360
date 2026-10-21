import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { queryLinked } from "../../scripts/lib/supabase-cli";

import { testEnv } from "./env";

const anon = createClient<Database>(testEnv.supabaseUrl, testEnv.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const USER = "00000000-0000-4000-8000-0000000000b1";

/**
 * Runs `sql` as a signed-in user (`sub`) the way the API would, with a test
 * admin, a test user and one report created first. Everything happens inside
 * a transaction that is always rolled back, so the real data is never touched.
 */
function asUser<T>(sub: string, sql: string) {
  return queryLinked<T>(`begin;
insert into auth.users (id, email, aud, role) values
  ('${ADMIN}', 'admin-test@k360.invalid', 'authenticated', 'authenticated'),
  ('${USER}', 'user-test@k360.invalid', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('${ADMIN}');
insert into public.place_reports (place_id, reason, note)
  select id, 'other', 'security test' from public.places limit 1;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '${sub}', 'role', 'authenticated')::text, true);
${sql}
rollback;`);
}

describe("admin access to reports", () => {
  it("an admin can read reports", async () => {
    const [row] = await asUser<{ n: number }>(
      ADMIN,
      "select count(*)::int as n from public.place_reports;",
    );
    expect(row!.n).toBeGreaterThan(0);
  });

  it("a signed-in user who is not an admin sees no reports", async () => {
    const [row] = await asUser<{ n: number }>(
      USER,
      "select count(*)::int as n from public.place_reports;",
    );
    expect(row!.n).toBe(0);
  });

  it("a non-admin cannot change a report's status", async () => {
    const [row] = await asUser<{ n: number }>(
      USER,
      `with changed as (update public.place_reports set status = 'dismissed' returning 1)
       select count(*)::int as n from changed;`,
    );
    expect(row!.n).toBe(0);
  });

  it("an admin's review is stamped with who and when", async () => {
    const [row] = await asUser<{ by: string; stamped: boolean }>(
      ADMIN,
      `with changed as (
         update public.place_reports set status = 'resolved'
          where note = 'security test' returning reviewed_by, reviewed_at)
       select reviewed_by::text as by, reviewed_at is not null as stamped from changed;`,
    );
    expect(row).toEqual({ by: ADMIN, stamped: true });
  });

  it.for([
    ["the note", "note = 'changed'"],
    ["the reviewer", `reviewed_by = '${USER}'`],
    ["the place", "place_id = place_id"],
  ])("even an admin cannot edit %s", async ([, assignment]) => {
    await expect(asUser(ADMIN, `update public.place_reports set ${assignment};`)).rejects.toThrow(
      /permission denied/,
    );
  });

  it("an admin cannot delete reports", async () => {
    await expect(asUser(ADMIN, "delete from public.place_reports;")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("users can only see their own admin row", async () => {
    const [row] = await asUser<{ n: number }>(
      USER,
      "select count(*)::int as n from public.admins;",
    );
    expect(row!.n).toBe(0);
  });

  it("users cannot make themselves admin", async () => {
    await expect(
      asUser(USER, `insert into public.admins (user_id) values ('${USER}');`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("public API key and admin data", () => {
  it.each(["place_reports", "admins"] as const)("cannot read %s", async (table) => {
    const { data, error } = await anon.from(table).select("*").limit(1);
    expect(error !== null || data?.length === 0).toBe(true);
  });

  it("public sign-ups are switched off", async () => {
    // Accounts are created by hand in the dashboard; nobody should be able to register.
    // Fix: Supabase dashboard → Authentication → Sign In / Providers → turn off
    // "Allow new users to sign up".
    const response = await fetch(`${testEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: testEnv.publishableKey },
    });
    const settings = (await response.json()) as { disable_signup: boolean };
    expect(settings.disable_signup, "public sign-ups are enabled").toBe(true);
  });
});
