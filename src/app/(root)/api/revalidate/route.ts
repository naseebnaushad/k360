import { revalidateTag } from "next/cache";

import { getServerEnv } from "@/config/env.server";
import { isAuthorized, revalidateBodySchema } from "@/lib/revalidate";

/**
 * Refreshes cached data after the database changes outside the app (imports,
 * manual edits). Root domain only; city hosts never reach this route.
 *
 *   POST /api/revalidate
 *   Authorization: Bearer $REVALIDATE_SECRET
 *   {"tags": ["place-categories", "places:city:<uuid>"]}
 */
export async function POST(request: Request) {
  const { REVALIDATE_SECRET } = getServerEnv();
  if (!REVALIDATE_SECRET) return new Response("Not found", { status: 404 });

  if (!isAuthorized(request.headers.get("authorization"), REVALIDATE_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = revalidateBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return new Response("Bad request", { status: 400 });

  for (const tag of body.data.tags) revalidateTag(tag, "max");
  return Response.json({ revalidated: body.data.tags });
}
