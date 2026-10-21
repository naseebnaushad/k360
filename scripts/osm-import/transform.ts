/**
 * Pure transformation of OpenStreetMap elements into place rows.
 * No I/O here, so everything is unit tested.
 */

export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OsmTag {
  key: string;
  value: string;
}

/** Tags that must all be present, e.g. railway=station + station=subway. */
export type OsmTagGroup = OsmTag[];

export interface CategoryRule {
  id: string;
  slug: string;
  /** A feature belongs to the category when it matches any one group. */
  tags: OsmTagGroup[];
  /**
   * Name for features without one (ATMs, toilets, parking). Null means
   * unnamed features are skipped, which suits shops and restaurants.
   */
  unnamedLabel: string | null;
}

export interface PlaceRow {
  city_id: string;
  category_id: string | null;
  slug: string;
  name: string;
  local_name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  osm_type: OsmElement["type"];
  osm_id: number;
}

/** Strict format so tag values can be safely embedded in Overpass queries. */
const TAG_PATTERN = /^([a-z][a-z0-9_:]*)=([a-z0-9_:;-]+)$/;

export function parseTag(raw: string): OsmTag {
  const match = TAG_PATTERN.exec(raw);
  if (!match?.[1] || !match[2]) throw new Error(`Invalid OSM tag "${raw}", expected key=value`);
  return { key: match[1], value: match[2] };
}

/** Parses "key=value" or several joined with "+" that must all match. */
export function parseTagGroup(raw: string): OsmTagGroup {
  return raw.split("+").map(parseTag);
}

/** First matching rule wins, so rules must be passed in priority order. */
export function matchCategory(
  tags: Record<string, string>,
  rules: CategoryRule[],
): CategoryRule | null {
  for (const rule of rules) {
    if (rule.tags.some((group) => group.every(({ key, value }) => tags[key] === value))) {
      return rule;
    }
  }
  return null;
}

/** Features nobody may use, such as private car parks or staff toilets. */
const CLOSED_ACCESS = new Set(["private", "no"]);

/** "SBI ATM" when the brand is known, otherwise just "ATM". */
export function unnamedName(tags: Record<string, string>, label: string): string {
  const brand = clean(tags.brand ?? tags["brand:en"], 40);
  return brand && !label.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${label}` : label;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function clean(value: string | undefined, maxLength: number): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.length <= maxLength ? trimmed : null;
}

export function buildAddress(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) return clean(tags["addr:full"], 300);

  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [
    tags["addr:housename"],
    street,
    tags["addr:suburb"] ?? tags["addr:neighbourhood"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.length ? clean([...new Set(parts)].join(", "), 300) : null;
}

export function normalizeWebsite(raw: string | undefined): string | null {
  const value = raw?.trim().split(/[\s;]+/)[0];
  if (!value) return null;

  const hasHttpScheme = /^https?:\/\//i.test(value);
  // Reject other schemes (ftp://, mailto:, javascript:, …) rather than guessing.
  if (!hasHttpScheme && /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value)) return null;

  try {
    const url = new URL(hasHttpScheme ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || !url.hostname.includes(".")) return null;
    return clean(url.toString(), 500);
  } catch {
    return null;
  }
}

function firstPhone(tags: Record<string, string>): string | null {
  const raw = tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"];
  return clean(raw?.split(";")[0], 50);
}

export interface TransformContext {
  cityId: string;
  /** City languages, primary first. Secondary languages supply local names. */
  languages: string[];
  categoryRules: CategoryRule[];
}

/**
 * Converts one element; returns null when it lacks a location or category,
 * is not open to the public, or has no name and its category needs one.
 */
export function toPlaceRow(
  element: OsmElement,
  ctx: TransformContext,
): Omit<PlaceRow, "slug"> | null {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  if (CLOSED_ACCESS.has(tags.access ?? "")) return null;

  const category = matchCategory(tags, ctx.categoryRules);
  if (!category) return null;

  const primary = ctx.languages[0] ?? "en";
  const name =
    clean(tags[`name:${primary}`] ?? tags.name, 200) ??
    (category.unnamedLabel ? unnamedName(tags, category.unnamedLabel) : null);
  if (!name) return null;

  const localName =
    ctx.languages
      .slice(1)
      .map((lang) => clean(tags[`name:${lang}`], 200))
      .find((value): value is string => value !== null && value !== name) ?? null;

  return {
    city_id: ctx.cityId,
    category_id: category.id,
    name,
    local_name: localName,
    address: buildAddress(tags),
    lat,
    lng,
    phone: firstPhone(tags),
    website: normalizeWebsite(tags.website ?? tags["contact:website"]),
    opening_hours: clean(tags.opening_hours, 500),
    osm_type: element.type,
    osm_id: element.id,
  };
}

export const osmKey = (type: string, id: number | string) => `${type}/${id}`;

/**
 * Gives every row a slug that is unique within the city.
 * Rows already in the database keep their existing slug, so URLs never change.
 */
export function assignSlugs(
  rows: Omit<PlaceRow, "slug">[],
  existing: Map<string, string>,
  /** Slugs already used by other places in the city (e.g. community-added). */
  reserved: Iterable<string> = [],
): PlaceRow[] {
  const taken = new Set([...existing.values(), ...reserved]);
  const sorted = [...rows].sort((a, b) =>
    a.osm_type === b.osm_type ? a.osm_id - b.osm_id : a.osm_type.localeCompare(b.osm_type),
  );

  return sorted.map((row) => {
    const known = existing.get(osmKey(row.osm_type, row.osm_id));
    if (known) return { ...row, slug: known };

    const base = slugify(row.name) || `place-${row.osm_id}`;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    return { ...row, slug };
  });
}

/** Removes duplicate elements (the same feature can match several tag queries). */
export function dedupeElements(elements: OsmElement[]): OsmElement[] {
  const seen = new Map<string, OsmElement>();
  for (const element of elements) seen.set(osmKey(element.type, element.id), element);
  return [...seen.values()];
}
