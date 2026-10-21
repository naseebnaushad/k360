import { describe, expect, it } from "vitest";

import { placesPath } from "./paths";
import { placeListSearchSchema } from "./schemas";

describe("placesPath", () => {
  it("builds the bare list path", () => {
    expect(placesPath()).toBe("/places");
    expect(placesPath({ category: "cafes" })).toBe("/places?category=cafes");
  });

  it("round-trips through the URL schema", () => {
    const filters = placeListSearchSchema.parse({
      q: "tea & cake",
      category: ["cafes", "bakeries"],
      area: "kakkanad",
      near: "9.982,76.3",
      radius: "1000",
      has: ["website"],
      open: "now",
      sort: "distance",
      page: "2",
    });
    const url = new URL(placesPath(filters), "http://x");
    const params = Object.fromEntries(
      [...new Set(url.searchParams.keys())].map((key) => {
        const values = url.searchParams.getAll(key);
        return [key, values.length > 1 ? values : values[0]];
      }),
    );
    expect(placeListSearchSchema.parse(params)).toEqual(filters);
  });

  it("drops the radius without a location", () => {
    expect(placesPath({ radius: 1000 })).toBe("/places");
  });
});
