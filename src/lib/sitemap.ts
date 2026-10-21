/** Minimal builders for robots.txt and XML sitemaps (sitemaps.org protocol). */

export interface SitemapEntry {
  url: string;
  lastModified?: string;
}

/** Sitemaps may list at most this many URLs; split into an index beyond it. */
export const SITEMAP_URL_LIMIT = 50_000;

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]!);

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.slice(0, SITEMAP_URL_LIMIT).map(({ url, lastModified }) => {
    const lastmod = lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : "";
    return `<url><loc>${escapeXml(url)}</loc>${lastmod}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

export function buildRobots({ sitemapUrl }: { sitemapUrl: string }): string {
  return ["User-agent: *", "Allow: /", `Sitemap: ${sitemapUrl}`, ""].join("\n");
}

export const xmlResponse = (body: string) =>
  new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });

export const textResponse = (body: string) =>
  new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
