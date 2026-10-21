import { describe, expect, it } from "vitest";

import {
  assignSlugs,
  buildAddress,
  dedupeElements,
  matchCategory,
  normalizeWebsite,
  parseTag,
  parseTagGroup,
  slugify,
  toPlaceRow,
  type CategoryRule,
  type OsmElement,
} from "./transform.ts";

const rules: CategoryRule[] = [
  {
    id: "metro",
    slug: "metro",
    tags: [parseTagGroup("railway=station+station=subway")],
    unnamedLabel: null,
  },
  { id: "trains", slug: "trains", tags: [parseTagGroup("railway=station")], unnamedLabel: null },
  { id: "cafes", slug: "cafes", tags: [parseTagGroup("amenity=cafe")], unnamedLabel: null },
  {
    id: "florists",
    slug: "florists",
    tags: [parseTagGroup("shop=florist"), parseTagGroup("shop=garden_centre")],
    unnamedLabel: null,
  },
  { id: "atms", slug: "atms", tags: [parseTagGroup("amenity=atm")], unnamedLabel: "ATM" },
  {
    id: "toilets",
    slug: "toilets",
    tags: [parseTagGroup("amenity=toilets")],
    unnamedLabel: "Public toilet",
  },
];
const ctx = { cityId: "city-1", languages: ["en", "ml"], categoryRules: rules };

describe("parseTag", () => {
  it("parses key=value", () => {
    expect(parseTag("shop=garden_centre")).toEqual({ key: "shop", value: "garden_centre" });
  });

  it("rejects anything that could break an Overpass query", () => {
    expect(() => parseTag('shop="x"];out;')).toThrow();
    expect(() => parseTag("shop")).toThrow();
  });
});

describe("parseTagGroup", () => {
  it("parses tags joined with +", () => {
    expect(parseTagGroup("railway=station+station=subway")).toEqual([
      { key: "railway", value: "station" },
      { key: "station", value: "subway" },
    ]);
  });

  it("rejects a bad tag anywhere in the group", () => {
    expect(() => parseTagGroup('railway=station+x"];out;')).toThrow();
  });
});

describe("matchCategory", () => {
  it("returns the first matching rule", () => {
    expect(matchCategory({ shop: "garden_centre" }, rules)?.id).toBe("florists");
    expect(matchCategory({ shop: "bakery" }, rules)).toBeNull();
  });

  it("needs every tag in a group", () => {
    expect(matchCategory({ railway: "station", station: "subway" }, rules)?.id).toBe("metro");
    expect(matchCategory({ railway: "station" }, rules)?.id).toBe("trains");
  });
});

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Kashi Art Café & Gallery")).toBe("kashi-art-cafe-and-gallery");
    expect(slugify("  --Paragon--  ")).toBe("paragon");
  });

  it("returns empty for non-Latin names", () => {
    expect(slugify("കൊച്ചി")).toBe("");
  });
});

describe("buildAddress", () => {
  it("joins address parts", () => {
    expect(
      buildAddress({
        "addr:housenumber": "12",
        "addr:street": "MG Road",
        "addr:city": "Kochi",
        "addr:postcode": "682011",
      }),
    ).toBe("12 MG Road, Kochi, 682011");
  });

  it("returns null without address tags", () => {
    expect(buildAddress({})).toBeNull();
  });
});

