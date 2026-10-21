import "server-only";

import { z } from "zod";

/**
 * Server-only secrets. Never import this from client code ("server-only"
 * makes that a build error). Read lazily so platforms that inject secrets at
 * runtime (Cloudflare Workers) work.
 *
 * Production: `npx wrangler secret put REVALIDATE_SECRET`.
 */
const serverEnvSchema = z.object({
  /** Bearer token for POST /api/revalidate. When unset the endpoint is disabled. */
  REVALIDATE_SECRET: z.string().min(32, "Must be at least 32 characters").optional(),
});

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
