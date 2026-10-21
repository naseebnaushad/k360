import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { minuteOfWeek } from "@/lib/opening-hours";
import { createPublicClient } from "@/lib/supabase/public-client";

import type {
  Area,
  CategoryWithCount,
  GeoPoint,
  NearbyPlace,
  Place,
  PlaceCategory,
  PlaceListItem,
  PlaceListResult,
} from "../types";
import { effectiveSort, type PlaceFilters } from "../filters";
import {
  CATEGORY_COLUMNS,
  PLACE_COLUMNS,
  toCategory,
  toNearbyPlace,
  toPlaceSummary,
  toPlace,
  toListItem,
} from "./mappers";

export const PLACE_PAGE_SIZE = 24;

/** Upper bound for one city's sitemap; split into a sitemap index before reaching it. */
const SITEMAP_PLACE_LIMIT = 45_000;

/** Cache tags; revalidate these after any write. */
export const placeCacheTags = {
  categories: "place-categories",
  city: (cityId: string) => `places:city:${cityId}`,
} as const;

/** OSM opening_hours value for "always open". */
const ALWAYS_OPEN = "24/7";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getPlaceCategories(): Promise<PlaceCategory[]> {
  "use cache";
  cacheLife("days");
  cacheTag(placeCacheTags.categories);

  const { data, error } = await createPublicClient()
    .from("place_categories")
    .select(CATEGORY_COLUMNS)
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data.map(toCategory);
}

/** Categories that have at least one place in the city, with counts. */
export async function getCityCategories(cityId: string): Promise<CategoryWithCount[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.categories, placeCacheTags.city(cityId));

  const [categories, counts] = await Promise.all([
    getPlaceCategories(),
    createPublicClient()
      .from("city_category_counts")
      .select("category_id, place_count")
      .eq("city_id", cityId),
  ]);

  if (counts.error) throw new Error(`Failed to load category counts: ${counts.error.message}`);
  const countById = new Map(counts.data.map((row) => [row.category_id, row.place_count ?? 0]));

  return categories
    .map((category) => ({ ...category, placeCount: countById.get(category.id) ?? 0 }))
    .filter((category) => category.placeCount > 0);
}

/** Areas (neighbourhoods) that have places in the city, busiest first. */
export async function getCityAreas(cityId: string): Promise<Area[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));

  const client = createPublicClient();
  const [areas, counts] = await Promise.all([
    client.from("areas").select("id, slug, name, local_name").eq("city_id", cityId),
    client.from("city_area_counts").select("area_id, place_count").eq("city_id", cityId),
  ]);
  if (areas.error) throw new Error(`Failed to load areas: ${areas.error.message}`);
  if (counts.error) throw new Error(`Failed to load area counts: ${counts.error.message}`);

  const countById = new Map(counts.data.map((row) => [row.area_id, row.place_count ?? 0]));
  return areas.data
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      localName: row.local_name,
      placeCount: countById.get(row.id) ?? 0,
    }))
    .filter((area) => area.placeCount > 0)
    .sort((a, b) => b.placeCount - a.placeCount || a.name.localeCompare(b.name));
}

/**
 * The places list: browse, search, filter and sort, optionally by distance.
 * Plain browsing is cached; free-text and location queries are not, because
 * their key space is unbounded and caching them would let anyone fill the cache.
 * "Open now" depends on the current time, so it is never cached either.
 */
export async function findPlaces(
  cityId: string,
  filters: PlaceFilters,
  { timeZone }: { timeZone: string },
): Promise<PlaceListResult> {
  if (filters.open) return runFindPlaces(cityId, filters, minuteOfWeek(new Date(), timeZone));
  return filters.q || filters.near
    ? runFindPlaces(cityId, filters)
    : findPlacesCached(cityId, filters);
}

async function findPlacesCached(cityId: string, filters: PlaceFilters): Promise<PlaceListResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));
  return runFindPlaces(cityId, filters);
}

