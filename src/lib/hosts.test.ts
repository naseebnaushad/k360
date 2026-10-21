import { describe, expect, it } from "vitest";
import { cityUrl, parseHost, rootUrl } from "./hosts";

describe("parseHost", () => {
  const root = "nsbglobal.net";

  it("recognises the root domain", () => {
    expect(parseHost("nsbglobal.net", root)).toEqual({ kind: "root" });
    expect(parseHost("www.nsbglobal.net", root)).toEqual({ kind: "root" });
    expect(parseHost("NSBGlobal.net.", root)).toEqual({ kind: "root" });
  });

  it("extracts a city slug from a subdomain", () => {
    expect(parseHost("kochi.nsbglobal.net", root)).toEqual({ kind: "city", slug: "kochi" });
    expect(parseHost("new-delhi.nsbglobal.net", root)).toEqual({
      kind: "city",
      slug: "new-delhi",
    });
  });

  it("works with a local dev domain including a port", () => {
    expect(parseHost("kochi.localhost:3000", "localhost:3000")).toEqual({
      kind: "city",
      slug: "kochi",
    });
    expect(parseHost("localhost:3000", "localhost:3000")).toEqual({ kind: "root" });
  });

  it("rejects unrelated hosts, nested subdomains and invalid slugs", () => {
    expect(parseHost("example.com", root)).toEqual({ kind: "unknown" });
    expect(parseHost("evilnsbglobal.net", root)).toEqual({ kind: "unknown" });
    expect(parseHost("a.kochi.nsbglobal.net", root)).toEqual({ kind: "unknown" });
    expect(parseHost("-kochi.nsbglobal.net", root)).toEqual({ kind: "unknown" });
  });
});

describe("url builders", () => {
  it("builds https URLs in production", () => {
    expect(cityUrl("kochi", "/places", "nsbglobal.net")).toBe("https://kochi.nsbglobal.net/places");
    expect(rootUrl("about", "nsbglobal.net")).toBe("https://nsbglobal.net/about");
  });

  it("builds http URLs on localhost", () => {
    expect(cityUrl("kochi", "/", "localhost:3000")).toBe("http://kochi.localhost:3000/");
  });
});
