"use client";

import { useMemo, useSyncExternalStore } from "react";

import { describeOpenState, minuteOfWeek, openState, parseOpeningHours } from "@/lib/opening-hours";

const MINUTE_MS = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, MINUTE_MS);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / MINUTE_MS);

/**
 * "Open · closes 9 pm" for a place, kept current in the browser. Renders nothing
 * when the hours are not understood. Pages rendered per request pass `renderedAt`
 * so the status is in the HTML; cached pages omit it and show it once loaded.
 */
export function OpenStatus({
  hours,
  timeZone,
  size = "sm",
  renderedAt,
}: {
  hours: string | null;
  timeZone: string;
  size?: "sm" | "md";
  /** Server time (ms) for the initial render; omit on cached pages. */
  renderedAt?: number;
}) {
  const minute = useSyncExternalStore(subscribe, currentMinute, () =>
    renderedAt === undefined ? null : Math.floor(renderedAt / MINUTE_MS),
  );
  const weekly = useMemo(() => parseOpeningHours(hours), [hours]);
  if (minute === null || !weekly) return null;

  const now = minuteOfWeek(new Date(minute * MINUTE_MS), timeZone);
  const state = openState(weekly, now);
  const [status, detail] = describeOpenState(state, now).split(" · ");
  const soon = state.open && state.changesIn !== null && state.changesIn <= 60;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${size === "md" ? "text-sm" : "text-xs"} font-medium`}
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${
          state.open ? (soon ? "bg-warning" : "bg-success") : "bg-danger"
        }`}
      />
      <span className={state.open ? (soon ? "text-warning" : "text-success") : "text-danger"}>
        {status}
      </span>
      {detail && <span className="font-normal text-muted">· {detail}</span>}
    </span>
  );
}
