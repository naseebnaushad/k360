import { describe, expect, it } from "vitest";

import { formatDistance } from "./format";

describe("formatDistance", () => {
  it.each([
    [3, "10 m"],
    [124, "120 m"],
    [999, "1000 m"],
    [1000, "1.0 km"],
    [1449, "1.4 km"],
    [12_345, "12 km"],
  ])("formats %d m as %s", (meters, text) => expect(formatDistance(meters)).toBe(text));
});
