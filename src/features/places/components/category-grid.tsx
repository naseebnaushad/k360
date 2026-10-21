import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { placesPath } from "../paths";
import type { CategoryWithCount } from "../types";
import { CategoryIcon } from "./category-icon";

export function CategoryGrid({ categories }: { categories: CategoryWithCount[] }) {
  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-muted">
        No places have been added to this city yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 desktop:grid-cols-4 desktop:xl:grid-cols-6">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={placesPath({ category: category.slug })}
            className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
          >
            <CategoryIcon slug={category.slug} />
            <span>
              <span className="block leading-snug font-medium group-hover:text-accent">
                {category.name}
              </span>
              <span className="mt-0.5 block text-sm text-muted tabular-nums">
                {category.placeCount.toLocaleString("en-IN")} places
              </span>
            </span>
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={placesPath()}
          className="group flex h-full min-h-32 flex-col justify-between rounded-2xl bg-foreground p-4 text-background shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="font-medium">Browse everything</span>
          <span className="flex items-center gap-1 text-sm opacity-80">
            All places{" "}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </li>
    </ul>
  );
}
