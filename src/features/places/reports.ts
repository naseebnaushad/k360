import { z } from "zod";

/** Reasons a visitor can report. Values match the place_report_reason database enum. */
export const REPORT_REASONS = [
  { value: "closed", label: "It has closed down" },
  { value: "wrong_location", label: "Wrong location on the map" },
  { value: "wrong_contact", label: "Wrong phone number or website" },
  { value: "wrong_hours", label: "Wrong opening hours" },
  { value: "duplicate", label: "Listed twice" },
  { value: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_NOTE_MAX_LENGTH = 1000;

const reasonValues = REPORT_REASONS.map((reason) => reason.value) as [
  ReportReason,
  ...ReportReason[],
];

/** Validates the report form. `company` is a hidden trap field that people never fill. */
export const placeReportSchema = z.object({
  placeId: z.uuid(),
  reason: z.enum(reasonValues),
  note: z
    .string()
    .transform((value) =>
      value
        .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .pipe(z.string().max(REPORT_NOTE_MAX_LENGTH))
    .optional(),
  company: z.literal("").optional(),
});

export type ReportFormState =
  { status: "idle" } | { status: "success" } | { status: "error"; message: string };
