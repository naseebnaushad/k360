import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/config/env";

import type { Database } from "./database.types";

/**
 * Anonymous, session-less client for reading public data on the server.
 * It never touches cookies, so it is safe to use inside `"use cache"` scopes.
 * Row Level Security decides what it can see.
 */
export function createPublicClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
