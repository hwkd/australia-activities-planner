import { lib } from "~/strings/en-AU/lib";
import type { CardData } from "./content";
import type { EventCard } from "./events";

/** Only the hours matter for timing. */
export type Timed = { duration: { minHours: number; maxHours: number } };
import { instantOf, effectiveStart, endOf, minutesOf, shortLabel, timeOf, weekdayKey, type DateStr, type TimeStr, type WeekdayKey } from "./dates";

/**
 * What planning needs to know about an activity or an event (spec §11.4). Events add the dates
 * they're on and their official link; they plan like activities but are never a Plan B.
 */
export type PlanCard = Pick<CardData, "id" | "name" | "area" | "category" | "weatherFit" | "goodFor" | "duration" | "cost" | "days" | "suggestedStart" | "forecastArea" | "location"> & {
  kind?: "event";
  dates?: { from: DateStr; to: DateStr };
  link?: { label: string; url: string };
  activityId?: string;
};

/** The compact index islands get for planning (names, fits, days it runs, forecast area). */
export const toPlanCard = (c: CardData | EventCard): PlanCard => {
  const { id, name, area, category, weatherFit, goodFor, duration, cost, suggestedStart, forecastArea, location } = c;
  const base: PlanCard = { id, name, area, category, weatherFit, goodFor, duration, cost, suggestedStart, forecastArea, location };
  if ("kind" in c) return { ...base, kind: "event", dates: c.dates, link: c.link, ...(c.activityId ? { activityId: c.activityId } : {}) };
  return { ...base, days: c.days };
};

export interface PlannedItem {
  id: string;
  /** HH:MM, Sydney wall-clock time. */
  start: TimeStr;
}

/** Earliest and latest start for the ±30 min controls (spec §6.7). */
export const EARLIEST_START = "06:00";
export const LATEST_START = "22:00";
export const NUDGE_MINUTES = 30;

/**
 * How long a planned item lasts (spec §4.4): the midpoint of minHours and maxHours rounded to the
 * nearest half hour, or minHours for full-day activities (maxHours of 6 or more).
 */
export function plannedHours(c: Timed): number {
  const { minHours, maxHours } = c.duration;
  if (maxHours >= 6) return minHours;
  return Math.round(minHours + maxHours) / 2;
}
export const plannedMinutes = (c: Timed) => Math.round(plannedHours(c) * 60);

/** "2 hrs", "1 hr", "2.5 hrs" */
export const durationLabel = (c: Timed) => {
  return lib.planDays.duration(plannedHours(c));
};

/**
 * Whether it's on that date: `days` (weekdays it runs, spec §4.1; none means every day) and, for an
 * event, its dates (spec §11.4).
 */
export const runsOn = (c: Pick<PlanCard, "days" | "dates">, d: DateStr) =>
  (!c.days || c.days.includes(weekdayKey(d))) && (!c.dates || (d >= c.dates.from && d <= c.dates.to));

/** "Carriageworks runs on Saturdays only." or "Vivid is on Fri 22 May – Sat 13 Jun only." */
const closedText = (c: Pick<PlanCard, "name" | "days" | "dates">, pickAnother: boolean) =>
  c.dates
    ? (pickAnother ? lib.events.onOnlyPickAnother : lib.events.onOnly)(c.name, c.dates.from === c.dates.to ? shortLabel(c.dates.from) : lib.events.range(shortLabel(c.dates.from), shortLabel(c.dates.to)))
    : (pickAnother ? lib.planDays.runsOnlyOnPickAnother : lib.planDays.runsOnlyOn)(c.name, onlyDaysLabel(c.days ?? []));

const PLURAL: Record<WeekdayKey, string> = lib.planDays.pluralDays;
/** "Saturdays", "Saturdays and Sundays", "Fridays, Saturdays and Sundays" */
export function onlyDaysLabel(days: readonly WeekdayKey[]): string {
  const names = days.map((k) => PLURAL[k]);
  return names.length <= 1 ? (names[0] ?? "") : lib.planDays.listDays(names.slice(0, -1), names.at(-1)!);
}

export interface Span {
  /** The start actually used (a skipped-hour start moves to 03:00). */
  start: TimeStr;
  end: { date: DateStr; time: TimeStr };
  startMs: number;
  endMs: number;
}
/** Start and end of an item on a date, in real time (so it keeps its length across a daylight-saving change). */
export function spanOf(d: DateStr, item: PlannedItem, c: Timed): Span {
  const mins = plannedMinutes(c);
  const startMs = instantOf(d, item.start).getTime();
  return { start: effectiveStart(d, item.start), end: endOf(d, item.start, mins), startMs, endMs: startMs + mins * 60000 };
}

