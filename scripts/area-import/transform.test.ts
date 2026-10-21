import { describe, expect, it } from "vitest";

import { toAreaRows } from "./transform.ts";

const ctx = { cityId: "city", languages: ["en", "ml"], existingSlugs: new Map<string, string>() };
const node = (id: number, tags: Record<string, string>) => ({
  type: "node" as const,
  id,
  lat: 10,
  lon: 76,
  tags,
});

describe("toAreaRows", () => {
  it("converts named place nodes", () => {
    const [row] = toAreaRows(
      [node(1, { place: "suburb", name: "Kakkanad", "name:ml": "കാക്കനാട്" })],
      ctx,
    );
    expect(row).toMatchObject({
      slug: "kakkanad",
      name: "Kakkanad",
      local_name: "കാക്കനാട്",
      kind: "suburb",
      lat: 10,
      lng: 76,
    });
  });

  it("skips unnamed features and other place kinds", () => {
    expect(
      toAreaRows([node(1, { place: "suburb" }), node(2, { place: "city", name: "Kochi" })], ctx),
    ).toEqual([]);
  });

  it("keeps the most significant feature when names repeat", () => {
    const rows = toAreaRows(
      [
        node(1, { place: "neighbourhood", name: "Thevara" }),
        node(2, { place: "suburb", name: "thevara" }),
      ],
      ctx,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ osm_id: 2, kind: "suburb" });
  });

  it("keeps existing slugs and avoids taken ones", () => {
    const rows = toAreaRows(
      [
        node(1, { place: "suburb", name: "Edappally" }),
        node(2, { place: "village", name: "Old Edappally" }),
      ],
      {
        ...ctx,
        existingSlugs: new Map([
          ["node/1", "edappally-old-slug"],
          ["node/9", "old-edappally"],
        ]),
      },
    );
    expect(rows.map((row) => row.slug)).toEqual(["edappally-old-slug", "old-edappally-2"]);
  });
});
