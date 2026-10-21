import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/config/env";
import { parseHost } from "@/lib/hosts";
import { createLiveSlugGate } from "@/lib/live-city-slugs";
import { createPublicClient } from "@/lib/supabase/public-client";
import { nextWithFreshSession } from "@/lib/supabase/proxy-session";

/** How long the live city list is remembered. A new city appears within this time. */
const LIVE_SLUGS_TTL_MS = 60_000;

const isLiveCitySlug = createLiveSlugGate(async () => {
  const { data, error } = await createPublicClient()
    .from("cities")
    .select("slug")
    .eq("status", "live");
  if (error) throw new Error(error.message);
  return data.map((city) => city.slug);
}, LIVE_SLUGS_TTL_MS);

/** Root-domain pages that use a sign-in session. Only these touch auth cookies. */
const SESSION_ROUTE_PREFIX = "/admin";

/** Internal route prefix that city subdomains are rewritten to. Never linked publicly. */
const CITY_ROUTE_PREFIX = "/city";

/**
 * Routes each request by hostname:
 *   <root domain>/path          → src/app/(root)/path
 *   <city>.<root domain>/path   → src/app/city/<city>/path
 * Anything else is rejected, which also blocks Host-header spoofing.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const target = parseHost(host, env.NEXT_PUBLIC_ROOT_DOMAIN);
  const { pathname, search } = request.nextUrl;

  const isInternalCityPath =
    pathname === CITY_ROUTE_PREFIX || pathname.startsWith(`${CITY_ROUTE_PREFIX}/`);

  switch (target.kind) {
    case "root":
      // The internal city routes must only be reachable through a subdomain.
      if (isInternalCityPath) return notFound();
      if (pathname === SESSION_ROUTE_PREFIX || pathname.startsWith(`${SESSION_ROUTE_PREFIX}/`)) {
        const response = await nextWithFreshSession(request);
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
      return NextResponse.next();

    case "city": {
      // Made-up subdomains get a cheap real 404 instead of a page render and a database lookup.
      if (!(await isLiveCitySlug(target.slug))) return notFound();
      const url = request.nextUrl.clone();
      url.pathname = `${CITY_ROUTE_PREFIX}/${target.slug}${pathname === "/" ? "" : pathname}`;
      url.search = search;
      return NextResponse.rewrite(url);
    }

    case "unknown":
      return notFound();
  }
}

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

export const config = {
  // Skip framework internals and static files, except the per-host SEO and app files.
  // Internal city routes are always matched so they can never be reached directly.
  matcher: [
    "/((?!_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/city/:path*",
  ],
};
