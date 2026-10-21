import { jsonLiteral, queryLinked as query } from "../lib/supabase-cli.ts";
import type { CategoryRule, PlaceRow } from "./transform.ts";
import { parseTagGroup } from "./transform.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface CityRecord {
  id: string;
  slug: string;
  languages: string[];
  center_lat: number;
  center_lng: number;
  service_radius_m: number;
}

export async function getCity(slug: string): Promise<CityRecord | null> {
  const rows = await query<CityRecord>(
    `select id, slug, languages, center_lat, center_lng, service_radius_m
       from public.cities
      where slug = (select x.slug from jsonb_to_record(${jsonLiteral({ slug })}) as x(slug text));`,
  );
  return rows[0] ?? null;
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const rows = await query<{
    id: string;
    slug: string;
    osm_tags: string[];
    unnamed_label: string | null;
  }>(
    `select id, slug, osm_tags, unnamed_label
       from public.place_categories order by sort_order, slug;`,
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    tags: row.osm_tags.map(parseTagGroup),
    unnamedLabel: row.unnamed_label,
  }));
}

export interface ExistingSlugs {
  /** Slug of each already-imported OSM feature, keyed "type/id". */
  byOsmKey: Map<string, string>;
  /** Every slug in use in the city, including community-added places. */
  all: Set<string>;
}

export async function getExistingSlugs(cityId: string): Promise<ExistingSlugs> {
  if (!UUID_PATTERN.test(cityId)) throw new Error(`Invalid city id: ${cityId}`);
  const rows = await query<{ key: string | null; slug: string }>(
    `select case when osm_id is not null then osm_type || '/' || osm_id end as key, slug
       from public.places
      where city_id = '${cityId}';`,
  );
  return {
    byOsmKey: new Map(rows.flatMap((row) => (row.key ? [[row.key, row.slug] as const] : []))),
    all: new Set(rows.map((row) => row.slug)),
  };
}

/**
 * Inserts new places and refreshes OSM-sourced ones.
 * Community-edited places (source <> 'osm') are never overwritten.
 */
export async function upsertPlaces(rows: PlaceRow[]): Promise<void> {
  await query(
    `insert into public.places
       (city_id, category_id, slug, name, local_name, address, lat, lng,
        phone, website, opening_hours, source, osm_type, osm_id)
     select x.city_id, x.category_id, x.slug, x.name, x.local_name, x.address, x.lat, x.lng,
            x.phone, x.website, x.opening_hours, 'osm', x.osm_type, x.osm_id
       from jsonb_to_recordset(${jsonLiteral(rows)}) as x(
         city_id uuid, category_id uuid, slug text, name text, local_name text, address text,
         lat double precision, lng double precision, phone text, website text,
         opening_hours text, osm_type text, osm_id bigint)
     on conflict (osm_type, osm_id) do update set
       category_id   = excluded.category_id,
       name          = excluded.name,
       local_name    = excluded.local_name,
       address       = excluded.address,
       lat           = excluded.lat,
       lng           = excluded.lng,
       phone         = excluded.phone,
       website       = excluded.website,
       opening_hours = excluded.opening_hours
     where public.places.source = 'osm';`,
  );
}
