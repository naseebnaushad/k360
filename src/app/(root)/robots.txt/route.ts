import { siteConfig } from "@/config/site";
import { rootUrl } from "@/lib/hosts";
import { buildRobots, textResponse } from "@/lib/sitemap";

export function GET() {
  return textResponse(buildRobots({ sitemapUrl: rootUrl("/sitemap.xml", siteConfig.rootDomain) }));
}
