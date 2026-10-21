import { describe, expect, it } from "vitest";

import { isAuthorized, revalidateBodySchema } from "./revalidate";

const SECRET = "s".repeat(40);

describe("isAuthorized", () => {
  it("accepts the exact bearer token", () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it.each([null, "", SECRET, `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, `Basic ${SECRET}`])(
    "rejects %j",
    (header) => expect(isAuthorized(header, SECRET)).toBe(false),
  );
});

describe("revalidateBodySchema", () => {
  it("accepts known tag shapes", () => {
    const tags = [
      "cities",
      "cities:kochi",
      "place-categories",
      "places:city:0b7c1f2e-8d3a-4c5b-9e6f-112233445566",
    ];
    expect(revalidateBodySchema.parse({ tags }).tags).toEqual(tags);
  });

  it.each([[[]], [["anything"]], [["places:city:not-a-uuid"]], [Array(21).fill("cities")]])(
    "rejects %j",
    (tags) => expect(revalidateBodySchema.safeParse({ tags }).success).toBe(false),
  );
});
