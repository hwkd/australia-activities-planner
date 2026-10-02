import { TZDate } from "@date-fns/tz";
import { lib } from "~/strings/en-AU/lib";
import { holidayOn } from "./holidays";

/**
 * Dates and times in Sydney (spec §6.4). Dates are "YYYY-MM-DD" strings, times "HH:MM" wall-clock strings.
 * Nothing here reads the device's own time zone.
 */
export const ZONE = "Australia/Sydney";
export type DateStr = string;
export type TimeStr = string;

const pad = (n: number) => String(n).padStart(2, "0");
export const toDateStr = (y: number, m: number, d: number): DateStr => `${y}-${pad(m)}-${pad(d)}`;
export const parts = (d: DateStr): [number, number, number] => d.split("-").map(Number) as [number, number, number];
export function isDateStr(v: unknown): v is DateStr {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = new Date(Date.UTC(...ymd0(v)));
  return toDateStr(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()) === v;
}
const ymd0 = (d: DateStr): [number, number, number] => { const [y, m, dd] = parts(d); return [y, m - 1, dd]; };
export const isTimeStr = (v: unknown): v is TimeStr => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Today's date in Sydney. `now` is injectable for tests. */
export function todayInSydney(now: Date = new Date()): DateStr {
  const t = new TZDate(now.getTime(), ZONE);
  return toDateStr(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

/** Calendar arithmetic on dates (time-zone independent). */
export function addDays(d: DateStr, n: number): DateStr {
  const t = new Date(Date.UTC(...ymd0(d)) + n * 86400000);
  return toDateStr(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
export const daysBetween = (a: DateStr, b: DateStr) => Math.round((Date.UTC(...ymd0(b)) - Date.UTC(...ymd0(a))) / 86400000);
/** 0 = Monday … 6 = Sunday (Australian week). */
export const weekday = (d: DateStr) => (new Date(Date.UTC(...ymd0(d))).getUTCDay() + 6) % 7;
export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
export const weekdayKey = (d: DateStr): WeekdayKey => WEEKDAY_KEYS[weekday(d)];
export const isWeekend = (d: DateStr) => weekday(d) >= 5;

export type DayType = "weekday" | "weekend" | "holiday";
/** Opal fares treat Friday, Saturday, Sunday and public holidays alike (spec §6.6); analytics wants weekend vs weekday vs holiday. */
export function dayType(d: DateStr): DayType {
  if (holidayOn(d)) return "holiday";
  return isWeekend(d) ? "weekend" : "weekday";
}

const DAY_NAMES = lib.dates.dayNames;
const MONTHS = lib.dates.monthNames;
export const monthName = (m: number) => MONTHS[m - 1];
/** "Sat 3 Oct" */
export const shortLabel = (d: DateStr) => { const [, m, dd] = parts(d); return lib.dates.shortLabel(DAY_NAMES[weekday(d)].slice(0, 3), dd, MONTHS[m - 1].slice(0, 3)); };
/** "Saturday 3 October" */
export const longLabel = (d: DateStr) => { const [, m, dd] = parts(d); return lib.dates.longLabel(DAY_NAMES[weekday(d)], dd, MONTHS[m - 1]); };
export const dayName = (d: DateStr) => DAY_NAMES[weekday(d)];

/** "Today", "Tomorrow", "This Saturday", "Next Saturday", "In 3 weeks", "Yesterday", "Past". */
export function relativeLabel(d: DateStr, today: DateStr): string {
  const n = daysBetween(today, d);
  if (n === 0) return lib.dates.today;
  if (n === 1) return lib.dates.tomorrow;
  if (n === -1) return lib.dates.yesterday;
  if (n < 0) return lib.dates.past;
  if (n < 7) return lib.dates.thisDay(dayName(d));
  if (n < 14) return lib.dates.nextDay(dayName(d));
  return lib.dates.inWeeks(Math.round(n / 7));
}

/** Month grid: weeks starting Monday, covering the whole month. `month` is "YYYY-MM". */
export function monthGrid(month: string): DateStr[][] {
  const [y, m] = month.split("-").map(Number);
  const first = toDateStr(y, m, 1);
  const start = addDays(first, -weekday(first));
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rows = Math.ceil((weekday(first) + daysIn) / 7);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c)));
}
export const monthOf = (d: DateStr) => d.slice(0, 7);
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}
/** The calendar runs from today's month to 6 months ahead (spec §6.4): the last day of that month. */
export function lastPlannableDate(today: DateStr): DateStr {
  const [y, m] = parts(addMonths(monthOf(today), 7) + "-01");
  return addDays(toDateStr(y, m, 1), -1);
}

// ---- Wall-clock times and real durations ----

export const minutesOf = (t: TimeStr) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const timeOf = (mins: number): TimeStr => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

/**
 * The instant a Sydney wall-clock time happens. A time that doesn't exist (the hour skipped when
 * daylight saving starts) moves to 3:00am, as the spec requires.
 */
export function instantOf(d: DateStr, t: TimeStr): TZDate {
  const [y, m, dd] = parts(d);
  const [h, mi] = t.split(":").map(Number);
  const z = new TZDate(y, m - 1, dd, h, mi, ZONE);
  if (z.getHours() !== h || z.getMinutes() !== mi) return new TZDate(y, m - 1, dd, 3, 0, ZONE);
  return z;
}
/** The wall-clock start actually used (moves a skipped-hour time to 03:00). */
export function effectiveStart(d: DateStr, t: TimeStr): TimeStr {
  const z = instantOf(d, t);
  return timeOf(z.getHours() * 60 + z.getMinutes());
}
/** Wall-clock end after `minutes` of real time, plus how many days later it ends. */
export function endOf(d: DateStr, t: TimeStr, minutes: number): { date: DateStr; time: TimeStr } {
  const z = new TZDate(instantOf(d, t).getTime() + minutes * 60000, ZONE);
  return { date: toDateStr(z.getFullYear(), z.getMonth() + 1, z.getDate()), time: timeOf(z.getHours() * 60 + z.getMinutes()) };
}

/** "8:30am", "1pm" */
export function clockLabel(t: TimeStr): string {
  const mins = minutesOf(t), h = Math.floor(mins / 60), m = mins % 60, h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? ":" + pad(m) : ""}${h < 12 ? lib.dates.am : lib.dates.pm}`;
}
