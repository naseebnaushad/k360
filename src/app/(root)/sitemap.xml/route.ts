import { siteConfig } from "@/config/site";
import { getLiveCities } from "@/features/cities/server";
import { cityUrl, rootUrl } from "@/lib/hosts";
import { buildSitemap, xmlResponse } from "@/lib/sitemap";

export async function GET() {
  const cities = await getLiveCities();
  return xmlResponse(
    buildSitemap([
      { url: rootUrl("/", siteConfig.rootDomain) },
      ...cities.map((city) => ({ url: cityUrl(city.slug, "/", siteConfig.rootDomain) })),
    ]),
  );
}
