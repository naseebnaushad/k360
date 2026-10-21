import { describe, expect, it } from "vitest";

import {
  MINUTES_PER_DAY as DAY,
  MINUTES_PER_WEEK as WEEK,
  describeOpenState,
  formatClock,
  minuteOfWeek,
  openState,
  parseOpeningHours,
  toMultirangeLiteral,
} from "./opening-hours";

const at = (day: number, hour: number, minute = 0) => day * DAY + hour * 60 + minute;
const MON = 0;
const SAT = 5;
const SUN = 6;

describe("parseOpeningHours", () => {
  it("parses every day with one span", () => {
    expect(parseOpeningHours("Mo-Su 09:00-21:00")).toHaveLength(7);
    expect(parseOpeningHours("Mo-Su 09:00-21:00")![0]).toEqual([at(MON, 9), at(MON, 21)]);
  });

  it("treats a missing day selector as every day", () => {
    expect(parseOpeningHours("11:00-23:00")).toEqual(parseOpeningHours("Mo-Su 11:00-23:00"));
  });

  it("parses 24/7 as always open", () => {
    expect(parseOpeningHours("24/7")).toEqual([[0, WEEK]]);
  });

  it("handles day lists, ranges and several spans", () => {
    const hours = parseOpeningHours("Mo-Sa 09:00-12:00,13:30-18:30; Su 09:00-17:00; PH closed")!;
    expect(hours).toContainEqual([at(MON, 9), at(MON, 12)]);
    expect(hours).toContainEqual([at(MON, 13, 30), at(MON, 18, 30)]);
    expect(hours).toContainEqual([at(SUN, 9), at(SUN, 17)]);
    expect(hours).toHaveLength(13);
  });

  it("handles spaces in lists and spans", () => {
    expect(parseOpeningHours("Mo, Tu, Fr-Su 12:00-00:00")).toHaveLength(5);
    expect(parseOpeningHours("07:00- 23:59")![0]).toEqual([at(MON, 7), at(MON, 23, 59)]);
  });

  it("runs spans past midnight into the next day, wrapping Sunday into Monday", () => {
    const hours = parseOpeningHours("Su 18:00-02:00")!;
    expect(hours).toEqual([
      [0, 120],
      [at(SUN, 18), WEEK],
    ]);
    expect(parseOpeningHours("Mo-Su 12:00-24:00")![0]).toEqual([at(MON, 12), at(MON, 24)]);
  });

  it("lets later rules replace earlier ones for their days", () => {
    const hours = parseOpeningHours("Mo-Su 09:00-21:00; Su off")!;
    expect(hours).toHaveLength(6);
    expect(openState(hours, at(SUN, 12)).open).toBe(false);
  });

  it("adds comma-separated rules instead of replacing", () => {
    const hours = parseOpeningHours("Mo-Su 12:30-15:30, Mo-Su 19:00-22:30")!;
    expect(hours).toContainEqual([at(MON, 12, 30), at(MON, 15, 30)]);
    expect(hours).toContainEqual([at(MON, 19), at(MON, 22, 30)]);
  });

  it("ignores public holidays", () => {
    expect(parseOpeningHours("PH,Mo-Su 08:00-23:00")).toEqual(
      parseOpeningHours("Mo-Su 08:00-23:00"),
    );
    expect(parseOpeningHours("Mo-Su,PH 11:00-22:00")).toEqual(
      parseOpeningHours("Mo-Su 11:00-22:00"),
    );
  });

  it("accepts an open-ended '+' as the given time", () => {
    expect(parseOpeningHours("Mo-Su 08:00-18:00+")).toEqual(parseOpeningHours("Mo-Su 08:00-18:00"));
  });

  it.each([
    "",
    "permanently closed",
    "sunrise-sunset",
    "12:30AM onwards",
    "09:00 - 22:00 Sun - Sat",
    "saturday and sunday (6am to 7pm)",
    "Jan-Mar Mo 09:00-12:00",
    "Mo-Fr",
    "Xx 09:00-10:00",
    "Mo 25:00-26:00",
    "Mo 09:60-10:00",
    "PH off",
  ])("returns null for %j rather than guessing", (text) => {
    expect(parseOpeningHours(text)).toBeNull();
  });

  it("parses an explicitly closed week as never open", () => {
    expect(parseOpeningHours("Mo-Su off")).toEqual([]);
  });
});

describe("toMultirangeLiteral", () => {
  it("formats intervals for Postgres", () => {
    expect(toMultirangeLiteral([[540, 1260]])).toBe("{[540,1260)}");
    expect(toMultirangeLiteral([])).toBe("{}");
  });
});

describe("minuteOfWeek", () => {
  it("uses the city's time zone", () => {
    // Monday 2026-10-19 03:30 UTC is 09:00 in Kochi.
    const date = new Date("2026-10-19T03:30:00Z");
    expect(minuteOfWeek(date, "Asia/Kolkata")).toBe(at(MON, 9));
    expect(minuteOfWeek(date, "UTC")).toBe(at(MON, 3, 30));
  });

  it("falls back to UTC for an unknown zone", () => {
    const date = new Date("2026-10-19T03:30:00Z");
    expect(minuteOfWeek(date, "Not/AZone")).toBe(at(MON, 3, 30));
  });
});

describe("openState and describeOpenState", () => {
  const hours = parseOpeningHours("Mo-Sa 09:00-21:00")!;
  const describe_ = (now: number) => describeOpenState(openState(hours, now), now);

  it("describes open and closing soon", () => {
    expect(describe_(at(MON, 12))).toBe("Open · closes 9 pm");
    expect(describe_(at(MON, 20, 30))).toBe("Closes soon · 9 pm");
  });

  it("describes when it opens next", () => {
    expect(describe_(at(MON, 7))).toBe("Closed · opens 9 am");
    expect(describe_(at(MON, 22))).toBe("Closed · opens tomorrow 9 am");
    expect(describe_(at(SAT, 22))).toBe("Closed · opens Mon 9 am");
  });

  it("treats a span over the week boundary as one", () => {
    const late = parseOpeningHours("Mo-Su 18:00-02:00")!;
    expect(openState(late, at(SUN, 23))).toEqual({ open: true, changesAt: 120, changesIn: 180 });
  });

  it("describes always open and never open", () => {
    const always = parseOpeningHours("24/7")!;
    expect(describeOpenState(openState(always, 100), 100)).toBe("Open 24 hours");
    expect(describeOpenState(openState([], 100), 100)).toBe("Closed");
  });

  it("formats clock times", () => {
    expect(formatClock(at(MON, 0))).toBe("12 am");
    expect(formatClock(at(MON, 12, 30))).toBe("12:30 pm");
    expect(formatClock(at(SUN, 23, 5))).toBe("11:05 pm");
  });
});
