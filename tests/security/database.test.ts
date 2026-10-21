import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { jsonLiteral, queryLinked } from "../../scripts/lib/supabase-cli";

import { testEnv } from "./env";

/** Exactly what a visitor's browser (or an attacker) can do with the public key. */
const anon = createClient<Database>(testEnv.supabaseUrl, testEnv.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = ["cities", "place_categories", "places", "areas", "emergency_contacts"] as const;

/** Any visible row's id, or null when the table is still empty. */
async function firstId(table: (typeof TABLES)[number]) {
  const { data, error } = await anon.from(table).select("id").limit(1);
  expect(error).toBeNull();
  return data?.[0]?.id ?? null;
}

describe("public API key: reading", () => {
  it("sees only live cities", async () => {
    const { data, error } = await anon.from("cities").select("slug, status");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((city) => city.status === "live")).toBe(true);
  });

  it("cannot list draft or archived cities by filtering for them", async () => {
    const { data } = await anon.from("cities").select("id").neq("status", "live");
    expect(data).toEqual([]);
  });

  it("sees only published places", async () => {
    const { data: hidden } = await anon.from("places").select("id").neq("status", "published");
    expect(hidden).toEqual([]);
  });

  it("sees no places belonging to cities it cannot see", async () => {
    const { data: cities } = await anon.from("cities").select("id");
    const visible = new Set(cities!.map((city) => city.id));
    const { data: places } = await anon.from("places").select("city_id").limit(1000);
    expect(places!.every((place) => visible.has(place.city_id))).toBe(true);
  });

  it("cannot read the API schema listing", async () => {
    const response = await fetch(`${testEnv.supabaseUrl}/rest/v1/`, {
      headers: { apikey: testEnv.publishableKey },
    });
    expect(response.ok).toBe(false);
  });
});

describe("public API key: writing", () => {
  it.each(TABLES)("cannot insert into %s", async (table) => {
    const { error } = await anon.from(table).insert({} as never);
    expect(error).not.toBeNull();
  });

  it.for(TABLES)("cannot update %s", async (table, { skip }) => {
    const id = await firstId(table);
    if (!id) return skip(`${table} has no rows to target`);
    const { data, error } = await anon
      .from(table)
      // Setting a column to its current value: harmless even if the test ever fails.
      .update({ id } as never)
      .eq("id", id)
      .select("id");
    expect(error !== null || data?.length === 0).toBe(true);
  });

  it.for(TABLES)("cannot delete from %s", async (table, { skip }) => {
    const id = await firstId(table);
    if (!id) return skip(`${table} has no rows to target`);
    const { data, error } = await anon.from(table).delete().eq("id", id).select("id");
    expect(error !== null || data?.length === 0).toBe(true);
    // The row is still there.
    const { data: still } = await anon.from(table).select("id").eq("id", id);
    expect(still).toHaveLength(1);
  });

  it.each(["city_category_counts", "city_area_counts"] as const)(
    "cannot write through the %s view",
    async (view) => {
      const { error } = await anon.from(view).insert({} as never);
      expect(error).not.toBeNull();
    },
  );
});

