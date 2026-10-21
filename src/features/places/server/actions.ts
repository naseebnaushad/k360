"use server";

import { createPublicClient } from "@/lib/supabase/public-client";

import { placeReportSchema, type ReportFormState } from "../reports";

/**
 * Saves a "Report a problem" submission. Anyone can report without an account;
 * the database only accepts reports for visible places, keeps them unreadable
 * from the API and rate-limits them, so this action needs no extra privileges.
 */
export async function reportPlace(
  _previous: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const parsed = placeReportSchema.safeParse({
    placeId: formData.get("placeId"),
    reason: formData.get("reason"),
    note: formData.get("note") ?? undefined,
    company: formData.get("company") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Please choose what is wrong and try again." };
  }

  const { placeId, reason, note } = parsed.data;
  const { error } = await createPublicClient()
    .from("place_reports")
    .insert({ place_id: placeId, reason, note: note || null });

  if (error) {
    // P0001 is the rate limit raised by the database; its message is written for people.
    return {
      status: "error",
      message:
        error.code === "P0001"
          ? error.message
          : "Your report couldn't be sent. Please try again in a moment.",
    };
  }
  return { status: "success" };
}
