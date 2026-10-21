export interface PlaceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface CategoryWithCount extends PlaceCategory {
  placeCount: number;
}

/** A neighbourhood within a city, with how many places it has. */
export interface Area {
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  placeCount: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Lightweight shape for lists and map markers. */
export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  address: string | null;
  location: GeoPoint;
  category: Pick<PlaceCategory, "slug" | "name"> | null;
  /** Nearest neighbourhood, e.g. "Kakkanad". */
  areaName: string | null;
}

export interface Place extends PlaceSummary {
  area: Pick<Area, "slug" | "name"> | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  source: "community" | "osm";
  osm: { type: "node" | "way" | "relation"; id: number } | null;
}

/** A place with its distance from a reference point. */
export interface NearbyPlace extends PlaceSummary {
  distanceM: number;
}

/** A row in the places list: summary plus what the list shows at a glance. */
export interface PlaceListItem extends PlaceSummary {
  /** Metres from the visitor's location, when they shared it. */
  distanceM: number | null;
  hasPhone: boolean;
  hasWebsite: boolean;
  hasHours: boolean;
  /** Raw opening hours, for the open/closed status. */
  openingHours: string | null;
}

export interface PlaceListResult {
  items: PlaceListItem[];
  total: number;
  page: number;
  pageCount: number;
}
