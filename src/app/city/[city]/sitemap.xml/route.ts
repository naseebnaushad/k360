import { siteConfig } from "@/config/site";
import { getLiveCityBySlug } from "@/features/cities/server";
import { placePath, placesPath } from "@/features/places";
import { getCityCategories, getSitemapPlaces } from "@/features/places/server";
import { cityUrl } from "@/lib/hosts";
import { buildSitemap, xmlResponse } from "@/lib/sitemap";

export async function GET(_request: Request, { params }: RouteContext<"/city/[city]/sitemap.xml">) {
  const city = await getLiveCityBySlug((await params).city);
  if (!city) return new Response("Not found", { status: 404 });

  const [categories, places] = await Promise.all([
    getCityCategories(city.id),
    getSitemapPlaces(city.id),
  ]);
  const url = (path: string) => cityUrl(city.slug, path, siteConfig.rootDomain);

  return xmlResponse(
    buildSitemap([
      { url: url("/") },
      { url: url(placesPath()) },
      ...categories.map((category) => ({ url: url(placesPath({ category: category.slug })) })),
      ...places.map((place) => ({
        url: url(placePath(place.slug)),
        lastModified: place.updatedAt,
      })),
    ]),
  );
}
