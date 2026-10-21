import { siteConfig } from "@/config/site";
import { getLiveCityBySlug } from "@/features/cities/server";
import { buildManifest, manifestResponse } from "@/lib/manifest";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/city/[city]/manifest.webmanifest">,
) {
  const city = await getLiveCityBySlug((await params).city);
  if (!city) return new Response("Not found", { status: 404 });
  return manifestResponse(
    buildManifest({
      name: `${siteConfig.name} ${city.name}`,
      shortName: city.name,
      description: city.tagline ?? siteConfig.description,
    }),
  );
}
