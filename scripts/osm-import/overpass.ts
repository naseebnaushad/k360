import type { OsmElement, OsmTagGroup } from "./transform.ts";

interface QueryArea {
  lat: number;
  lng: number;
  radiusM: number;
}

/**
 * Builds an Overpass query for features matching any of the tag groups.
 * Only named features are fetched unless `includeUnnamed` is set.
 */
export function buildOverpassQuery(
  area: QueryArea,
  groups: OsmTagGroup[],
  timeoutS: number,
  { includeUnnamed = false }: { includeUnnamed?: boolean } = {},
): string {
  const around = `around:${Math.round(area.radiusM)},${area.lat},${area.lng}`;
  const nameFilter = includeUnnamed ? "" : '["name"]';
  const statements = groups.map((group) => {
    const filters = group.map(({ key, value }) => `["${key}"="${value}"]`).join("");
    return `  nwr(${around})${filters}${nameFilter};`;
  });
  return `[out:json][timeout:${timeoutS}];\n(\n${statements.join("\n")}\n);\nout center tags;`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface OverpassClientOptions {
  endpoints: string[];
  userAgent: string;
  /** Server-side query timeout; the HTTP request waits slightly longer. */
  timeoutS: number;
  /** Full passes over all endpoints before giving up. */
  rounds: number;
}

/**
 * Creates a client that remembers which endpoint last succeeded and tries it
 * first, falling back through the others with backoff between rounds.
 */
export function createOverpassClient({
  endpoints,
  userAgent,
  timeoutS,
  rounds,
}: OverpassClientOptions) {
  let preferred = 0;

  async function request(endpoint: string, query: string): Promise<OsmElement[]> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout((timeoutS + 30) * 1000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as { elements?: OsmElement[]; remark?: string };
    if (json.remark && /error|timed out/i.test(json.remark)) throw new Error(json.remark);
    return json.elements ?? [];
  }

  return {
    async query(
      area: QueryArea,
      groups: OsmTagGroup[],
      options?: { includeUnnamed?: boolean },
    ): Promise<OsmElement[]> {
      const query = buildOverpassQuery(area, groups, timeoutS, options);
      const errors: string[] = [];

      for (let round = 0; round < rounds; round++) {
        if (round > 0) await sleep(2 ** round * 5_000);

        for (let i = 0; i < endpoints.length; i++) {
          const index = (preferred + i) % endpoints.length;
          const endpoint = endpoints[index]!;
          try {
            const elements = await request(endpoint, query);
            preferred = index;
            return elements;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${new URL(endpoint).host}: ${message}`);
            console.warn(`    ↳ ${new URL(endpoint).host} failed (${message}), trying next…`);
          }
        }
      }

      throw new Error(`All Overpass endpoints failed:\n  ${errors.join("\n  ")}`);
    },
  };
}
