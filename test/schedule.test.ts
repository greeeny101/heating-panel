import { describe, expect, it } from "vitest";
import {
  SLOTS,
  changes,
  daySegments,
  hhmm,
  nextChange,
  nextSlot,
  padToSlots,
  sameDay,
  setpointAt,
  type Transition,
  type WeekSchedule,
} from "../src/schedule";

const t = (h: number, m: number, setpoint: number): Transition => ({ time: h * 60 + m, setpoint });
const DAY = [t(6, 30, 19), t(8, 0, 1), t(17, 0, 20), t(22, 0, 1)];
const everyDay = (day: Transition[]): WeekSchedule => ({
  monday: day,
  tuesday: day,
  wednesday: day,
  thursday: day,
  friday: day,
  saturday: day,
  sunday: day,
});
// Friday 9 October 2026, local time.
const friday = (h: number, m: number) => new Date(2026, 9, 9, h, m);

describe("changes", () => {
  it("sorts and drops slots that repeat the setting before them", () => {
    expect(changes([t(8, 0, 1), t(6, 30, 19), t(6, 45, 19), t(8, 15, 1)])).toEqual([t(6, 30, 19), t(8, 0, 1)]);
  });
});

describe("setpointAt", () => {
  const week = everyDay(DAY);

  it("follows the day's changes", () => {
    expect(setpointAt(week, 0, 7 * 60)).toBe(19);
    expect(setpointAt(week, 0, 8 * 60)).toBe(1);
    expect(setpointAt(week, 0, 18 * 60)).toBe(20);
  });

  it("runs the day before's last setting until the first change", () => {
    const w: WeekSchedule = { ...week, sunday: [t(6, 0, 21)], monday: DAY };
    expect(setpointAt(w, 0, 3 * 60)).toBe(21);
  });

  it("is null for a day that hasn't loaded", () => {
    expect(setpointAt({}, 2, 600)).toBeNull();
  });
});

describe("daySegments", () => {
  it("covers the whole day and merges neighbours with the same setting", () => {
    const segs = daySegments(everyDay(DAY), 1);
    expect(segs[0]).toEqual({ start: 0, end: 390, setpoint: 1 });
    expect(segs[segs.length - 1]).toEqual({ start: 22 * 60, end: 24 * 60, setpoint: 1 });
    expect(segs.map((s) => s.setpoint)).toEqual([1, 19, 1, 20, 1]);
    for (let i = 1; i < segs.length; i++) expect(segs[i].start).toBe(segs[i - 1].end);
  });

  it("is empty for a day that hasn't loaded", () => {
    expect(daySegments({}, 0)).toEqual([]);
  });
});

describe("nextChange", () => {
  it("ignores padding slots that repeat the current setting", () => {
    const week = everyDay(padToSlots(DAY));
    expect(nextChange(week, friday(7, 0))).toEqual({ dayOffset: 0, time: 8 * 60, setpoint: 1 });
  });

  it("looks into tomorrow after the last change of the day", () => {
    expect(nextChange(everyDay(DAY), friday(23, 0))).toEqual({ dayOffset: 1, time: 390, setpoint: 19 });
  });
});

describe("nextSlot", () => {
  it("finds the next slot of any kind, padding included (it ends a temporary change)", () => {
    const week = everyDay(padToSlots(DAY));
    // Slots: 06:30 08:00 17:00 17:15 22:00 22:15.
    expect(nextSlot(week, friday(17, 5))).toEqual({ dayOffset: 0, time: 17 * 60 + 15 });
  });
});

describe("padToSlots", () => {
  it("always gives the receiver its six slots without changing the day", () => {
    const padded = padToSlots(DAY);
    expect(padded).toHaveLength(SLOTS);
    expect(sameDay(padded, DAY)).toBe(true);
  });

  it("puts padding 15 minutes after a real change, so a temporary change lasts until the next real one", () => {
    const padded = padToSlots(DAY);
    const fillers = padded.filter((p) => !DAY.some((d) => d.time === p.time));
    for (const f of fillers) expect(DAY.some((d) => f.time === d.time + 15 && f.setpoint === d.setpoint)).toBe(true);
  });

  it("leaves a full day alone", () => {
    const full = [t(5, 0, 18), t(7, 0, 1), t(12, 0, 19), t(13, 0, 1), t(17, 0, 20), t(22, 0, 1)];
    expect(padToSlots(full)).toEqual(full);
  });

  it("pads a day with a single setting", () => {
    expect(padToSlots([t(0, 0, 1)])).toHaveLength(SLOTS);
  });
});

describe("hhmm and sameDay", () => {
  it("formats times as zigbee2mqtt expects", () => {
    expect(hhmm(390)).toBe("06:30");
    expect(hhmm(0)).toBe("00:00");
    expect(hhmm(23 * 60 + 45)).toBe("23:45");
  });

  it("treats a padded day and its plain form as the same", () => {
    expect(sameDay(padToSlots(DAY), DAY)).toBe(true);
    expect(sameDay(DAY, [t(6, 30, 19)])).toBe(false);
  });
});
