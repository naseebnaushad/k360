import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public-client";

import type { EmergencyContact, EmergencyKind } from "../types";

export const emergencyCacheTag = "emergency-contacts";

const NUMBER_PATTERN = /^\+?[0-9]{2,15}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Country-wide numbers plus the city's own, in display order. */
export async function getEmergencyContacts(
  cityId: string,
  countryCode: string,
): Promise<EmergencyContact[]> {
  "use cache";
  cacheLife("days");
  cacheTag(emergencyCacheTag);

  // The id goes into a PostgREST filter string, so it must be exactly a UUID.
  if (!UUID_PATTERN.test(cityId)) return [];

  const { data, error } = await createPublicClient()
    .from("emergency_contacts")
    .select("id, number, label, description, kind")
    .eq("country_code", countryCode)
    .or(`city_id.is.null,city_id.eq.${cityId}`)
    .order("sort_order")
    .order("label");
  if (error) throw new Error(`Failed to load emergency numbers: ${error.message}`);

  return data
    .filter((row) => NUMBER_PATTERN.test(row.number))
    .map((row) => ({ ...row, kind: row.kind as EmergencyKind }));
}
