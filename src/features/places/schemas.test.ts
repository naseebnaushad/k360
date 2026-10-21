import { describe, expect, it } from "vitest";

import { effectiveSort } from "./filters";
import { parseNear, placeListSearchSchema } from "./schemas";

const parse = (input: Record<string, unknown>) => placeListSearchSchema.parse(input);

describe("placeListSearchSchema", () => {
  it("parses a full filter set", () => {
    expect(
      parse({
        q: " cake ",
        category: ["bakeries", "cafes"],
        area: "fort-kochi",
        near: "9.98163,76.29991",
        radius: "2000",
        has: ["phone", "hours"],
        open: "now",
        sort: "distance",
        page: "3",
      }),
    ).toEqual({
      q: "cake",
      categories: ["bakeries", "cafes"],
      area: "fort-kochi",
      near: { lat: 9.982, lng: 76.3 },
      radius: 2000,
      has: ["phone", "hours"],
      open: true,
      sort: "distance",
      page: 3,
    });
  });

  it("only accepts open=now", () => {
    expect(parse({ open: "yes" }).open).toBeUndefined();
    expect(parse({ open: ["now", "x"] }).open).toBe(true);
  });

  it("defaults when params are missing", () => {
    expect(parse({})).toEqual({ categories: [], has: [], page: 1 });
  });

  it("drops invalid values instead of throwing", () => {
    expect(
      parse({
        category: ["<script>", "cafes", "cafes"],
        area: "../admin",
        near: "999,1",
        radius: "123",
        has: ["phone", "admin"],
        sort: "drop table",
        page: "-4",
      }),
    ).toEqual({ categories: ["cafes"], has: ["phone"], page: 1 });
  });

  it("ignores a radius without a location", () => {
    expect(parse({ radius: "1000" }).radius).toBeUndefined();
  });

  it("caps the number of categories", () => {
    const many = Array.from({ length: 50 }, (_, i) => `c${i}`);
    expect(parse({ category: many }).categories).toHaveLength(20);
  });
});

describe("search query", () => {
  it("normalises whitespace and control characters", () => {
    expect(parse({ q: "  red \n\t roses\u0000 " }).q).toBe("red roses");
  });

  it("ignores queries that are too short", () => {
    expect(parse({ q: " a " }).q).toBeUndefined();
  });

  it("truncates very long queries", () => {
    expect(parse({ q: "x".repeat(500) }).q).toHaveLength(100);
  });

  it("keeps markup as plain text for the renderer to escape", () => {
    expect(parse({ q: "<b>tulips</b>" }).q).toBe("<b>tulips</b>");
  });

  it("keeps non-Latin scripts", () => {
    expect(parse({ q: "ചായ" }).q).toBe("ചായ");
  });
});

describe("parseNear", () => {
  it.each(["", "abc", "9.9", "9.9,76.3,1", "91,0", "0,181", "1e3,2"])("rejects %j", (value) =>
    expect(parseNear(value)).toBeUndefined(),
  );

  it("rounds to about 110 m for privacy", () => {
    expect(parseNear("9.981634,76.299171")).toEqual({ lat: 9.982, lng: 76.299 });
  });
});

describe("effectiveSort", () => {
  it("picks a sensible default", () => {
    expect(effectiveSort({})).toBe("name");
    expect(effectiveSort({ q: "cake" })).toBe("relevance");
    expect(effectiveSort({ near: { lat: 1, lng: 1 } })).toBe("distance");
  });

  it("falls back when the chosen sort is impossible", () => {
    expect(effectiveSort({ sort: "distance" })).toBe("name");
    expect(effectiveSort({ sort: "relevance", near: { lat: 1, lng: 1 } })).toBe("distance");
  });
});
