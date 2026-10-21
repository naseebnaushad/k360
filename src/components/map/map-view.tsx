"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  getVersion,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
}

export interface MapViewProps {
  styleUrl: string;
  center: { lat: number; lng: number };
  zoom: number;
  markers?: MapMarker[];
  /** Zoom out to show every marker (when there is more than one). */
  fitToMarkers?: boolean;
  /** The visitor's (rounded) location, shown as a dot. */
  userLocation?: { lat: number; lng: number };
  className?: string;
  ariaLabel: string;
}

// The worker is copied to public/vendor by scripts/vendor (bundlers do not emit it).
setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);

/** Popup content built from DOM nodes, never HTML strings, so labels cannot inject markup. */
function popupContent(marker: MapMarker): HTMLElement {
  const element = document.createElement(marker.href ? "a" : "span");
  element.textContent = marker.label;
  element.className = "font-medium";
  if (marker.href && element instanceof HTMLAnchorElement) element.href = marker.href;
  return element;
}

export function MapView({
  styleUrl,
  center,
  zoom,
  markers = [],
  fitToMarkers = true,
  userLocation,
  className = "",
  ariaLabel,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: [center.lng, center.lat],
      zoom,
      cooperativeGestures: true,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    // Marker colour follows the theme's accent token.
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || undefined;

    for (const marker of markers) {
      new Marker({ color: accent })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(new Popup({ offset: 24 }).setDOMContent(popupContent(marker)))
        .addTo(map);
    }

    if (userLocation) {
      const dot = document.createElement("div");
      dot.className = "user-location-dot";
      dot.setAttribute("aria-label", "Your approximate location");
      new Marker({ element: dot }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
    }

    if (fitToMarkers && markers.length + (userLocation ? 1 : 0) > 1) {
      const bounds = new LngLatBounds();
      for (const marker of markers) bounds.extend([marker.lng, marker.lat]);
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
      map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
    }

    return () => map.remove();
  }, [styleUrl, center.lat, center.lng, zoom, markers, fitToMarkers, userLocation]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className={`overflow-hidden rounded-3xl border border-border shadow-card ${className}`}
    />
  );
}
