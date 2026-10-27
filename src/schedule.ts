/** Weekly schedule helpers. Day names and the transition shape follow zigbee2mqtt's `weekly_schedule`. */

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Day = (typeof DAYS)[number];

export interface Transition {
  /** Minutes after midnight. */
  time: number;
  setpoint: number;
}

export type WeekSchedule = Partial<Record<Day, Transition[]>>;

export interface Segment {
  start: number;
  end: number;
  /** null when the previous day isn't known yet. */
  setpoint: number | null;
}

/** The receiver stores "off" in a schedule as 1°C. */
export const isOff = (setpoint: number): boolean => setpoint <= 1;

/** Index into DAYS (Monday first) for a date. */
export const dayIndex = (d: Date): number => (d.getDay() + 6) % 7;

const sorted = (t: Transition[]): Transition[] => [...t].sort((a, b) => a.time - b.time);

/**
 * The receiver always holds six slots per day; unused ones repeat the previous setting.
 * Returns only the points where the setting actually changes.
 */
export function changes(t: Transition[]): Transition[] {
  const out: Transition[] = [];
  for (const x of sorted(t)) {
    if (!out.length || out[out.length - 1].setpoint !== x.setpoint) out.push(x);
  }
  return out;
}

/** What the day before ends on, which is what runs from midnight until the day's first change. */
function carryInto(week: WeekSchedule, day: number): number | null {
  const prev = week[DAYS[(day + 6) % 7]];
  if (!prev?.length) return null;
  const s = sorted(prev);
  return s[s.length - 1].setpoint;
}

/** Blocks covering 00:00–24:00 for one day, for drawing as a bar. Empty if the day isn't loaded. */
export function daySegments(week: WeekSchedule, day: number): Segment[] {
  const today = week[DAYS[day]];
  if (!today) return [];
  const segs: Segment[] = [];
  let start = 0;
  let setpoint = carryInto(week, day);
  for (const c of changes(today)) {
    if (c.time > start) segs.push({ start, end: c.time, setpoint });
    start = c.time;
    setpoint = c.setpoint;
  }
  segs.push({ start, end: 24 * 60, setpoint });
  // Merge neighbours with the same setting (e.g. yesterday ends "off" and today starts "off").
  return segs.reduce<Segment[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.setpoint === s.setpoint) last.end = s.end;
    else acc.push({ ...s });
    return acc;
  }, []);
}

/** The scheduled setpoint at a given minute of a day, or null if not known. */
export function setpointAt(week: WeekSchedule, day: number, minute: number): number | null {
  const today = week[DAYS[day]];
  if (!today) return null;
  let sp = carryInto(week, day);
  for (const x of sorted(today)) {
    if (x.time > minute) break;
    sp = x.setpoint;
  }
  return sp;
}

export interface NextChange {
  /** 0 = today, 1 = tomorrow, ... */
  dayOffset: number;
  time: number;
  setpoint: number;
}

/** When the schedule next switches to a different setting, looking up to a week ahead. */
export function nextChange(week: WeekSchedule, now: Date): NextChange | null {
  const day = dayIndex(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const current = setpointAt(week, day, minute);
  if (current === null) return null;
  for (let offset = 0; offset < 7; offset++) {
    const t = week[DAYS[(day + offset) % 7]];
    if (!t) return null;
    for (const x of sorted(t)) {
      if (offset === 0 && x.time <= minute) continue;
      if (x.setpoint !== current) return { dayOffset: offset, time: x.time, setpoint: x.setpoint };
    }
  }
  return null;
}

/** The receiver always holds this many slots per day. */
export const SLOTS = 6;

/**
 * Pads a day's change points to the receiver's six slots. A temporary change on the remote or the
 * panel lasts until the next slot of any kind, so the filler slots (which repeat the setting already
 * running) go 15 minutes after a real change, not in the middle of a long stretch. That way a
 * temporary change lasts until the next real change.
 */
export function padToSlots(points: Transition[]): Transition[] {
  const out = changes(points);
  for (let i = out.length - 1; i >= 0 && out.length < SLOTS; i--) {
    const t = out[i].time + 15;
    const next = out[i + 1]?.time ?? 24 * 60;
    if (t < next) out.splice(i + 1, 0, { time: t, setpoint: out[i].setpoint });
  }
  // Very full days: fall back to filling any gap of 30 minutes or more.
  while (out.length && out.length < SLOTS) {
    const i = out.findIndex((p, j) => (out[j + 1]?.time ?? 24 * 60) - p.time >= 30);
    if (i < 0) break;
    out.splice(i + 1, 0, { time: out[i].time + 15, setpoint: out[i].setpoint });
  }
  return out;
}

/** When the receiver next moves to a schedule slot of any kind (which ends a temporary change). */
export function nextSlot(week: WeekSchedule, now: Date): { dayOffset: number; time: number } | null {
  const day = dayIndex(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 7; offset++) {
    const t = week[DAYS[(day + offset) % 7]];
    if (!t) return null;
    const x = sorted(t).find((p) => offset > 0 || p.time > minute);
    if (x) return { dayOffset: offset, time: x.time };
  }
  return null;
}

/** "06:30", the 24-hour form zigbee2mqtt's weekly_schedule expects. */
export const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Same settings at the same times, ignoring the receiver's padding. */
export const sameDay = (a: Transition[] = [], b: Transition[] = []): boolean =>
  JSON.stringify(changes(a)) === JSON.stringify(changes(b));

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

/** "06:30" (or the user's local style) for minutes after midnight. */
export const timeText = (minutes: number): string =>
  timeFmt.format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60));

const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekdayLongFmt = new Intl.DateTimeFormat(undefined, { weekday: "long" });

/** Short day names, Monday first (1 Jan 2024 was a Monday). */
export const DAY_SHORT = DAYS.map((_, i) => weekdayFmt.format(new Date(2024, 0, 1 + i)));
export const DAY_LONG = DAYS.map((_, i) => weekdayLongFmt.format(new Date(2024, 0, 1 + i)));
