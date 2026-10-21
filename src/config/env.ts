import { z } from "zod";

/**
 * Public environment variables (safe to expose to the browser).
 *
 * Rules:
 * - Never read `process.env` outside src/config.
 * - Secrets never go here; they belong in ./env.server.ts.
 * - Each variable must be referenced literally (process.env.NEXT_PUBLIC_X)
 *   so Next.js can inline it into the browser bundle.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  NEXT_PUBLIC_SITE_TAGLINE: z.string().min(1),
  NEXT_PUBLIC_SITE_DESCRIPTION: z.string().min(1),
  /** Domain city subdomains hang off, e.g. "nsbglobal.net" or "localhost:3000". */
  NEXT_PUBLIC_ROOT_DOMAIN: z
    .string()
    .regex(/^[a-z0-9.-]+(:\d+)?$/, "Must be a bare host, e.g. example.com or localhost:3000"),
  NEXT_PUBLIC_CREATOR_NAME: z.string().min(1),
  NEXT_PUBLIC_CREATOR_URL: z.url().optional(),
  NEXT_PUBLIC_REPOSITORY_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** MapLibre style JSON URL; its origin is allowed by the CSP automatically. */
  NEXT_PUBLIC_MAP_STYLE_URL: z.url(),
});

const emptyToUndefined = (value: string | undefined) => (value === "" ? undefined : value);

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_SITE_TAGLINE: process.env.NEXT_PUBLIC_SITE_TAGLINE,
  NEXT_PUBLIC_SITE_DESCRIPTION: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  NEXT_PUBLIC_CREATOR_NAME: process.env.NEXT_PUBLIC_CREATOR_NAME,
  NEXT_PUBLIC_CREATOR_URL: emptyToUndefined(process.env.NEXT_PUBLIC_CREATOR_URL),
  NEXT_PUBLIC_REPOSITORY_URL: emptyToUndefined(process.env.NEXT_PUBLIC_REPOSITORY_URL),
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment variables (see .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
