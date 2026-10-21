/**
 * Imports a city's areas (neighbourhoods) from OpenStreetMap and links every
 * place to its nearest one.
 *
 *   npm run import:areas -- --city kochi [--radius 15000] [--dry-run]
 *
 * Safe to re-run: existing areas keep their slugs.
 */
import { assignPlaceAreas } from "../lib/areas.ts";
import { jsonLiteral, queryLinked as query } from "../lib/supabase-cli.ts";
import { loadConfig } from "../osm-import/config.ts";
import { getCity } from "../osm-import/db.ts";
import { createOverpassClient } from "../osm-import/overpass.ts";
import { revalidateCity } from "../osm-import/revalidate.ts";
import { AREA_KINDS, toAreaRows, type AreaRow } from "./transform.ts";

async function getExistingSlugs(cityId: string): Promise<Map<string, string>> {
  const rows = await query<{ key: string | null; slug: string }>(
    `select case when osm_id is not null then osm_type || '/' || osm_id end as key, slug
       from public.areas
      where city_id = (select x.id from jsonb_to_record(${jsonLiteral({ id: cityId })}) as x(id uuid));`,
  );
  return new Map(rows.flatMap((row) => (row.key ? [[row.key, row.slug] as const] : [])));
}

async function upsertAreas(rows: AreaRow[]): Promise<void> {
  await query(
    `insert into public.areas (city_id, slug, name, local_name, kind, lat, lng, osm_type, osm_id)
     select x.city_id, x.slug, x.name, x.local_name, x.kind, x.lat, x.lng, x.osm_type, x.osm_id
       from jsonb_to_recordset(${jsonLiteral(rows)}) as x(
         city_id uuid, slug text, name text, local_name text, kind text,
         lat double precision, lng double precision, osm_type text, osm_id bigint)
     on conflict (osm_type, osm_id) do update set
       name       = excluded.name,
       local_name = excluded.local_name,
       kind       = excluded.kind,
       lat        = excluded.lat,
       lng        = excluded.lng;`,
  );
}

async function main() {
  const config = loadConfig(process.argv.slice(2));
  const city = await getCity(config.citySlug);
  if (!city) throw new Error(`City "${config.citySlug}" not found in the database.`);

  const radiusM = config.radiusOverride ?? city.service_radius_m;
  console.log(`▸ Fetching areas within ${radiusM / 1000} km of ${city.slug}…`);
  const overpass = createOverpassClient({
    endpoints: config.overpassEndpoints,
    userAgent: config.userAgent,
    timeoutS: config.timeoutS,
    rounds: config.rounds,
  });
  const elements = await overpass.query(
    { lat: city.center_lat, lng: city.center_lng, radiusM },
    AREA_KINDS.map((kind) => [{ key: "place", value: kind }]),
  );

  const rows = toAreaRows(elements, {
    cityId: city.id,
    languages: city.languages,
    existingSlugs: await getExistingSlugs(city.id),
  });
  console.log(`▸ ${elements.length} found, ${rows.length} usable areas.`);
  if (config.dryRun) {
    console.log(rows.map((row) => `  ${row.name} (${row.kind})`).join("\n"));
    return;
  }

  for (let i = 0; i < rows.length; i += config.batchSize) {
    await upsertAreas(rows.slice(i, i + config.batchSize));
  }
  const { assigned, total } = await assignPlaceAreas(city.id);
  console.log(`▸ ${assigned} of ${total} places linked to an area.`);
  await revalidateCity(city.id, city.slug);
  console.log("✔ Areas imported. Data © OpenStreetMap contributors (ODbL).");
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
