import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/config/env";

/**
 * Continues the request, first refreshing an expiring sign-in session so the
 * new cookies reach both this render (request) and the browser (response).
 */
export async function nextWithFreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list, headers) {
          for (const { name, value } of list) request.cookies.set(name, value);
          // Rebuilt so the forwarded request carries the refreshed cookies.
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );
  await supabase.auth.getClaims();
  return response;
}
