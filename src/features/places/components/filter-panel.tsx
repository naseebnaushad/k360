import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";

import {
  FEATURE_FILTERS,
  RADIUS_OPTIONS_M,
  SORT_OPTIONS,
  effectiveSort,
  formatRadius,
  type PlaceFilters,
} from "../filters";
import { placesPath } from "../paths";
import type { Area, CategoryWithCount } from "../types";

/** Areas shown before "More areas"; the rest are folded away. */
const TOP_AREAS = 8;

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Filters applied when an option is chosen; always back to page 1. */
const withFilters = (filters: PlaceFilters, change: Partial<PlaceFilters>) =>
  placesPath({ ...filters, ...change, page: 1 });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-5 first:pt-0 last:border-0">
      <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Option({
  href,
  selected,
  shape = "check",
  children,
  trailing,
}: {
  href: string;
  selected: boolean;
  shape?: "check" | "radio";
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
      aria-current={selected ? "true" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-surface-muted ${
        selected ? "font-medium text-foreground" : "text-foreground/80"
      }`}
    >
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
          shape === "radio" ? "rounded-full" : "rounded-md"
        } ${
          selected
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border-strong bg-surface group-hover:border-accent"
        }`}
      >
        {selected &&
          (shape === "radio" ? (
            <span className="size-2 rounded-full bg-accent-foreground" />
          ) : (
            <Check className="size-3.5" strokeWidth={3} />
          ))}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {children}
        {selected && <span className="sr-only"> (selected)</span>}
      </span>
      {trailing}
    </Link>
  );
}

const Count = ({ value }: { value: number }) => (
  <span className="text-xs text-muted tabular-nums">{value.toLocaleString("en-IN")}</span>
);

function AreaOptions({ filters, areas }: { filters: PlaceFilters; areas: Area[] }) {
  const option = (area: Area) => (
    <Option
      key={area.id}
      shape="radio"
      href={withFilters(filters, { area: area.slug })}
      selected={filters.area === area.slug}
      trailing={<Count value={area.placeCount} />}
    >
      {area.name}
    </Option>
  );
  const top = areas.slice(0, TOP_AREAS);
  const rest = [...areas.slice(TOP_AREAS)].sort((a, b) => a.name.localeCompare(b.name));
  const selectedInRest = rest.some((area) => area.slug === filters.area);

  return (
    <>
      <Option
        shape="radio"
        href={withFilters(filters, { area: undefined })}
        selected={!filters.area}
      >
        Anywhere
      </Option>
      {top.map(option)}
      {rest.length > 0 && (
        <details open={selectedInRest} className="group/more">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-accent hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open/more:rotate-180"
            />
            More areas ({rest.length})
          </summary>
          {rest.map(option)}
        </details>
      )}
    </>
  );
}

interface FilterPanelProps {
  filters: PlaceFilters;
  categories: CategoryWithCount[];
  areas: Area[];
}

export function FilterPanel({ filters, categories, areas }: FilterPanelProps) {
  const sort = effectiveSort(filters);
  const sortOptions = SORT_OPTIONS.filter(
    (option) =>
      (option.value !== "distance" || filters.near) && (option.value !== "relevance" || filters.q),
  );

  return (
    <div>
      {sortOptions.length > 1 && (
        <Section title="Sort by">
          {sortOptions.map((option) => (
            <Option
              key={option.value}
              shape="radio"
              href={withFilters(filters, { sort: option.value })}
              selected={sort === option.value}
            >
              {option.label}
            </Option>
          ))}
        </Section>
      )}

      <Section title="Open">
        <Option
          href={withFilters(filters, { open: !filters.open || undefined })}
          selected={Boolean(filters.open)}
        >
          Open now
        </Option>
      </Section>

      {filters.near && (
        <Section title="Distance">
          <Option
            shape="radio"
            href={withFilters(filters, { radius: undefined })}
            selected={!filters.radius}
          >
            Any distance
          </Option>
          {RADIUS_OPTIONS_M.map((radius) => (
            <Option
              key={radius}
              shape="radio"
              href={withFilters(filters, { radius })}
              selected={filters.radius === radius}
            >
              Within {formatRadius(radius)}
            </Option>
          ))}
        </Section>
      )}

      {areas.length > 0 && (
        <Section title="Area">
          <AreaOptions filters={filters} areas={areas} />
        </Section>
      )}

      <Section title="Category">
        {categories.map((category) => (
          <Option
            key={category.id}
            href={withFilters(filters, {
              categories: toggle(filters.categories, category.slug),
            })}
            selected={filters.categories.includes(category.slug)}
            trailing={<Count value={category.placeCount} />}
          >
            {category.name}
          </Option>
        ))}
      </Section>

      <Section title="Details">
        {FEATURE_FILTERS.map((feature) => (
          <Option
            key={feature.value}
            href={withFilters(filters, { has: toggle(filters.has, feature.value) })}
            selected={filters.has.includes(feature.value)}
          >
            {feature.label}
          </Option>
        ))}
      </Section>
    </div>
  );
}
