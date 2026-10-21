/**
 * URL builders for place pages, relative to the current city's subdomain.
 * Keeping them in one place means routes can move without hunting for links.
 */
import type { PlaceFilters } from "./filters";

export type PlacesPathParams = Partial<PlaceFilters> & { category?: string };

export function placesPath(params: PlacesPathParams = {}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  for (const category of params.categories ?? (params.category ? [params.category] : [])) {
    search.append("category", category);
  }
  if (params.area) search.set("area", params.area);
  if (params.near) search.set("near", `${params.near.lat},${params.near.lng}`);
  if (params.near && params.radius) search.set("radius", String(params.radius));
  for (const feature of params.has ?? []) search.append("has", feature);
  if (params.open) search.set("open", "now");
  if (params.sort) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/places?${query}` : "/places";
}

export const placePath = (slug: string) => `/places/${slug}`;
