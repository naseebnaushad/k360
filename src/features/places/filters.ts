/**
 * Filter and sort options for the places list, shared by the URL schema,
 * the server query and the filter UI so they can never drift apart.
 */

export const RADIUS_OPTIONS_M = [500, 1000, 2000, 5000, 10_000] as const;
export type RadiusM = (typeof RADIUS_OPTIONS_M)[number];

export const FEATURE_FILTERS = [
  { value: "phone", label: "Has phone number" },
  { value: "website", label: "Has website" },
  { value: "hours", label: "Has opening hours" },
] as const;
export type FeatureFilter = (typeof FEATURE_FILTERS)[number]["value"];

export const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "distance", label: "Nearest" },
  { value: "name", label: "Name (A–Z)" },
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/** Coordinates are rounded to ~110 m before they ever leave the browser. */
export const LOCATION_DECIMALS = 3;

export const roundCoordinate = (value: number) =>
  Math.round(value * 10 ** LOCATION_DECIMALS) / 10 ** LOCATION_DECIMALS;

export interface PlaceFilters {
  q?: string;
  categories: string[];
  /** Area (neighbourhood) slug. */
  area?: string;
  near?: { lat: number; lng: number };
  radius?: RadiusM;
  has: FeatureFilter[];
  /** Only places open right now (in the city's time zone). */
  open?: boolean;
  sort?: SortOption;
  page: number;
}

/** The sort used when none is chosen: nearest with a location, best match with a query. */
export function effectiveSort(filters: Pick<PlaceFilters, "q" | "near" | "sort">): SortOption {
  if (filters.sort === "distance" && !filters.near) return filters.q ? "relevance" : "name";
  if (filters.sort === "relevance" && !filters.q) return filters.near ? "distance" : "name";
  return filters.sort ?? (filters.near ? "distance" : filters.q ? "relevance" : "name");
}

export const formatRadius = (meters: number) =>
  meters < 1000 ? `${meters} m` : `${meters / 1000} km`;
