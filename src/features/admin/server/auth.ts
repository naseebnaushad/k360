import "server-only";

import { createSessionClient } from "@/lib/supabase/session-client";

export type Viewer =
  | { kind: "signed-out" }
  | { kind: "not-admin"; email: string }
  | { kind: "admin"; userId: string; email: string };

/**
 * Who is looking at the admin pages. The user is verified with the auth server
 * (not just read from the cookie), and admin rights come from public.admins,
 * which Row Level Security only lets a user read for themselves.
 */
export async function getViewer() {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, viewer: { kind: "signed-out" } as Viewer };

  const email = data.user.email ?? "";
  const { data: row } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const viewer: Viewer = row
    ? { kind: "admin", userId: data.user.id, email }
    : { kind: "not-admin", email };
  return { supabase, viewer };
}
