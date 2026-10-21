/**
 * Pure transformation of OpenStreetMap place nodes into area rows.
 * No I/O here, so everything is unit tested.
 */
import { slugify, type OsmElement } from "../osm-import/transform.ts";

/** OSM place kinds imported as areas, most significant first. */
export const AREA_KINDS = ["town", "suburb", "quarter", "neighbourhood", "village"] as const;
export type AreaKind = (typeof AREA_KINDS)[number];

export interface AreaRow {
  city_id: string;
  slug: string;
  name: string;
  local_name: string | null;
  kind: AreaKind;
  lat: number;
  lng: number;
  osm_type: OsmElement["type"];
  osm_id: number;
}

const clean = (value: string | undefined) => {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed && trimmed.length <= 120 ? trimmed : null;
};

const isKind = (value: string | undefined): value is AreaKind =>
  AREA_KINDS.includes(value as AreaKind);

/**
 * Converts place nodes into areas. Names are unique within a city, so when
 * two features share a name only the most significant one is kept. Areas
 * already in the database keep their slug, so links never change.
 */
export function toAreaRows(
  elements: OsmElement[],
  ctx: { cityId: string; languages: string[]; existingSlugs: Map<string, string> },
): AreaRow[] {
  const primary = ctx.languages[0] ?? "en";
  const candidates = elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const name = clean(tags[`name:${primary}`] ?? tags.name);
    if (lat === undefined || lng === undefined || !name || !isKind(tags.place)) return [];
    const localName =
      ctx.languages
        .slice(1)
        .map((lang) => clean(tags[`name:${lang}`]))
        .find((value): value is string => value !== null && value !== name) ?? null;
    return [{ element, name, localName, kind: tags.place, lat, lng }];
  });

  candidates.sort(
    (a, b) =>
      AREA_KINDS.indexOf(a.kind) - AREA_KINDS.indexOf(b.kind) || a.element.id - b.element.id,
  );

  const seenNames = new Set<string>();
  const taken = new Set(ctx.existingSlugs.values());
  const rows: AreaRow[] = [];
  for (const { element, name, localName, kind, lat, lng } of candidates) {
    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    let slug = ctx.existingSlugs.get(`${element.type}/${element.id}`);
    if (!slug) {
      const base = slugify(name) || `area-${element.id}`;
      slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      taken.add(slug);
    }
    rows.push({
      city_id: ctx.cityId,
      slug,
      name,
      local_name: localName,
      kind,
      lat,
      lng,
      osm_type: element.type,
      osm_id: element.id,
    });
  }
  return rows;
}
