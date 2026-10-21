import { Clock, Globe, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { formatDistance } from "../format";
import { placePath } from "../paths";
import type { PlaceListItem, PlaceSummary } from "../types";
import { CategoryIcon } from "./category-icon";
import { OpenStatus } from "./open-status";

type CardPlace = PlaceSummary &
  Partial<
    Pick<PlaceListItem, "distanceM" | "hasPhone" | "hasWebsite" | "hasHours" | "openingHours">
  >;

/** `timeZone` (the city's) enables the open/closed status; see OpenStatus for `renderedAt`. */
export function PlaceCard({
  place,
  timeZone,
  renderedAt,
}: {
  place: CardPlace;
  timeZone?: string;
  renderedAt?: number;
}) {
  const features = [
    place.hasPhone && { icon: Phone, label: "Phone" },
    place.hasWebsite && { icon: Globe, label: "Website" },
    place.hasHours && { icon: Clock, label: "Opening hours" },
  ].filter(Boolean) as { icon: typeof Phone; label: string }[];

  return (
    <Link
      href={placePath(place.slug)}
      className="group flex h-full gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
    >
      <CategoryIcon slug={place.category?.slug} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate font-semibold tracking-tight group-hover:text-accent">
            {place.name}
          </h3>
          {place.distanceM != null && (
            <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground tabular-nums">
              {formatDistance(place.distanceM)}
            </span>
          )}
        </div>
        {place.localName && <p className="truncate text-sm text-muted">{place.localName}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          {place.category && (
            <p className="text-xs font-medium text-accent">{place.category.name}</p>
          )}
          {timeZone && place.openingHours && (
            <OpenStatus hours={place.openingHours} timeZone={timeZone} renderedAt={renderedAt} />
          )}
        </div>
        {(place.address || place.areaName) && (
          <p className="mt-2 flex gap-1.5 text-sm text-muted">
            <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-1">
              {/* The area comes first: it is what people in the city navigate by. */}
              {[place.areaName, place.address].filter(Boolean).join(" · ")}
            </span>
          </p>
        )}
        {features.length > 0 && (
          <ul className="mt-3 flex gap-1.5" aria-label="Available details">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                title={label}
                className="flex size-7 items-center justify-center rounded-lg bg-surface-muted text-muted"
              >
                <Icon aria-hidden className="size-3.5" />
                <span className="sr-only">{label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
