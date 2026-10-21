import { Globe, Navigation, Phone } from "lucide-react";

import type { Place } from "../types";
import { ShareButton } from "./share-button";

export const directionsUrl = ({ lat, lng }: Place["location"]) =>
  `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/**
 * Primary actions for a place. Desktop: a row of buttons under the title.
 * Mobile: a bar fixed to the bottom of the screen, within thumb reach.
 */
export function PlaceActions({ place }: { place: Place }) {
  const actions = [
    place.phone && { href: telHref(place.phone), label: "Call", icon: Phone, external: false },
    { href: directionsUrl(place.location), label: "Directions", icon: Navigation, external: true },
    place.website && { href: place.website, label: "Website", icon: Globe, external: true },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Phone; external: boolean }[];

  const link = (action: (typeof actions)[number], index: number, mobile: boolean) => {
    const primary = index === 0;
    const Icon = action.icon;
    return (
      <a
        key={action.label}
        href={action.href}
        {...(action.external
          ? {
              target: "_blank",
              rel: `noopener noreferrer${action.label === "Website" ? " nofollow ugc" : ""}`,
            }
          : {})}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${
          mobile ? "h-12 flex-1 text-sm" : "h-11 px-5 text-sm"
        } ${
          primary
            ? "bg-accent text-accent-foreground hover:bg-accent-strong"
            : "border border-border bg-surface hover:border-accent hover:text-accent"
        }`}
      >
        <Icon aria-hidden className="size-4" />
        {action.label}
      </a>
    );
  };

  const shareText = [place.name, place.category?.name, place.address].filter(Boolean).join(" · ");
  const secondary =
    "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface font-medium transition-colors hover:border-accent hover:text-accent";

  return (
    <>
      <div className="hidden flex-wrap gap-2 desktop:flex">
        {actions.map((action, i) => link(action, i, false))}
        <ShareButton
          title={place.name}
          text={shareText}
          className={`${secondary} h-11 px-5 text-sm`}
        />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl desktop:hidden">
        <div className="flex gap-2">
          {actions.map((action, i) => link(action, i, true))}
          <ShareButton
            title={place.name}
            text={shareText}
            compact
            className={`${secondary} size-12 shrink-0`}
          />
        </div>
      </div>
    </>
  );
}
