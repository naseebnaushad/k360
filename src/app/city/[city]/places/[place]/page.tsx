import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LazyMapView } from "@/components/map/lazy-map-view";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { getLiveCityBySlug } from "@/features/cities/server";
import {
  CategoryIcon,
  NearbyPlaces,
  OpenStatus,
  PlaceActions,
  PlaceDetails,
  ReportProblem,
  placesPath,
} from "@/features/places";
import { getNearbyPlaces, getPlaceBySlug, getPrerenderPlaceSlugs } from "@/features/places/server";

type Props = PageProps<"/city/[city]/places/[place]">;

/** Placeholder so the build can validate this route when a city has no places yet. */
const PLACEHOLDER_SLUG = "placeholder";

export async function generateStaticParams({ params }: { params: { city: string } }) {
  const city = await getLiveCityBySlug(params.city);
  const slugs = city ? await getPrerenderPlaceSlugs(city.id) : [];
  return (slugs.length > 0 ? slugs : [PLACEHOLDER_SLUG]).map((place) => ({ place }));
}

async function loadPlace(params: Props["params"]) {
  const { city: citySlug, place: placeSlug } = await params;
  const city = await getLiveCityBySlug(citySlug);
  if (!city) return null;
  const place = await getPlaceBySlug(city.id, placeSlug);
  return place ? { city, place } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadPlace(params);
  if (!data) return {};
  const { city, place } = data;
  return {
    title: place.name,
    description: [place.category?.name, place.address ?? city.name].filter(Boolean).join(" · "),
  };
}

export default function PlacePage({ params }: Props) {
  return (
    <main className="pb-28 desktop:pb-0">
      <Container className="py-6 desktop:py-10">
        <Suspense fallback={<PlaceSkeleton />}>
          <PlaceContent params={params} />
        </Suspense>
      </Container>
    </main>
  );
}

async function PlaceContent({ params }: Pick<Props, "params">) {
  const data = await loadPlace(params);
  if (!data) notFound();
  const { city, place } = data;
  const nearby = await getNearbyPlaces(city.id, place.location, { excludeId: place.id });

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted">
        <Link href={placesPath()} className="inline-flex items-center gap-1 hover:text-accent">
          <ChevronLeft aria-hidden className="size-4" /> Places
        </Link>
        {place.category && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={placesPath({ category: place.category.slug })}
              className="hover:text-accent"
            >
              {place.category.name}
            </Link>
          </>
        )}
      </nav>

      <header className="mt-5 flex items-start gap-4">
        <CategoryIcon slug={place.category?.slug} size="lg" />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-balance desktop:text-4xl">
            {place.name}
          </h1>
          {place.localName && <p className="mt-1 text-lg text-muted">{place.localName}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {place.category && (
              <p className="text-sm font-medium text-accent">{place.category.name}</p>
            )}
            {place.area && (
              <Link
                href={placesPath({ area: place.area.slug })}
                className="text-sm text-muted hover:text-accent"
              >
                in {place.area.name}
              </Link>
            )}
            <OpenStatus hours={place.openingHours} timeZone={city.timeZone} size="md" />
          </div>
        </div>
      </header>
      {place.description && <p className="mt-5 max-w-2xl text-lg">{place.description}</p>}

      <div className="mt-6">
        <PlaceActions place={place} />
      </div>

      <div className="mt-8 grid gap-6 desktop:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <PlaceDetails place={place} />
          <div className="mt-4">
            <ReportProblem placeId={place.id} placeName={place.name} />
          </div>
        </div>
        <div className="h-72 desktop:h-[26rem]">
          <LazyMapView
            styleUrl={siteConfig.mapStyleUrl}
            center={place.location}
            zoom={16}
            markers={[{ id: place.id, ...place.location, label: place.name }]}
            className="h-full"
            ariaLabel={`Map showing the location of ${place.name}`}
          />
        </div>
      </div>

      <div className="mt-12">
        <NearbyPlaces places={nearby} />
      </div>
    </>
  );
}

function PlaceSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-4 w-40 rounded bg-border" />
      <div className="mt-5 flex gap-4">
        <div className="size-14 rounded-2xl bg-border" />
        <div className="h-10 w-72 rounded-xl bg-border" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 desktop:grid-cols-2">
        <div className="h-64 rounded-3xl bg-border" />
        <div className="h-72 rounded-3xl bg-border" />
      </div>
    </div>
  );
}