/** A day's items in start-time order (spec §6.7); ties keep their stored order. */
export const sortItems = <T extends PlannedItem>(items: readonly T[]): T[] =>
  items.map((it, i) => [it, i] as const).sort((a, b) => minutesOf(a[0].start) - minutesOf(b[0].start) || a[1] - b[1]).map(([it]) => it);

export type ItemWarning =
  | { kind: "closed"; text: string }
  | { kind: "overlap"; withId: string; text: string };

export interface DayItem {
  item: PlannedItem;
  card: PlanCard;
  span: Span;
  /** Activities on this day whose time overlaps this one. */
  overlapsWith: string[];
  runs: boolean;
  /** The row shown under the plan: closed days first, then the first overlap. */
  warning: ItemWarning | null;
}

/** Times, overlaps and closed-day warnings for one day (spec §3.3, §6.7). Unknown ids are skipped. */
export function dayItems(d: DateStr, items: readonly PlannedItem[], cards: ReadonlyMap<string, PlanCard>): DayItem[] {
  const rows = sortItems(items)
    .filter((it) => cards.has(it.id))
    .map((item) => {
      const card = cards.get(item.id)!;
      return { item, card, span: spanOf(d, item, card) };
    });
  return rows.map((r) => {
    const overlapsWith = rows.filter((o) => o !== r && o.span.startMs < r.span.endMs && o.span.endMs > r.span.startMs).map((o) => o.card.id);
    const runs = runsOn(r.card, d);
    let warning: ItemWarning | null = null;
    if (!runs) warning = { kind: "closed", text: closedText(r.card, false) };
    else if (overlapsWith.length) {
      const other = cards.get(overlapsWith[0])!;
      warning = { kind: "overlap", withId: other.id, text: lib.planDays.overlapsWith(other.name) };
    }
    return { ...r, overlapsWith, runs, warning };
  });
}

/**
 * The checks shown in Add to a day before confirming (spec §3.3): a closed day blocks, an overlap
 * doesn't. `ignoreId` leaves out the item being edited.
 */
export function checkAdd(
  d: DateStr,
  start: TimeStr,
  card: PlanCard,
  items: readonly PlannedItem[],
  cards: ReadonlyMap<string, PlanCard>,
  ignoreId?: string
): { blocked: boolean; alreadyPlanned: boolean; closed: string | null; overlap: { id: string; text: string } | null } {
  const alreadyPlanned = ignoreId !== card.id && items.some((it) => it.id === card.id);
  const closed = runsOn(card, d) ? null : closedText(card, true);
  const mine = spanOf(d, { id: card.id, start }, card);
  const clash = sortItems(items).find((o) => {
    if (o.id === card.id || o.id === ignoreId) return false;
    const c = cards.get(o.id);
    if (!c) return false;
    const s = spanOf(d, o, c);
    return s.startMs < mine.endMs && s.endMs > mine.startMs;
  });
  const overlap = clash ? { id: clash.id, text: lib.planDays.overlapsWithCanAdd(cards.get(clash.id)!.name, clockShort(effectiveStart(d, clash.start))) } : null;
  return { blocked: !!closed, alreadyPlanned, closed, overlap };
}
const clockShort = (t: TimeStr) => {
  const m = minutesOf(t), h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}${mm ? ":" + String(mm).padStart(2, "0") : ""}${h < 12 ? lib.dates.am : lib.dates.pm}`;
};

/** The start after a ±30 min nudge, or null when it would leave 6:00am–10:00pm (spec §6.7). */
export function nudge(start: TimeStr, delta: number): TimeStr | null {
  const next = minutesOf(start) + delta;
  return next < minutesOf(EARLIEST_START) || next > minutesOf(LATEST_START) ? null : timeOf(next);
}

/** Time presets in Add to a day (spec §3.3). */
export const TIME_PRESETS = [
  { key: "morning", label: lib.planDays.timePresets.morning, time: "09:00" },
  { key: "midday", label: lib.planDays.timePresets.midday, time: "12:00" },
  { key: "afternoon", label: lib.planDays.timePresets.afternoon, time: "14:00" },
  { key: "evening", label: lib.planDays.timePresets.evening, time: "18:00" },
] as const;
