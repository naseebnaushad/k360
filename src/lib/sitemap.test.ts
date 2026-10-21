import { describe, expect, it } from "vitest";

import { buildRobots, buildSitemap } from "./sitemap";

describe("buildSitemap", () => {
  it("lists URLs with optional last-modified dates", () => {
    const xml = buildSitemap([
      { url: "https://kochi.example.net/" },
      { url: "https://kochi.example.net/places/a", lastModified: "2026-10-21T00:00:00Z" },
    ]);
    expect(xml).toContain("<url><loc>https://kochi.example.net/</loc></url>");
    expect(xml).toContain("<lastmod>2026-10-21T00:00:00Z</lastmod>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("escapes XML special characters", () => {
    const xml = buildSitemap([{ url: "https://x.net/?a=1&b=<2>" }]);
    expect(xml).toContain("https://x.net/?a=1&amp;b=&lt;2&gt;");
  });
});

describe("buildRobots", () => {
  it("allows crawling and points at the sitemap", () => {
    expect(buildRobots({ sitemapUrl: "https://x.net/sitemap.xml" })).toBe(
      "User-agent: *\nAllow: /\nSitemap: https://x.net/sitemap.xml\n",
    );
  });
});
