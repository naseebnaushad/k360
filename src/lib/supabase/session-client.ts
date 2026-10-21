import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/config/env";

import type { Database } from "./database.types";

/**
 * Client that acts as the signed-in user (session read from cookies), so Row
 * Level Security applies to them. Never use it inside `"use cache"` scopes.
 */
export async function createSessionClient() {
  const store = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(list) {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Server Components cannot set cookies; the proxy keeps the session fresh.
          }
        },
      },
    },
  );
}
