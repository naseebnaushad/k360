import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatDistance } from "../format";
import { placePath } from "../paths";
import type { NearbyPlace } from "../types";
import { CategoryIcon } from "./category-icon";

export function NearbyPlaces({ places }: { places: NearbyPlace[] }) {
  if (places.length === 0) return null;

  return (
    <section aria-labelledby="nearby-heading">
      <h2 id="nearby-heading" className="text-lg font-semibold tracking-tight">
        Nearby
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 desktop:grid-cols-3">
        {places.map((place) => (
          <li key={place.id}>
            <Link
              href={placePath(place.slug)}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card transition-all hover:border-border-strong hover:shadow-lift"
            >
              <CategoryIcon slug={place.category?.slug} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:text-accent">
                  {place.name}
                </span>
                <span className="text-sm text-muted">
                  {formatDistance(place.distanceM)}
                  {place.category && ` · ${place.category.name}`}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
