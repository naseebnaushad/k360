import type { Tables } from "@/lib/supabase/database.types";

import type { City } from "../types";

export const CITY_COLUMNS =
  "id, slug, name, local_name, tagline, region, country_code, languages, timezone, center_lat, center_lng, default_zoom, status" as const;

type CityRow = Pick<
  Tables<"cities">,
  | "id"
  | "slug"
  | "name"
  | "local_name"
  | "tagline"
  | "region"
  | "country_code"
  | "languages"
  | "timezone"
  | "center_lat"
  | "center_lng"
  | "default_zoom"
  | "status"
>;

export function toCity(row: CityRow): City {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    localName: row.local_name,
    tagline: row.tagline,
    region: row.region,
    countryCode: row.country_code,
    languages: row.languages,
    timeZone: row.timezone,
    map: {
      center: { lat: row.center_lat, lng: row.center_lng },
      zoom: row.default_zoom,
    },
    status: row.status,
  };
}
