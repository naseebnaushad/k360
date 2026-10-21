import { describe, expect, it } from "vitest";

import { parseStatusParam, reviewSchema, signInSchema } from "./schemas";

describe("parseStatusParam", () => {
  it("accepts known statuses", () => {
    expect(parseStatusParam("resolved")).toBe("resolved");
    expect(parseStatusParam(["dismissed", "open"])).toBe("dismissed");
  });

  it("falls back to open for anything else", () => {
    expect(parseStatusParam(undefined)).toBe("open");
    expect(parseStatusParam("'; drop table")).toBe("open");
  });
});

describe("reviewSchema", () => {
  it("only accepts a report id and a known status", () => {
    const reportId = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
    expect(reviewSchema.safeParse({ reportId, status: "resolved" }).success).toBe(true);
    expect(reviewSchema.safeParse({ reportId, status: "deleted" }).success).toBe(false);
    expect(reviewSchema.safeParse({ reportId: "1 or 1=1", status: "open" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("rejects malformed and oversized input", () => {
    expect(signInSchema.safeParse({ email: "me@example.com", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(
      signInSchema.safeParse({ email: "me@example.com", password: "x".repeat(300) }).success,
    ).toBe(false);
  });
});
