import type { Database, Tables } from "@/lib/supabase/database.types";

import type { NearbyPlace, Place, PlaceCategory, PlaceListItem, PlaceSummary } from "../types";

export const CATEGORY_COLUMNS = "id, slug, name, description" as const;

export const PLACE_SUMMARY_COLUMNS =
  "id, slug, name, local_name, address, lat, lng, category:place_categories(slug, name)" as const;

export const PLACE_COLUMNS =
  `${PLACE_SUMMARY_COLUMNS}, area:areas(slug, name), description, phone, website, opening_hours, source, osm_type, osm_id` as const;

type CategoryRow = Pick<Tables<"place_categories">, "id" | "slug" | "name" | "description">;

type PlaceSummaryRow = Pick<
  Tables<"places">,
  "id" | "slug" | "name" | "local_name" | "address" | "lat" | "lng"
> & { category: Pick<Tables<"place_categories">, "slug" | "name"> | null };

type PlaceRow = PlaceSummaryRow & { area: Pick<Tables<"areas">, "slug" | "name"> | null } & Pick<
    Tables<"places">,
    "description" | "phone" | "website" | "opening_hours" | "source" | "osm_type" | "osm_id"
  >;

type Functions = Database["public"]["Functions"];
type FindRow = Functions["find_places"]["Returns"][number];
type NearbyRow = Functions["places_near"]["Returns"][number];

const OSM_TYPES = new Set(["node", "way", "relation"]);

export function toCategory(row: CategoryRow): PlaceCategory {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description };
}

export function toPlaceSummary(row: PlaceSummaryRow, areaName: string | null = null): PlaceSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    localName: row.local_name,
    address: row.address,
    location: { lat: row.lat, lng: row.lng },
    category: row.category ? { slug: row.category.slug, name: row.category.name } : null,
    areaName,
  };
}

export function toPlace(row: PlaceRow): Place {
  const osm =
    row.osm_type && row.osm_id !== null && OSM_TYPES.has(row.osm_type)
      ? { type: row.osm_type as "node" | "way" | "relation", id: row.osm_id }
      : null;

  return {
    ...toPlaceSummary(row, row.area?.name ?? null),
    area: row.area ? { slug: row.area.slug, name: row.area.name } : null,
    description: row.description,
    phone: row.phone,
    website: row.website,
    openingHours: row.opening_hours,
    source: row.source,
    osm,
  };
}

/** Maps rows from the search/proximity RPCs, which return category columns flat. */
function fromFlatRow(row: FindRow | NearbyRow, areaName: string | null = null): PlaceSummary {
  return toPlaceSummary(
    {
      ...row,
      category:
        row.category_slug && row.category_name
          ? { slug: row.category_slug, name: row.category_name }
          : null,
    },
    areaName,
  );
}

export const toListItem = (row: FindRow): PlaceListItem => ({
  ...fromFlatRow(row, row.area_name),
  distanceM: row.distance_m ?? null,
  hasPhone: row.has_phone,
  hasWebsite: row.has_website,
  hasHours: row.has_hours,
  openingHours: row.opening_hours,
});

export const toNearbyPlace = (row: NearbyRow): NearbyPlace => ({
  ...fromFlatRow(row),
  distanceM: row.distance_m,
});
