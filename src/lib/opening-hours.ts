/**
 * Opening hours in OpenStreetMap syntax, e.g. "Mo-Sa 09:00-13:00,14:00-20:00; Su off".
 *
 * Supports the common subset: day lists and ranges, several time spans per day,
 * spans past midnight, "off"/"closed", "24/7", and public-holiday rules (ignored,
 * since holidays are not known). Anything else is reported as unknown (null)
 * instead of being guessed, so a place is never shown as open by mistake.
 *
 * Dependency-free so the data scripts can use it as well as the app.
 */

export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/** Open intervals as [start, end) minutes since Monday 00:00, sorted and merged. */
export type WeeklyHours = [number, number][];

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const HOLIDAYS = new Set(["PH", "SH"]);

const DAY_PART = /^([A-Z][a-z]|[A-Z]{2})(?:\s*-\s*([A-Z][a-z]))?(?:\s+(.+))?$/;
const TIME_SPAN = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\+?$/;
const OFF = /^(?:off|closed)$/i;

interface Rule {
  days: Set<number>;
  holiday: boolean;
  spans: [number, number][];
  off: boolean;
  /** Introduced by "," after a complete rule: adds to earlier rules instead of replacing them. */
  additional: boolean;
}

const emptyRule = (additional: boolean): Rule => ({
  days: new Set(),
  holiday: false,
  spans: [],
  off: false,
  additional,
});

function parseSpan(text: string): [number, number] | null {
  const match = TIME_SPAN.exec(text);
  if (!match) return null;
  const [sh, sm, eh, em] = match.slice(1).map(Number) as [number, number, number, number];
  if (sm > 59 || em > 59 || sh > 23 || eh > 48) return null;
  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  // "18:00-02:00" runs past midnight; "09:00-09:00" is a full day.
  if (end <= start) end += MINUTES_PER_DAY;
  return [start, end];
}

/** Applies the value part of a rule ("09:00-18:00" or "off"); false if not understood. */
function addValue(rule: Rule, text: string): boolean {
  if (OFF.test(text)) {
    rule.off = true;
    return true;
  }
  const span = parseSpan(text);
  if (!span) return false;
  rule.spans.push(span);
  return true;
}

function addDays(rule: Rule, from: string, to: string | undefined): boolean {
  if (HOLIDAYS.has(from) && !to) {
    rule.holiday = true;
    return true;
  }
  const start = DAYS.indexOf(from as (typeof DAYS)[number]);
  const end = to ? DAYS.indexOf(to as (typeof DAYS)[number]) : start;
  if (start < 0 || end < 0) return false;
  // Ranges may wrap around the week, e.g. "Fr-Mo".
  for (let day = start; ; day = (day + 1) % 7) {
    rule.days.add(day);
    if (day === end) break;
  }
  return true;
}

/** Splits one ";"-separated section into rules; null if any part is not understood. */
function parseSection(section: string): Rule[] | null {
  const rules: Rule[] = [];
  let rule = emptyRule(false);

  for (const raw of section.split(",")) {
    const part = raw.trim();
    if (!part) return null;

    const dayMatch = DAY_PART.exec(part);
    if (dayMatch && !OFF.test(part)) {
      // A day list after a finished rule starts another rule ("Mo 09:00-12:00, Tu 10:00-14:00").
      if (rule.spans.length || rule.off) {
        rules.push(rule);
        rule = emptyRule(true);
      }
      if (!addDays(rule, dayMatch[1]!, dayMatch[2])) return null;
      if (dayMatch[3] !== undefined && !addValue(rule, dayMatch[3].trim())) return null;
    } else if (!addValue(rule, part)) {
      return null;
    }
  }
  rules.push(rule);
  return rules;
}

