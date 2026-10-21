import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { isValidSlug } from "@/lib/hosts";
import { createPublicClient } from "@/lib/supabase/public-client";

import type { City } from "../types";
import { CITY_COLUMNS, toCity } from "./mappers";

/** Cache tag to revalidate whenever any city changes. */
export const CITIES_CACHE_TAG = "cities";

export async function getLiveCities(): Promise<City[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CITIES_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("cities")
    .select(CITY_COLUMNS)
    .eq("status", "live")
    .order("name");

  if (error) throw new Error(`Failed to load cities: ${error.message}`);
  return data.map(toCity);
}

export async function getLiveCityBySlug(slug: string): Promise<City | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CITIES_CACHE_TAG, `${CITIES_CACHE_TAG}:${slug}`);

  if (!isValidSlug(slug)) return null;

  const { data, error } = await createPublicClient()
    .from("cities")
    .select(CITY_COLUMNS)
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();

  if (error) throw new Error(`Failed to load city "${slug}": ${error.message}`);
  return data ? toCity(data) : null;
}
