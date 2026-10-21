import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { REPORT_STATUSES, type ReportStatus } from "../schemas";
import type { AdminReport } from "../types";

export const ADMIN_REPORTS_LIMIT = 100;

/** Reports in one status, newest first. Only returns rows when the client is an admin. */
export async function getReports(
  supabase: SupabaseClient<Database>,
  status: ReportStatus,
): Promise<AdminReport[]> {
  const { data, error } = await supabase
    .from("place_reports")
    .select(
      "id, reason, note, status, created_at, reviewed_at, place:places(name, slug, city:cities(slug, name, timezone))",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(ADMIN_REPORTS_LIMIT);
  if (error) throw new Error(`Could not load reports: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    reason: row.reason,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    place: row.place && {
      name: row.place.name,
      slug: row.place.slug,
      city: row.place.city && {
        slug: row.place.city.slug,
        name: row.place.city.name,
        timeZone: row.place.city.timezone,
      },
    },
  }));
}

export async function getReportCounts(
  supabase: SupabaseClient<Database>,
): Promise<Record<ReportStatus, number>> {
  const counts = await Promise.all(
    REPORT_STATUSES.map(async ({ value }) => {
      const { count } = await supabase
        .from("place_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", value);
      return [value, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as Record<ReportStatus, number>;
}
