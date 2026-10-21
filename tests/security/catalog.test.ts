import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { queryLinked } from "../../scripts/lib/supabase-cli";

/**
 * Checks the database's own catalog for risky settings, so a new table or
 * function that forgets row-level security or leaks privileges fails here.
 */
describe("database catalog", () => {
  it("has no security violations", async () => {
    const sql = readFileSync(new URL("./catalog.sql", import.meta.url), "utf8");
    const violations = await queryLinked<{ problem: string; name: string }>(sql);
    expect(violations).toEqual([]);
  });
});
