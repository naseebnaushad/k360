/**
 * Imports places for one city from OpenStreetMap.
 *
 *   npm run import:osm -- --city kochi [--only florists,cafes] [--radius 15000] [--dry-run]
 *
 * Requires a linked Supabase project (npm run db:link). Safe to re-run:
 * existing places keep their slugs and community edits are preserved.
 * Each category is saved as soon as it is fetched, so a failure part-way
 * keeps earlier work; re-run the failed categories with --only.
 */
import { loadConfig, type ImportConfig } from "./config.ts";
import { getCategoryRules, getCity, getExistingSlugs, upsertPlaces } from "./db.ts";
import { createOverpassClient } from "./overpass.ts";
import { assignPlaceAreas } from "../lib/areas.ts";
import { syncWeeklyHours } from "../lib/weekly-hours.ts";
import { revalidateCity } from "./revalidate.ts";
import {
  assignSlugs,
  dedupeElements,
  toPlaceRow,
  type CategoryRule,
  type OsmElement,
} from "./transform.ts";

interface ImportContext {
  config: ImportConfig;
  cityId: string;
  languages: string[];
  categoryRules: CategoryRule[];
}

/** Transforms fetched features and writes them. Returns how many places were saved. */
async function savePlaces(elements: OsmElement[], ctx: ImportContext): Promise<number> {
  const candidates = dedupeElements(elements)
    .map((element) => toPlaceRow(element, ctx))
    .filter((row) => row !== null);

  // Re-read slugs each time so earlier categories' new places are respected.
  const existing = await getExistingSlugs(ctx.cityId);
  const rows = assignSlugs(candidates, existing.byOsmKey, existing.all);
  if (ctx.config.dryRun) return rows.length;

  for (let i = 0; i < rows.length; i += ctx.config.batchSize) {
    await upsertPlaces(rows.slice(i, i + ctx.config.batchSize));
  }
  return rows.length;
}

async function main() {
  const config = loadConfig(process.argv.slice(2));

  console.log(`▸ Loading city "${config.citySlug}" and categories…`);
  const city = await getCity(config.citySlug);
  if (!city) throw new Error(`City "${config.citySlug}" not found in the database.`);

  const allRules = await getCategoryRules();
  const only = config.onlyCategories;
  const unknown = only?.filter((slug) => !allRules.some((rule) => rule.slug === slug)) ?? [];
  if (unknown.length > 0) throw new Error(`Unknown categories: ${unknown.join(", ")}`);
  const selected = only ? allRules.filter((rule) => only.includes(rule.slug)) : allRules;

  const area = {
    lat: city.center_lat,
    lng: city.center_lng,
    radiusM: config.radiusOverride ?? city.service_radius_m,
  };
  const overpass = createOverpassClient({
    endpoints: config.overpassEndpoints,
    userAgent: config.userAgent,
    timeoutS: config.timeoutS,
    rounds: config.rounds,
  });
  // Every rule is passed so features land in their best category, whichever query found them.
  const ctx: ImportContext = {
    config,
    cityId: city.id,
    languages: city.languages,
    categoryRules: allRules,
  };

  console.log(
    `▸ Importing ${selected.length} categories within ${area.radiusM / 1000} km` +
      (config.dryRun ? " (dry run: nothing will be written)…" : "…"),
  );
  const failed: string[] = [];
  let total = 0;
  for (const [index, rule] of selected.entries()) {
    const label = `[${index + 1}/${selected.length}] ${rule.slug}`;
    try {
      const elements = await overpass.query(area, rule.tags, {
        includeUnnamed: rule.unnamedLabel !== null,
      });
      const saved = await savePlaces(elements, ctx);
      total += saved;
      console.log(
        `  ${label}: ${elements.length} found, ${saved} ${config.dryRun ? "usable" : "saved"}`,
      );
    } catch (error) {
      failed.push(rule.slug);
      console.log(`  ${label}: FAILED (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  console.log(`▸ ${total} places ${config.dryRun ? "would be saved" : "saved"}.`);
  if (!config.dryRun && total > 0) {
    const hours = await syncWeeklyHours(city.id);
    console.log(`▸ Opening hours: ${hours.understood} of ${hours.withHours} understood.`);
    const areas = await assignPlaceAreas(city.id);
    console.log(`▸ ${areas.assigned} of ${areas.total} places linked to an area.`);
    await revalidateCity(city.id, city.slug);
  }
  if (failed.length > 0) {
    console.error(
      `✖ ${failed.length} categories failed. Retry them with:\n` +
        `  npm run import:osm -- --city ${config.citySlug} --only ${failed.join(",")}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log("✔ Import complete. Data © OpenStreetMap contributors (ODbL).");
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
