"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { createSessionClient } from "@/lib/supabase/session-client";

import { reviewSchema, signInSchema, type SignInState } from "../schemas";
import { getViewer } from "./auth";

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "").slice(0, 254);
  if (!parsed.success) return { status: "error", message: "Enter your email and password.", email };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // One message for every failure, so it never reveals which emails have accounts.
    return {
      status: "error",
      message:
        error.status === 429
          ? "Too many attempts. Please wait a few minutes."
          : "That email and password don't match.",
      email,
    };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin");
}

/** Marks a report resolved, dismissed or open again. Admin rights are checked here and by RLS. */
export async function reviewReport(formData: FormData) {
  const parsed = reviewSchema.safeParse({
    reportId: formData.get("reportId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const { supabase, viewer } = await getViewer();
  if (viewer.kind !== "admin") redirect("/admin");

  const { error } = await supabase
    .from("place_reports")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.reportId);
  if (error) throw new Error(`Could not update the report: ${error.message}`);
  refresh();
}
