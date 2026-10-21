import { z } from "zod";

import {
  FEATURE_FILTERS,
  RADIUS_OPTIONS_M,
  SORT_OPTIONS,
  roundCoordinate,
  type FeatureFilter,
  type PlaceFilters,
  type RadiusM,
  type SortOption,
} from "./filters";

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const all = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 100;
const MAX_CATEGORIES = 20;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Collapses whitespace and strips control characters from a search query. */
export function normalizeSearchQuery(value: string): string {
  return value
    .replace(/\p{C}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/** Parses "lat,lng", rounding to the privacy precision. */
export function parseNear(value: unknown): { lat: number; lng: number } | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
}

const featureValues = new Set<string>(FEATURE_FILTERS.map((f) => f.value));
const sortValues = new Set<string>(SORT_OPTIONS.map((s) => s.value));
const radiusValues = new Set<number>(RADIUS_OPTIONS_M);

/**
 * Validates the places list URL:
 *   ?q=&category=a&category=b&area=&near=lat,lng&radius=&has=phone&open=now&sort=&page=
 * Invalid values are dropped instead of erroring, so a bad link still works.
 */
export const placeListSearchSchema = z
  .object({
    q: z.unknown(),
    category: z.unknown(),
    area: z.unknown(),
    near: z.unknown(),
    radius: z.unknown(),
    has: z.unknown(),
    open: z.unknown(),
    sort: z.unknown(),
    page: z.unknown(),
  })
  .partial()
  .transform((raw): PlaceFilters => {
    const q = first(raw.q);
    const query = typeof q === "string" ? normalizeSearchQuery(q) : "";

    const categories = [
      ...new Set(
        all(raw.category).filter(
          (value): value is string =>
            typeof value === "string" && value.length <= 60 && SLUG.test(value),
        ),
      ),
    ].slice(0, MAX_CATEGORIES);

    const area = first(raw.area);
    const near = parseNear(first(raw.near));
    const radius = Number(first(raw.radius));
    const has = [
      ...new Set(
        all(raw.has).filter(
          (value): value is FeatureFilter => typeof value === "string" && featureValues.has(value),
        ),
      ),
    ];
    const sort = first(raw.sort);
    const page = Number(first(raw.page));

    return {
      q: query.length >= SEARCH_QUERY_MIN_LENGTH ? query : undefined,
      categories,
      area: typeof area === "string" && area.length <= 120 && SLUG.test(area) ? area : undefined,
      near,
      radius: near && radiusValues.has(radius) ? (radius as RadiusM) : undefined,
      has,
      open: first(raw.open) === "now" || undefined,
      sort: typeof sort === "string" && sortValues.has(sort) ? (sort as SortOption) : undefined,
      page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
    };
  });

export type PlaceListSearch = PlaceFilters;
