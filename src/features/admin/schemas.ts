import { z } from "zod";

/** Review states of a report. Values match the place_report_status database enum. */
export const REPORT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number]["value"];

const statusValues = REPORT_STATUSES.map((status) => status.value) as [
  ReportStatus,
  ...ReportStatus[],
];

/** `?status=` on the admin page; anything unexpected shows the open reports. */
export const parseStatusParam = (value: unknown): ReportStatus => {
  const parsed = z.enum(statusValues).safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : "open";
};

export const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

export const reviewSchema = z.object({
  reportId: z.uuid(),
  status: z.enum(statusValues),
});

/** `email` refills the form after a failed attempt; the password never comes back. */
export type SignInState = { status: "idle" } | { status: "error"; message: string; email?: string };
