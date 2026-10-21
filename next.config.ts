import type { NextConfig } from "next";

import { env } from "./src/config/env";
import { buildSecurityHeaders } from "./src/config/security-headers";

const isDev = process.env.NODE_ENV === "development";
const mapOrigin = new URL(env.NEXT_PUBLIC_MAP_STYLE_URL).origin;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Cloudflare Workers fail to decompress the resume data cache ("Failed to parse
    // postponed state"), which forces slow full renders and occasional hangs.
    disableResumeDataCacheCompression: true,
  },
  // Lets city subdomains (e.g. kochi.localhost:3000) load dev assets.
  allowedDevOrigins: [`*.${env.NEXT_PUBLIC_ROOT_DOMAIN.split(":")[0]}`],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          isDev,
          supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
          extraOrigins: { connect: [mapOrigin], img: [mapOrigin] },
        }),
      },
    ];
  },
};

export default nextConfig;
