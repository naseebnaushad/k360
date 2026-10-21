import { siteConfig } from "@/config/site";
import { buildManifest, manifestResponse } from "@/lib/manifest";

export function GET() {
  return manifestResponse(
    buildManifest({
      name: siteConfig.name,
      shortName: siteConfig.name,
      description: siteConfig.description,
    }),
  );
}
