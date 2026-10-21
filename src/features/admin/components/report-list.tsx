import { ExternalLink, Inbox } from "lucide-react";

import { siteConfig } from "@/config/site";
import { REPORT_REASONS, placePath } from "@/features/places";
import { cityUrl } from "@/lib/hosts";

import { REPORT_STATUSES, type ReportStatus } from "../schemas";
import { reviewReport } from "../server/actions";
import type { AdminReport } from "../types";

const REASON_LABELS = new Map<string, string>(REPORT_REASONS.map((r) => [r.value, r.label]));

/** What each status can be changed to, with the button label. */
const ACTIONS: Record<ReportStatus, { status: ReportStatus; label: string; primary?: boolean }[]> =
  {
    open: [
      { status: "resolved", label: "Mark fixed", primary: true },
      { status: "dismissed", label: "Dismiss" },
    ],
    resolved: [{ status: "open", label: "Reopen" }],
    dismissed: [{ status: "open", label: "Reopen" }],
  };

function formatWhen(iso: string, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

export function ReportList({
  reports,
  status,
  counts,
}: {
  reports: AdminReport[];
  status: ReportStatus;
  counts: Record<ReportStatus, number>;
}) {
  return (
    <>
      <nav aria-label="Report status" className="flex gap-2 overflow-x-auto">
        {REPORT_STATUSES.map((tab) => (
          <a
            key={tab.value}
            href={`/admin?status=${tab.value}`}
            aria-current={tab.value === status ? "page" : undefined}
            className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:border-accent aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
          >
            {tab.label}
            <span className="text-xs text-muted tabular-nums">{counts[tab.value]}</span>
          </a>
        ))}
      </nav>

      {reports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-14 text-center text-muted">
          <Inbox aria-hidden className="mx-auto size-8" />
          <p className="mt-3">No {status} reports.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  {report.place?.city ? (
                    <a
                      href={cityUrl(
                        report.place.city.slug,
                        placePath(report.place.slug),
                        siteConfig.rootDomain,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold hover:text-accent"
                    >
                      {report.place.name}
                      <ExternalLink aria-hidden className="size-3.5 text-muted" />
                    </a>
                  ) : (
                    <p className="font-semibold text-muted">Place no longer listed</p>
                  )}
                  {report.place?.city && (
                    <p className="text-xs text-muted">{report.place.city.name}</p>
                  )}
                </div>
                <time dateTime={report.createdAt} className="text-xs text-muted tabular-nums">
                  {formatWhen(report.createdAt, report.place?.city?.timeZone)}
                </time>
              </div>

              <p className="mt-3 text-sm font-medium text-accent">
                {REASON_LABELS.get(report.reason) ?? report.reason}
              </p>
              {/* Visitor text: rendered as plain text only, never as HTML. */}
              {report.note && (
                <p className="mt-1 text-sm break-words whitespace-pre-line">{report.note}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {ACTIONS[report.status].map((action) => (
                  <form key={action.status} action={reviewReport}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="status" value={action.status} />
                    <button
                      type="submit"
                      className={
                        action.primary
                          ? "h-9 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
                          : "h-9 rounded-full border border-border px-4 text-sm font-medium hover:border-accent hover:text-accent"
                      }
                    >
                      {action.label}
                    </button>
                  </form>
                ))}
                {report.reviewedAt && (
                  <span className="text-xs text-muted">
                    Reviewed {formatWhen(report.reviewedAt, report.place?.city?.timeZone)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
