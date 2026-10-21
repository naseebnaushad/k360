import { Clock, SlidersHorizontal, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import { Pagination } from "@/components/ui/pagination";
import { siteConfig } from "@/config/site";
import { getLiveCityBySlug } from "@/features/cities/server";
import {
  ActiveFilters,
  FilterPanel,
  NearMeButton,
  PlaceCard,
  ResultsView,
  SearchForm,
  placeListSearchSchema,
  placePath,
  placesPath,
  splitAreaQuery,
  type PlaceFilters,
} from "@/features/places";
import { findPlaces, getCityAreas, getCityCategories } from "@/features/places/server";

export const metadata: Metadata = { title: "Places" };

type Props = PageProps<"/city/[city]/places">;

const FILTER_SHEET_ID = "filter-sheet";

/** Server components render once per request (after `connection()`), so reading the clock is safe. */
const requestTime = () => Date.now();

export default function PlacesPage({ params, searchParams }: Props) {
  return (
    <main>
      <Container size="wide" className="py-5 desktop:py-8">
        <Suspense fallback={<PlacesSkeleton />}>
          <PlacesContent params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

/** Hidden inputs for the search box, so searching keeps the other filters. */
function keepForSearch(filters: PlaceFilters) {
  return {
    category: filters.categories,
    area: filters.area,
    near: filters.near ? `${filters.near.lat},${filters.near.lng}` : undefined,
    radius: filters.radius ? String(filters.radius) : undefined,
    has: filters.has,
    open: filters.open ? "now" : undefined,
  };
}

async function PlacesContent({ params, searchParams }: Props) {
  const { city: slug } = await params;
  const parsed = placeListSearchSchema.parse(await searchParams);
  // Rendered per request: results and open/closed status depend on the current time.
  await connection();

  const city = await getLiveCityBySlug(slug);
  if (!city) notFound();

  const [categories, areas] = await Promise.all([
    getCityCategories(city.id),
    getCityAreas(city.id),
  ]);
  // Unknown categories are dropped; a link to only unknown ones is a 404.
  const known = parsed.categories.filter((c) => categories.some((cat) => cat.slug === c));
  if (parsed.categories.length > 0 && known.length === 0) notFound();
  const area = areas.find((a) => a.slug === parsed.area);
  if (parsed.area && !area) notFound();
  const filters: PlaceFilters = { ...parsed, categories: known };

  // "cafes in Kakkanad" becomes a search for "cafes" filtered to Kakkanad.
  const split = filters.q ? splitAreaQuery(filters.q, areas) : null;
  if (split) redirect(placesPath({ ...filters, q: split.q, area: split.area.slug, page: 1 }));

  const result = await findPlaces(city.id, filters, { timeZone: city.timeZone });
  const renderedAt = requestTime();
  if (result.pageCount > 0 && filters.page > result.pageCount) notFound();

  const activeCount =
    filters.categories.length +
    filters.has.length +
    (filters.area ? 1 : 0) +
    (filters.radius ? 1 : 0) +
    (filters.open ? 1 : 0);
  const subject = filters.q
    ? `Results for “${filters.q}”`
    : filters.categories.length === 1
      ? (categories.find((c) => c.slug === filters.categories[0])?.name ?? "Places")
      : filters.near
        ? "Places near you"
        : filters.open
          ? "Open now"
          : area
            ? "Places"
            : "All places";
  const title = area ? `${subject} in ${area.name}` : subject;

  const markers = result.items.map((place) => ({
    id: place.id,
    lat: place.location.lat,
    lng: place.location.lng,
    label: place.name,
    href: placePath(place.slug),
  }));

  const list = (
    <section aria-label="Places">
      {result.items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 desktop:grid-cols-1 desktop:2xl:grid-cols-2">
          {result.items.map((place) => (
            <li key={place.id}>
              <PlaceCard place={place} timeZone={city.timeZone} renderedAt={renderedAt} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl border border-dashed border-border-strong p-10 text-center">
          <p className="font-medium">Nothing matched.</p>
          <p className="mt-1 text-sm text-muted">
            Try a shorter or different word, or remove a filter.
          </p>
        </div>
      )}
      <div className="mt-8 pb-20 desktop:pb-0">
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          hrefForPage={(n) => placesPath({ ...filters, page: n })}
        />
      </div>
    </section>
  );

  return (
    <>
      {/* Search and quick actions */}
      <div className="flex flex-col gap-3 desktop:flex-row desktop:items-center">
        <div className="desktop:max-w-xl desktop:flex-1">
          <SearchForm query={filters.q} keep={keepForSearch(filters)} id="places-search" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            popoverTarget={FILTER_SHEET_ID}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-medium hover:border-accent hover:text-accent desktop:hidden"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Filters
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground">
                {activeCount}
              </span>
            )}
          </button>
          <Link
            href={placesPath({ ...filters, open: !filters.open || undefined, page: 1 })}
            scroll={false}
            replace
            aria-pressed={Boolean(filters.open)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
              filters.open
                ? "bg-accent-soft text-accent hover:bg-accent hover:text-accent-foreground"
                : "border border-border bg-surface hover:border-accent hover:text-accent"
            }`}
          >
            <Clock aria-hidden className="size-4" />
            Open now
            {filters.open && <X aria-hidden className="size-3.5" />}
          </Link>
          {filters.near ? (
            <Link
              href={placesPath({
                ...filters,
                near: undefined,
                radius: undefined,
                sort: undefined,
                page: 1,
              })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-sm font-medium text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Near you <X aria-hidden className="size-3.5" />
              <span className="sr-only">Stop using my location</span>
            </Link>
          ) : (
            <NearMeButton filters={filters} />
          )}
        </div>
      </div>

      {/* Heading */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight desktop:text-3xl">{title}</h1>
        <p className="text-sm text-muted">
          {result.total.toLocaleString("en-IN")} {result.total === 1 ? "place" : "places"} in{" "}
          {city.name}
          {filters.near && " · nearest first"}
        </p>
      </div>
      <div className="mt-3 empty:hidden">
        <ActiveFilters filters={filters} categories={categories} areas={areas} />
      </div>

      <div className="mt-6 desktop:grid desktop:grid-cols-[15rem_minmax(0,1fr)] desktop:gap-8">
        {/* Desktop: filters sidebar */}
        <aside
          aria-label="Filters"
          className="hidden desktop:sticky desktop:top-20 desktop:block desktop:max-h-[calc(100dvh-6rem)] desktop:overflow-y-auto desktop:pr-2"
        >
          <FilterPanel filters={filters} categories={categories} areas={areas} />
        </aside>

        <ResultsView
          list={list}
          map={{
            styleUrl: siteConfig.mapStyleUrl,
            center: filters.near ?? city.map.center,
            zoom: city.map.zoom,
            markers,
            userLocation: filters.near,
            ariaLabel: `Map of places on this page in ${city.name}`,
          }}
        />
      </div>

      {/* Mobile: filters bottom sheet (native popover, no JavaScript needed) */}
      <div id={FILTER_SHEET_ID} popover="auto" className="sheet desktop:hidden">
        <div className="flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Filters</h2>
            <button
              type="button"
              popoverTarget={FILTER_SHEET_ID}
              popoverTargetAction="hide"
              className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted"
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close filters</span>
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">
            <FilterPanel filters={filters} categories={categories} areas={areas} />
          </div>
          <div className="border-t border-border p-4">
            <button
              type="button"
              popoverTarget={FILTER_SHEET_ID}
              popoverTargetAction="hide"
              className="h-12 w-full rounded-full bg-accent font-medium text-accent-foreground hover:bg-accent-strong"
            >
              Show {result.total.toLocaleString("en-IN")} places
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PlacesSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-11 w-full max-w-xl rounded-full bg-border" />
      <div className="mt-6 h-8 w-56 rounded-lg bg-border" />
      <div className="mt-6 grid gap-8 desktop:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="hidden h-96 rounded-2xl bg-border desktop:block" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