function normalize(intervals: [number, number][]): WeeklyHours {
  const split: [number, number][] = [];
  for (const [start, end] of intervals) {
    if (end <= MINUTES_PER_WEEK) split.push([start, end]);
    else split.push([start, MINUTES_PER_WEEK], [0, end - MINUTES_PER_WEEK]);
  }
  split.sort((a, b) => a[0] - b[0]);

  const merged: WeeklyHours = [];
  for (const [start, end] of split) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Parses opening hours text; null when missing or not understood. */
export function parseOpeningHours(text: string | null | undefined): WeeklyHours | null {
  const value = text?.trim();
  if (!value) return null;
  if (value === "24/7") return [[0, MINUTES_PER_WEEK]];

  // Spans per weekday; spans may run past midnight into the next day.
  const week: [number, number][][] = DAYS.map(() => []);
  let understood = false;

  for (const section of value.split(";")) {
    if (!section.trim()) continue;
    const rules = parseSection(section);
    if (!rules) return null;

    for (const rule of rules) {
      if (!rule.spans.length && !rule.off) return null;
      // Holiday-only rules ("PH off") cannot be applied without a holiday calendar.
      if (rule.holiday && rule.days.size === 0) continue;
      const days = rule.days.size ? [...rule.days] : DAYS.map((_, i) => i);
      for (const day of days) {
        const spans = rule.off ? [] : rule.spans;
        week[day] = rule.additional ? [...week[day]!, ...spans] : [...spans];
      }
      understood = true;
    }
  }
  if (!understood) return null;

  return normalize(
    week.flatMap((spans, day) =>
      spans.map(([start, end]): [number, number] => [
        day * MINUTES_PER_DAY + start,
        day * MINUTES_PER_DAY + end,
      ]),
    ),
  );
}

/** Postgres int4multirange literal, e.g. "{[540,1260),[1980,2700)}". */
export const toMultirangeLiteral = (hours: WeeklyHours) =>
  `{${hours.map(([start, end]) => `[${start},${end})`).join(",")}}`;

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Minutes since Monday 00:00 in the given IANA time zone (UTC if the zone is unknown). */
export function minuteOfWeek(date: Date, timeZone: string): number {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return minuteOfWeek(date, "UTC");
  }
  const parts = Object.fromEntries(format.formatToParts(date).map((p) => [p.type, p.value]));
  const day = WEEKDAY_INDEX[parts.weekday ?? ""] ?? 0;
  return day * MINUTES_PER_DAY + (Number(parts.hour) % 24) * 60 + Number(parts.minute);
}

export interface OpenState {
  open: boolean;
  /** Minute of the week when it next opens or closes; null if it never changes. */
  changesAt: number | null;
  /** Minutes until that change. */
  changesIn: number | null;
}

export function openState(hours: WeeklyHours, now: number): OpenState {
  if (hours.length === 0) return { open: false, changesAt: null, changesIn: null };
  const first = hours[0]!;
  const last = hours.at(-1)!;
  if (first[0] === 0 && last[1] === MINUTES_PER_WEEK && hours.length === 1) {
    return { open: true, changesAt: null, changesIn: null };
  }

  const current = hours.find(([start, end]) => start <= now && now < end);
  if (current) {
    // An interval ending at the end of the week continues into Monday's first one.
    const closes =
      current[1] === MINUTES_PER_WEEK && first[0] === 0 ? MINUTES_PER_WEEK + first[1] : current[1];
    return { open: true, changesAt: closes % MINUTES_PER_WEEK, changesIn: closes - now };
  }

  const next = hours.find(([start]) => start > now);
  const opens = next ? next[0] : first[0] + MINUTES_PER_WEEK;
  return { open: false, changesAt: opens % MINUTES_PER_WEEK, changesIn: opens - now };
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "9 am", "9:30 pm", "12 pm" for a minute of the week. */
export function formatClock(minute: number): string {
  const inDay = minute % MINUTES_PER_DAY;
  const hour = Math.floor(inDay / 60);
  const mins = inDay % 60;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${mins ? `:${String(mins).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
}

/** Short status line, e.g. "Open · closes 9 pm" or "Closed · opens Mon 10 am". */
export function describeOpenState(state: OpenState, now: number): string {
  if (state.changesAt === null || state.changesIn === null) {
    return state.open ? "Open 24 hours" : "Closed";
  }
  const time = formatClock(state.changesAt);
  if (state.open) return state.changesIn <= 60 ? `Closes soon · ${time}` : `Open · closes ${time}`;

  const today = Math.floor(now / MINUTES_PER_DAY);
  const day = Math.floor(state.changesAt / MINUTES_PER_DAY);
  if (day === today && state.changesIn < MINUTES_PER_DAY) return `Closed · opens ${time}`;
  if (day === (today + 1) % 7 && state.changesIn < 2 * MINUTES_PER_DAY) {
    return `Closed · opens tomorrow ${time}`;
  }
  return `Closed · opens ${DAY_NAMES[day]} ${time}`;
}
