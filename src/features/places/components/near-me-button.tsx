"use client";

import { LoaderCircle, LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { roundCoordinate, type PlaceFilters } from "../filters";
import { placesPath } from "../paths";

const ERRORS: Record<number, string> = {
  1: "Location access was blocked. Allow it in your browser settings to see places near you.",
  2: "Your location isn't available right now. Try again in a moment.",
  3: "Finding your location took too long. Try again.",
};

interface NearMeButtonProps {
  /** Filters to keep when switching to "near me". */
  filters?: Partial<PlaceFilters>;
  variant?: "primary" | "chip";
  label?: string;
}

/**
 * Asks the browser for the visitor's location and shows the nearest places.
 * Coordinates are rounded to ~110 m before they are put in the URL, and are
 * never stored by the app.
 */
export function NearMeButton({
  filters = {},
  variant = "chip",
  label = "Near me",
}: NearMeButtonProps) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigating, startTransition] = useTransition();
  const busy = locating || navigating;

  function locate() {
    if (!("geolocation" in navigator)) {
      setError("This browser can't share your location.");
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const near = {
          lat: roundCoordinate(coords.latitude),
          lng: roundCoordinate(coords.longitude),
        };
        startTransition(() =>
          router.push(placesPath({ ...filters, near, sort: "distance", page: 1 })),
        );
      },
      (failure) => {
        setLocating(false);
        setError(ERRORS[failure.code] ?? ERRORS[2]!);
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }

  const styles =
    variant === "primary"
      ? "h-14 gap-2 rounded-full border border-border bg-surface px-6 font-medium shadow-card hover:border-accent hover:text-accent"
      : "h-9 gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-medium hover:border-accent hover:text-accent";

  return (
    <div className="contents">
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        aria-busy={busy}
        className={`inline-flex shrink-0 items-center justify-center transition-colors disabled:opacity-70 ${styles}`}
      >
        {busy ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : (
          <LocateFixed aria-hidden className="size-4" />
        )}
        {busy ? "Locating…" : label}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
