/**
 * Understands searches like "cafes in Kakkanad" or "atm near Vyttila": when the
 * words after "in", "near" or "at" name one of the city's areas, the search is
 * split into a query and an area filter.
 */

const AREA_PHRASE = /^(.+?)\s+(?:in|near|at|around)\s+(.+)$/i;

/** Lowercase letters and digits only, so "Fort-Kochi" matches "fort kochi". */
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export function splitAreaQuery<T extends { slug: string; name: string; localName: string | null }>(
  query: string,
  areas: T[],
): { q: string; area: T } | null {
  const match = AREA_PHRASE.exec(query.trim());
  if (!match?.[1] || !match[2]) return null;
  const wanted = normalize(match[2]);
  if (!wanted) return null;
  const area = areas.find(
    (candidate) =>
      normalize(candidate.name) === wanted ||
      (candidate.localName !== null && normalize(candidate.localName) === wanted),
  );
  return area ? { q: match[1].trim(), area } : null;
}
