/**
 * Re-derives the structured opening hours used by "Open now" for one city.
 *
 *   npm run hours:sync -- --city kochi
 *
 * The OSM importer runs this automatically; use it after editing hours by hand.
 */
import { parseArgs } from "node:util";

import { getCity } from "../osm-import/db.ts";
import { revalidateCity } from "../osm-import/revalidate.ts";
import { syncWeeklyHours } from "../lib/weekly-hours.ts";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { city: { type: "string" } },
    strict: true,
  });
  if (!values.city || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(values.city)) {
    throw new Error("Usage: npm run hours:sync -- --city <slug>");
  }

  const city = await getCity(values.city);
  if (!city) throw new Error(`City "${values.city}" not found in the database.`);

  const result = await syncWeeklyHours(city.id);
  console.log(
    `▸ ${result.understood} of ${result.withHours} opening hours understood; ${result.updated} updated.`,
  );
  if (result.updated > 0) await revalidateCity(city.id, city.slug);
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
