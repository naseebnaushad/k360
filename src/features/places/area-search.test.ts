import { describe, expect, it } from "vitest";

import { splitAreaQuery } from "./area-search";

const areas = [
  { slug: "kakkanad", name: "Kakkanad", localName: "കാക്കനാട്" },
  { slug: "fort-kochi", name: "Fort Kochi", localName: null },
];

describe("splitAreaQuery", () => {
  it("splits a query naming an area", () => {
    expect(splitAreaQuery("cafes in Kakkanad", areas)).toEqual({ q: "cafes", area: areas[0] });
    expect(splitAreaQuery("atm near fort-kochi", areas)).toEqual({ q: "atm", area: areas[1] });
    expect(splitAreaQuery("tea at  FORT KOCHI ", areas)?.area.slug).toBe("fort-kochi");
  });

  it("matches local-language names", () => {
    expect(splitAreaQuery("bakery in കാക്കനാട്", areas)?.area.slug).toBe("kakkanad");
  });

  it("leaves other queries alone", () => {
    expect(splitAreaQuery("cafes", areas)).toBeNull();
    expect(splitAreaQuery("open in the morning", areas)).toBeNull();
    expect(splitAreaQuery("in Kakkanad", areas)).toBeNull();
  });
});
