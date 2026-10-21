"use client";

import { List, Map as MapIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { LazyMapView, type MapViewProps } from "@/components/map/lazy-map-view";
import { DESKTOP_MEDIA_QUERY } from "@/lib/layout";
import { useMediaQuery } from "@/lib/use-media-query";

interface ResultsViewProps {
  list: ReactNode;
  map: MapViewProps;
}

/**
 * Desktop: list and a sticky map side by side.
 * Mobile: the list, with a floating button to switch to a full-screen map.
 *
 * The layout is pure CSS so the first paint is already right for the device;
 * JavaScript only decides when to load the map library (once a map is visible).
 */
export function ResultsView({ list, map }: ResultsViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [view, setView] = useState<"list" | "map">("list");
  const mapOpen = view === "map";

  return (
    <div className="desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] desktop:gap-6">
      <div className={mapOpen ? "hidden desktop:block" : undefined}>{list}</div>

      <div
        className={`${
          mapOpen ? "fixed inset-x-0 top-16 bottom-0 z-20 bg-background p-2" : "hidden"
        } desktop:static desktop:sticky desktop:top-20 desktop:block desktop:h-[calc(100dvh-6rem)] desktop:p-0`}
      >
        {isDesktop || mapOpen ? (
          <LazyMapView {...map} className="h-full" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-3xl bg-border" />
        )}
      </div>

      <button
        type="button"
        onClick={() => setView(mapOpen ? "list" : "map")}
        aria-pressed={mapOpen}
        className="fixed bottom-6 left-1/2 z-30 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-6 font-medium text-background shadow-lift transition-transform active:scale-95 desktop:hidden"
      >
        {mapOpen ? (
          <>
            <List aria-hidden className="size-4" /> List
          </>
        ) : (
          <>
            <MapIcon aria-hidden className="size-4" /> Map
          </>
        )}
      </button>
    </div>
  );
}
