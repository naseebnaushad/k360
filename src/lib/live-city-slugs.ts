/**
 * Short-lived in-memory list of live city slugs, used by the proxy to reject
 * made-up subdomains before they reach the page layer or the database.
 * No framework imports here, so this logic is easy to unit test.
 */

type Clock = () => number;

export function createLiveSlugGate(
  loadSlugs: () => Promise<string[]>,
  ttlMs: number,
  now: Clock = Date.now,
) {
  let cache: { slugs: Set<string>; expiresAt: number } | null = null;
  let inflight: Promise<Set<string>> | null = null;

  async function load(): Promise<Set<string>> {
    if (cache && cache.expiresAt > now()) return cache.slugs;
    // Concurrent requests share one lookup.
    inflight ??= loadSlugs()
      .then((slugs) => {
        cache = { slugs: new Set(slugs), expiresAt: now() + ttlMs };
        return cache.slugs;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  /**
   * True when the slug is a live city. Fails open if the list cannot be loaded,
   * so a database outage cannot turn every city into a 404; the page layer still
   * checks the city itself.
   */
  return async function isLiveSlug(slug: string): Promise<boolean> {
    try {
      return (await load()).has(slug);
    } catch {
      return true;
    }
  };
}
