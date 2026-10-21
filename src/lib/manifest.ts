import { brandColors } from "@/config/brand";

/** Web app manifest, so visitors can install the site to their home screen. */
export function buildManifest({
  name,
  shortName,
  description,
}: {
  name: string;
  shortName: string;
  description: string;
}) {
  return {
    id: "/",
    name,
    short_name: shortName,
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brandColors.background,
    theme_color: brandColors.accent,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

export function manifestResponse(manifest: ReturnType<typeof buildManifest>): Response {
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
