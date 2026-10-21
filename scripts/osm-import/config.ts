import { parseArgs } from "node:util";

import { z } from "zod";

/** Public Overpass API servers, tried in order. Override with OVERPASS_ENDPOINTS. */
const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const configSchema = z.object({
  citySlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "Invalid city slug"),
  dryRun: z.boolean(),
  /** Limit the run to these category slugs (e.g. to retry ones that failed). */
  onlyCategories: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid category slug"))
    .optional(),
  radiusOverride: z.number().int().min(1000).max(100000).optional(),
  batchSize: z.number().int().min(50).max(2000),
  timeoutS: z.number().int().min(10).max(900),
  rounds: z.number().int().min(1).max(10),
  overpassEndpoints: z.array(z.url()).min(1),
  userAgent: z.string().min(1),
});

export type ImportConfig = z.infer<typeof configSchema>;

export function loadConfig(argv: string[]): ImportConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      city: { type: "string" },
      radius: { type: "string" },
      "batch-size": { type: "string" },
      timeout: { type: "string" },
      only: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  });

  const endpoints = process.env.OVERPASS_ENDPOINTS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "city-guide";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

  const parsed = configSchema.safeParse({
    citySlug: values.city,
    dryRun: values["dry-run"],
    onlyCategories: values.only
      ?.split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
    radiusOverride: values.radius ? Number(values.radius) : undefined,
    batchSize: values["batch-size"] ? Number(values["batch-size"]) : 500,
    timeoutS: values.timeout ? Number(values.timeout) : 120,
    rounds: 3,
    overpassEndpoints: endpoints?.length ? endpoints : DEFAULT_OVERPASS_ENDPOINTS,
    userAgent: `${siteName.replace(/\s+/g, "-")}-osm-import/1.0 (+https://${rootDomain})`,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid import options:\n${z.prettifyError(parsed.error)}\n\n` +
        "Usage: npm run import:osm -- --city <slug> [--only <category,...>] [--radius <metres>] [--timeout <seconds>] [--dry-run]",
    );
  }
  return parsed.data;
}
