import { siteConfig } from "@/config/site";
import { getLiveCityBySlug } from "@/features/cities/server";
import { cityUrl } from "@/lib/hosts";
import { buildRobots, textResponse } from "@/lib/sitemap";

export async function GET(_request: Request, { params }: RouteContext<"/city/[city]/robots.txt">) {
  const city = await getLiveCityBySlug((await params).city);
  if (!city) return new Response("Not found", { status: 404 });
  return textResponse(
    buildRobots({ sitemapUrl: cityUrl(city.slug, "/sitemap.xml", siteConfig.rootDomain) }),
  );
}
