import { X } from "lucide-react";
import Link from "next/link";

import { FEATURE_FILTERS, formatRadius, type PlaceFilters } from "../filters";
import { placesPath } from "../paths";
import type { Area, CategoryWithCount } from "../types";

interface Chip {
  key: string;
  label: string;
  href: string;
}

/** Removable chips for every active filter, plus "Clear all". */
export function ActiveFilters({
  filters,
  categories,
  areas,
}: {
  filters: PlaceFilters;
  categories: CategoryWithCount[];
  areas: Area[];
}) {
  const base = { ...filters, page: 1 };
  const chips: Chip[] = [];

  if (filters.q)
    chips.push({ key: "q", label: `“${filters.q}”`, href: placesPath({ ...base, q: undefined }) });
  if (filters.near) {
    chips.push({
      key: "near",
      label: filters.radius ? `Near you · ${formatRadius(filters.radius)}` : "Near you",
      href: placesPath({ ...base, near: undefined, radius: undefined, sort: undefined }),
    });
  }
  if (filters.area) {
    chips.push({
      key: "area",
      label: `In ${areas.find((area) => area.slug === filters.area)?.name ?? filters.area}`,
      href: placesPath({ ...base, area: undefined }),
    });
  }
  for (const slug of filters.categories) {
    const name = categories.find((category) => category.slug === slug)?.name ?? slug;
    chips.push({
      key: `c-${slug}`,
      label: name,
      href: placesPath({ ...base, categories: filters.categories.filter((c) => c !== slug) }),
    });
  }
  for (const feature of filters.has) {
    const label = FEATURE_FILTERS.find((f) => f.value === feature)?.label ?? feature;
    chips.push({
      key: `h-${feature}`,
      label,
      href: placesPath({ ...base, has: filters.has.filter((h) => h !== feature) }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul
      aria-label="Active filters"
      className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 desktop:mx-0 desktop:flex-wrap desktop:px-0"
    >
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <Link
            href={chip.href}
            scroll={false}
            replace
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft pr-2.5 pl-3 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {chip.label}
            <X aria-hidden className="size-3.5" />
            <span className="sr-only">Remove filter</span>
          </Link>
        </li>
      ))}
      {chips.length > 1 && (
        <li className="shrink-0">
          <Link
            href={placesPath()}
            scroll={false}
            replace
            className="inline-flex h-8 items-center px-2 text-sm text-muted hover:text-foreground"
          >
            Clear all
          </Link>
        </li>
      )}
    </ul>
  );
}
