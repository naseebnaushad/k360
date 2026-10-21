/**
 * Pure helpers for mapping hostnames to cities and back.
 * No framework imports here, so this logic is easy to unit test.
 */

export type HostTarget = { kind: "root" } | { kind: "city"; slug: string } | { kind: "unknown" };

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Subdomains that are aliases for the root site rather than cities. */
const ROOT_ALIASES = new Set(["www"]);

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

function normalize(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Work out what a request's Host header points at.
 *
 * parseHost("kochi.nsbglobal.net", "nsbglobal.net") → { kind: "city", slug: "kochi" }
 * parseHost("nsbglobal.net", "nsbglobal.net")       → { kind: "root" }
 */
export function parseHost(host: string, rootDomain: string): HostTarget {
  const h = normalize(host);
  const root = normalize(rootDomain);

  if (h === root) return { kind: "root" };

  const suffix = `.${root}`;
  if (!h.endsWith(suffix)) return { kind: "unknown" };

  const sub = h.slice(0, -suffix.length);
  if (ROOT_ALIASES.has(sub)) return { kind: "root" };

  // Only single-level subdomains are cities (free TLS covers one level only).
  if (!isValidSlug(sub)) return { kind: "unknown" };

  return { kind: "city", slug: sub };
}

function protocolFor(rootDomain: string): "http" | "https" {
  return rootDomain.startsWith("localhost") ? "http" : "https";
}

/** Absolute URL for a page within a city, e.g. https://kochi.nsbglobal.net/places */
export function cityUrl(slug: string, path: string, rootDomain: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${protocolFor(rootDomain)}://${slug}.${rootDomain}${cleanPath}`;
}

/** Absolute URL for a page on the root site, e.g. https://nsbglobal.net/about */
export function rootUrl(path: string, rootDomain: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${protocolFor(rootDomain)}://${rootDomain}${cleanPath}`;
}