describe("normalizeWebsite", () => {
  it("adds a scheme and rejects non-http URLs", () => {
    expect(normalizeWebsite("www.example.com")).toBe("https://www.example.com/");
    expect(normalizeWebsite("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsite("ftp://example.com")).toBeNull();
    expect(normalizeWebsite("mailto:info@example.com")).toBeNull();
    expect(normalizeWebsite("user:pass@example.com")).toBeNull();
    expect(normalizeWebsite("example.com:8080/menu")).toBe("https://example.com:8080/menu");
    expect(normalizeWebsite("https://a.com; https://b.com")).toBe("https://a.com/");
    expect(normalizeWebsite(undefined)).toBeNull();
  });
});

describe("toPlaceRow", () => {
  const cafe: OsmElement = {
    type: "node",
    id: 42,
    lat: 9.96,
    lon: 76.24,
    tags: {
      amenity: "cafe",
      name: "Kashi Art Cafe",
      "name:ml": "കാശി ആർട്ട് കഫേ",
      phone: "+91 1;+91 2",
    },
  };

  it("maps a named, categorised feature", () => {
    expect(toPlaceRow(cafe, ctx)).toMatchObject({
      category_id: "cafes",
      name: "Kashi Art Cafe",
      local_name: "കാശി ആർട്ട് കഫേ",
      phone: "+91 1",
      lat: 9.96,
      lng: 76.24,
      osm_type: "node",
      osm_id: 42,
    });
  });

  it("uses the centre of ways", () => {
    const way: OsmElement = {
      ...cafe,
      type: "way",
      lat: undefined,
      lon: undefined,
      center: { lat: 1, lon: 2 },
    };
    expect(toPlaceRow(way, ctx)).toMatchObject({ lat: 1, lng: 2 });
  });

  it("names unnamed spots from the category label and brand", () => {
    const atm: OsmElement = { type: "node", id: 7, lat: 1, lon: 2, tags: { amenity: "atm" } };
    expect(toPlaceRow(atm, ctx)?.name).toBe("ATM");
    expect(toPlaceRow({ ...atm, tags: { amenity: "atm", brand: "SBI" } }, ctx)?.name).toBe(
      "SBI ATM",
    );
    expect(
      toPlaceRow({ ...atm, tags: { amenity: "atm", name: "Federal Bank ATM" } }, ctx)?.name,
    ).toBe("Federal Bank ATM");
  });

  it("skips spots that are not open to the public", () => {
    const tags = { amenity: "toilets", access: "private" };
    expect(toPlaceRow({ type: "node", id: 8, lat: 1, lon: 2, tags }, ctx)).toBeNull();
    expect(toPlaceRow({ ...cafe, tags: { ...cafe.tags, access: "no" } }, ctx)).toBeNull();
  });

  it("skips unnamed or uncategorised features", () => {
    expect(toPlaceRow({ ...cafe, tags: { amenity: "cafe" } }, ctx)).toBeNull();
    expect(toPlaceRow({ ...cafe, tags: { name: "X", shop: "bakery" } }, ctx)).toBeNull();
  });
});

describe("assignSlugs", () => {
  const base = toPlaceRow(
    { type: "node", id: 1, lat: 0, lon: 0, tags: { amenity: "cafe", name: "Cafe" } },
    ctx,
  )!;

  it("deduplicates slugs within a city", () => {
    const rows = assignSlugs([base, { ...base, osm_id: 2 }, { ...base, osm_id: 3 }], new Map());
    expect(rows.map((r) => r.slug)).toEqual(["cafe", "cafe-2", "cafe-3"]);
  });

  it("keeps existing slugs and avoids taken ones", () => {
    const existing = new Map([["node/2", "cafe"]]);
    const rows = assignSlugs([base, { ...base, osm_id: 2 }], existing);
    expect(rows.find((r) => r.osm_id === 2)?.slug).toBe("cafe");
    expect(rows.find((r) => r.osm_id === 1)?.slug).toBe("cafe-2");
  });

  it("falls back to an id-based slug for non-Latin names", () => {
    const [row] = assignSlugs([{ ...base, name: "കഫേ", osm_id: 7 }], new Map());
    expect(row?.slug).toBe("place-7");
  });
});

describe("dedupeElements", () => {
  it("removes repeated features", () => {
    const el: OsmElement = { type: "node", id: 1 };
    expect(dedupeElements([el, el, { type: "way", id: 1 }])).toHaveLength(2);
  });
});

describe("assignSlugs with reserved slugs", () => {
  it("avoids slugs used by community-added places", () => {
    const row = {
      city_id: "c",
      category_id: "k",
      name: "Cafe Rio",
      local_name: null,
      address: null,
      lat: 0,
      lng: 0,
      phone: null,
      website: null,
      opening_hours: null,
      osm_type: "node" as const,
      osm_id: 1,
    };
    const [placed] = assignSlugs([row], new Map(), ["cafe-rio"]);
    expect(placed?.slug).toBe("cafe-rio-2");
  });
});
