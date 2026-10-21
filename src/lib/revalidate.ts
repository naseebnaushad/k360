import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/**
 * Cache tags that may be revalidated from outside (e.g. by the importer).
 * Anything else is rejected so callers cannot probe or flush arbitrary keys.
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ALLOWED_TAG = new RegExp(
  `^(?:cities|cities:[a-z0-9-]{1,63}|place-categories|places:city:${UUID})$`,
);

export const revalidateBodySchema = z.object({
  tags: z.array(z.string().regex(ALLOWED_TAG, "Tag not allowed")).min(1).max(20),
});

/** Constant-time check of an `Authorization: Bearer <secret>` header. */
export function isAuthorized(header: string | null, secret: string): boolean {
  const token = header?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  // Hash both so the comparison is constant-time regardless of length.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(secret));
}
