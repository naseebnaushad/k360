import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HeaderLink, SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import { getLiveCities, getLiveCityBySlug } from "@/features/cities/server";
import { placesPath } from "@/features/places";
import { cityUrl, rootUrl } from "@/lib/hosts";

/**
 * The layout must resolve the city before rendering so unknown cities return a
 * real 404 status. Entering a city is always a full page load (new subdomain),
 * so this segment is allowed to block.
 */
export const instant = false;

/** Placeholder so the build can validate this route when no cities are live yet. */
const PLACEHOLDER_SLUG = "__placeholder__";

export async function generateStaticParams() {
  const cities = await getLiveCities();
  return cities.length > 0
    ? cities.map((city) => ({ city: city.slug }))
    : [{ city: PLACEHOLDER_SLUG }];
}

export async function generateMetadata({ params }: LayoutProps<"/city/[city]">): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getLiveCityBySlug(slug);
  if (!city) return {};

  return {
    title: { default: city.name, template: `%s · ${city.name} · ${siteConfig.name}` },
    description: city.tagline ?? siteConfig.description,
    // Each city installs as its own app, on its own subdomain.
    manifest: cityUrl(city.slug, "/manifest.webmanifest", siteConfig.rootDomain),
    appleWebApp: { capable: true, title: city.name },
  };
}

export default async function CityLayout({ children, params }: LayoutProps<"/city/[city]">) {
  const { city: slug } = await params;
  const city = await getLiveCityBySlug(slug);
  if (!city) notFound();

  return (
    <>
      <SiteHeader
        homeHref="/"
        size="wide"
        context={<span className="font-medium text-muted">{city.name}</span>}
      >
        <HeaderLink href={placesPath()}>Places</HeaderLink>
        <HeaderLink href="/emergency" tone="danger">
          Emergency
        </HeaderLink>
        <span className="hidden sm:contents">
          <HeaderLink href={rootUrl("/", siteConfig.rootDomain)} external>
            All cities
          </HeaderLink>
        </span>
      </SiteHeader>
      {children}
    </>
  );
}
