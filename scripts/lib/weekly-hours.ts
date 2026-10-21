/**
 * Keeps places.weekly_hours (used by the "Open now" filter) in step with the
 * opening_hours text. Only rows whose parsed value changed are written.
 */
import { parseOpeningHours, toMultirangeLiteral } from "../../src/lib/opening-hours.ts";
import { jsonLiteral, queryLinked as query } from "./supabase-cli.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BATCH_SIZE = 1000;

export interface HoursSyncResult {
  withHours: number;
  understood: number;
  updated: number;
}

export async function syncWeeklyHours(cityId: string): Promise<HoursSyncResult> {
  if (!UUID_PATTERN.test(cityId)) throw new Error(`Invalid city id: ${cityId}`);

  const rows = await query<{
    id: string;
    opening_hours: string | null;
    weekly_hours: string | null;
  }>(
    `select id, opening_hours, weekly_hours::text as weekly_hours
       from public.places
      where city_id = '${cityId}' and (opening_hours is not null or weekly_hours is not null);`,
  );

  let understood = 0;
  const changes: { id: string; hours: string | null }[] = [];
  for (const row of rows) {
    const parsed = parseOpeningHours(row.opening_hours);
    if (parsed) understood++;
    const hours = parsed ? toMultirangeLiteral(parsed) : null;
    if (hours !== row.weekly_hours) changes.push({ id: row.id, hours });
  }

  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    await query(
      `update public.places p
          set weekly_hours = x.hours::int4multirange
         from jsonb_to_recordset(${jsonLiteral(changes.slice(i, i + BATCH_SIZE))})
              as x(id uuid, hours text)
        where p.id = x.id and p.city_id = '${cityId}';`,
    );
  }

  return {
    withHours: rows.filter((row) => row.opening_hours).length,
    understood,
    updated: changes.length,
  };
}