async function runFindPlaces(
  cityId: string,
  filters: PlaceFilters,
  openAt?: number,
): Promise<PlaceListResult> {
  const { page } = filters;
  const categoryIds = filters.categories.length
    ? (await getPlaceCategories())
        .filter((category) => filters.categories.includes(category.slug))
        .map((category) => category.id)
    : [];
  const areaId = filters.area
    ? (await getCityAreas(cityId)).find((area) => area.slug === filters.area)?.id
    : undefined;
  // Every requested category is unknown, or the area is: nothing can match.
  if ((filters.categories.length && categoryIds.length === 0) || (filters.area && !areaId)) {
    return { items: [], total: 0, page, pageCount: 0 };
  }

  const { data, error } = await createPublicClient().rpc("find_places", {
    p_city_id: cityId,
    p_query: filters.q,
    p_category_ids: categoryIds.length ? categoryIds : undefined,
    p_lat: filters.near?.lat,
    p_lng: filters.near?.lng,
    p_radius_m: filters.radius,
    p_has_phone: filters.has.includes("phone"),
    p_has_website: filters.has.includes("website"),
    p_has_hours: filters.has.includes("hours"),
    p_sort: effectiveSort(filters),
    p_limit: PLACE_PAGE_SIZE,
    p_offset: (page - 1) * PLACE_PAGE_SIZE,
    p_open_at: openAt,
    p_area_id: areaId,
  });
  if (error) throw new Error(`Failed to load places: ${error.message}`);

  const total = data[0]?.total_count ?? 0;
  return {
    items: data.map(toListItem),
    total,
    page,
    pageCount: Math.ceil(total / PLACE_PAGE_SIZE),
  };
}

/** Closest places to a point within the city, nearest first. */
export async function getNearbyPlaces(
  cityId: string,
  point: GeoPoint,
  {
    excludeId,
    radiusM = 1000,
    limit = 6,
  }: { excludeId?: string; radiusM?: number; limit?: number } = {},
): Promise<NearbyPlace[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));

  const { data, error } = await createPublicClient().rpc("places_near", {
    p_city_id: cityId,
    p_lat: point.lat,
    p_lng: point.lng,
    p_radius_m: radiusM,
    p_exclude_id: excludeId,
    p_limit: limit,
  });
  if (error) throw new Error(`Failed to load nearby places: ${error.message}`);
  return data.map(toNearbyPlace);
}

/** Places in the given categories that are open around the clock ("24/7"), A–Z. */
export async function getAlwaysOpenPlaces(
  cityId: string,
  categorySlugs: string[],
  limit = 12,
): Promise<PlaceListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));

  const slugs = categorySlugs.filter((slug) => SLUG_PATTERN.test(slug));
  if (slugs.length === 0) return [];

  const { data, error } = await createPublicClient()
    .from("places")
    .select(
      "id, slug, name, local_name, address, lat, lng, phone, website, opening_hours, category:place_categories!inner(slug, name), area:areas(name)",
    )
    .eq("city_id", cityId)
    .eq("opening_hours", ALWAYS_OPEN)
    .in("category.slug", slugs)
    .order("name")
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new Error(`Failed to load 24-hour places: ${error.message}`);

  return data.map((row) => ({
    ...toPlaceSummary(row, row.area?.name ?? null),
    distanceM: null,
    hasPhone: row.phone !== null,
    hasWebsite: row.website !== null,
    hasHours: true,
    openingHours: row.opening_hours,
  }));
}

export async function getPlaceBySlug(cityId: string, slug: string): Promise<Place | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));

  if (!SLUG_PATTERN.test(slug)) return null;

  const { data, error } = await createPublicClient()
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("city_id", cityId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load place "${slug}": ${error.message}`);
  return data ? toPlace(data) : null;
}

/** A bounded set of slugs to prerender at build time; the rest render on demand. */
export async function getPrerenderPlaceSlugs(cityId: string, limit = 50): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));

  const { data, error } = await createPublicClient()
    .from("places")
    .select("slug")
    .eq("city_id", cityId)
    .order("name")
    .limit(limit);

  if (error) throw new Error(`Failed to load place slugs: ${error.message}`);
  return data.map((row) => row.slug);
}

/** Every visible place in a city, for the sitemap. Paged past the API's row limit. */
export async function getSitemapPlaces(
  cityId: string,
): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(placeCacheTags.city(cityId));

  const pageSize = 1000;
  const rows: { slug: string; updatedAt: string }[] = [];
  for (let from = 0; from < SITEMAP_PLACE_LIMIT; from += pageSize) {
    const { data, error } = await createPublicClient()
      .from("places")
      .select("slug, updated_at")
      .eq("city_id", cityId)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to load sitemap places: ${error.message}`);
    rows.push(...data.map((row) => ({ slug: row.slug, updatedAt: row.updated_at })));
    if (data.length < pageSize) break;
  }
  return rows;
}
