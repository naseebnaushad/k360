"use client";

import dynamic from "next/dynamic";

import type { MapViewProps } from "./map-view";

/** Loads the map library only in the browser, and only when a map is on screen. */
const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-border" />,
});

export function LazyMapView(props: MapViewProps) {
  return <MapView {...props} />;
}

export type { MapMarker, MapViewProps } from "./map-view";