describe("find_places function", () => {
  it.for(["' OR '1'='1", "%", "_%", "%%%%", "\\", "'; drop table places; --", "*"])(
    "treats %j as text, never as a match-everything pattern",
    async (query, { skip }) => {
      const { data: city } = await anon.from("cities").select("id").limit(1).single();
      const { count } = await anon
        .from("places")
        .select("id", { count: "exact", head: true })
        .eq("city_id", city!.id);
      if (!count) return skip("no places to search");

      const { data, error } = await anon.rpc("find_places", {
        p_city_id: city!.id,
        p_query: query,
        p_limit: 1,
      });
      expect(error).toBeNull();
      expect(data![0]?.total_count ?? 0).toBeLessThan(count);
    },
  );

  it("ignores invalid coordinates and caps the radius", async () => {
    const { data: city } = await anon.from("cities").select("id").limit(1).single();
    const { data, error } = await anon.rpc("find_places", {
      p_city_id: city!.id,
      p_lat: 999,
      p_lng: -999,
      p_radius_m: 10_000_000,
      p_sort: "distance; drop table places",
      p_limit: 1,
    });
    expect(error).toBeNull();
    expect(data![0]?.distance_m ?? null).toBeNull();
  });

  it("returns nothing for an area from another city", async () => {
    const { data: city } = await anon.from("cities").select("id").limit(1).single();
    const { data, error } = await anon.rpc("find_places", {
      p_city_id: city!.id,
      p_area_id: "00000000-0000-0000-0000-000000000000",
      p_limit: 1,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("caps the page size so one call cannot dump the table", async () => {
    const { data: city } = await anon.from("cities").select("id").limit(1).single();
    const { data } = await anon.rpc("find_places", {
      p_city_id: city!.id,
      p_limit: 100_000,
    });
    expect(data!.length).toBeLessThanOrEqual(50);
  });
});

describe("public API key: functions", () => {
  it.each(["rls_auto_enable", "set_updated_at"])("cannot call %s", async (fn) => {
    const { error } = await anon.rpc(fn as never);
    expect(error).not.toBeNull();
  });
});

describe("problem reports", () => {
  // Marks rows this suite creates so they can be removed afterwards.
  const TEST_NOTE = "automated security test — safe to delete";

  /** The rate-limit test uses the last place; validation tests use the first, so they never hit the limit. */
  async function visiblePlaceId(which: "first" | "last" = "first") {
    const { data } = await anon
      .from("places")
      .select("id")
      .order("id", { ascending: which === "first" })
      .limit(1);
    return data?.[0]?.id ?? null;
  }

  afterAll(async () => {
    await queryLinked(
      `delete from public.place_reports where note = (${jsonLiteral(TEST_NOTE)} #>> '{}');`,
    );
  });

  it("cannot be read back by anyone using the public key", async () => {
    const { data, error } = await anon.from("place_reports").select("id").limit(1);
    expect(error !== null || data?.length === 0).toBe(true);
  });

  it("accepts a report for a visible place, then rate-limits that place", async ({ skip }) => {
    const placeId = await visiblePlaceId("last");
    if (!placeId) return skip("no places to report");

    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(
        await anon
          .from("place_reports")
          .insert({ place_id: placeId, reason: "other", note: TEST_NOTE }),
      );
      if (results.at(-1)!.error) break;
    }
    expect(results[0]!.error).toBeNull();
    expect(results.at(-1)!.error?.code).toBe("P0001");
  });

  it("rejects reports for places that do not exist", async () => {
    const { error } = await anon.from("place_reports").insert({
      place_id: "00000000-0000-4000-8000-000000000000",
      reason: "closed",
      note: TEST_NOTE,
    });
    expect(error).not.toBeNull();
  });

  it.each([
    ["status", { status: "resolved" }],
    ["id", { id: "00000000-0000-4000-8000-000000000001" }],
    ["created_at", { created_at: "2000-01-01T00:00:00Z" }],
  ])("cannot set %s", async (_column, extra) => {
    const placeId = await visiblePlaceId();
    const { error } = await anon
      .from("place_reports")
      .insert({ place_id: placeId!, reason: "closed", note: TEST_NOTE, ...extra } as never);
    expect(error).not.toBeNull();
  });

  it("rejects an unknown reason and an oversized note", async () => {
    const placeId = await visiblePlaceId();
    const badReason = await anon
      .from("place_reports")
      .insert({ place_id: placeId!, reason: "hacked" as never, note: TEST_NOTE });
    expect(badReason.error).not.toBeNull();
    const longNote = await anon
      .from("place_reports")
      .insert({ place_id: placeId!, reason: "other", note: "x".repeat(1001) });
    expect(longNote.error).not.toBeNull();
  });

  it("cannot be changed or deleted", async () => {
    const update = await anon
      .from("place_reports")
      .update({ reason: "other" })
      .neq("reason", "other")
      .select("id");
    expect(update.error !== null || update.data?.length === 0).toBe(true);
    const remove = await anon.from("place_reports").delete().neq("reason", "other").select("id");
    expect(remove.error !== null || remove.data?.length === 0).toBe(true);
  });
});
