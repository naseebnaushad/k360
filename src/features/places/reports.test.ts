import { describe, expect, it } from "vitest";

import { REPORT_NOTE_MAX_LENGTH, placeReportSchema } from "./reports";

const PLACE_ID = "6f1d3c1e-2b7a-4c55-9d2e-0a1b2c3d4e5f";

describe("placeReportSchema", () => {
  it("accepts a valid report and cleans the note", () => {
    const result = placeReportSchema.parse({
      placeId: PLACE_ID,
      reason: "wrong_contact",
      note: "  New number:\u0000 0484 123​4567  ",
      company: "",
    });
    expect(result).toEqual({
      placeId: PLACE_ID,
      reason: "wrong_contact",
      note: "New number: 0484 123 4567",
      company: "",
    });
  });

  it.each([
    { placeId: "not-a-uuid", reason: "closed" },
    { placeId: PLACE_ID, reason: "hacked" },
    { placeId: PLACE_ID },
    { placeId: PLACE_ID, reason: "closed", note: "x".repeat(REPORT_NOTE_MAX_LENGTH + 1) },
  ])("rejects invalid input %#", (input) => {
    expect(placeReportSchema.safeParse(input).success).toBe(false);
  });

  it("rejects submissions that filled the bot trap", () => {
    expect(
      placeReportSchema.safeParse({ placeId: PLACE_ID, reason: "closed", company: "ACME" }).success,
    ).toBe(false);
  });
});
