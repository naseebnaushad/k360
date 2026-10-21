/**
 * Gives an existing account access to the admin page, or takes it away.
 *
 *   npm run admin:add -- --email you@example.com
 *   npm run admin:add -- --email you@example.com --remove
 *
 * Create the account first in the Supabase dashboard (Authentication → Users →
 * Add user, with "Auto confirm" on). This script never sees a password.
 */
import { parseArgs } from "node:util";

import { jsonLiteral, queryLinked as query } from "../lib/supabase-cli.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { email: { type: "string" }, remove: { type: "boolean", default: false } },
    strict: true,
  });
  const email = values.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error("Usage: npm run admin:add -- --email <address> [--remove]");
  }

  const [user] = await query<{ id: string }>(
    // The email is passed as a quoted JSON value, so it can never change the query.
    `select id from auth.users where lower(email) = (${jsonLiteral(email)} #>> '{}');`,
  );
  if (!user || !UUID_PATTERN.test(user.id)) {
    throw new Error(
      `No account for ${email}. Create it in the Supabase dashboard (Authentication → Users) first.`,
    );
  }

  if (values.remove) {
    await query(`delete from public.admins where user_id = '${user.id}';`);
    console.log(`✔ ${email} is no longer an admin.`);
  } else {
    await query(
      `insert into public.admins (user_id) values ('${user.id}') on conflict do nothing;`,
    );
    console.log(`✔ ${email} is now an admin.`);
  }
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
