import type { ReportReason } from "@/features/places";

import type { ReportStatus } from "./schemas";

export interface AdminReport {
  id: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  /** Null when the place was deleted or is hidden. */
  place: {
    name: string;
    slug: string;
    city: { slug: string; name: string; timeZone: string } | null;
  } | null;
}
