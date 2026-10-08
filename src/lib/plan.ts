import { isWeather, type Weather } from "~/stores/weather";
import { addDays, isDateStr, isTimeStr, minutesOf, timeOf, type DateStr, type TimeStr } from "./dates";
import { LATEST_START, plannedMinutes, sortItems, type PlanCard, type PlannedItem } from "./planDays";

/** Plan v2 (spec §4.4): any day, with start times. */
export interface DayEntry {
  sky?: Weather;
  skySource: "manual" | "auto";
  items: PlannedItem[];
}
export interface Plan {
  v: 2;
  days: Record<DateStr, DayEntry>;
  updatedAt: string;
}

export const PLAN_KEY = "swf.plan.v2";
export const PLAN_V1_KEY = "swf.plan.v1";
/** Past days stay visible read-only for this many days, then are pruned. */
export const KEEP_PAST_DAYS = 30;

export const emptyPlan = (): Plan => ({ v: 2, days: {}, updatedAt: new Date(0).toISOString() });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Reads anything claiming to be a v2 plan, keeping only valid parts: valid dates, times and (when
 * `known` is given) known activity ids, one entry per activity per day. Returns null if it isn't a plan.
 */
export function normalizePlan(raw: unknown, known?: (id: string) => boolean): Plan | null {
  if (!isObj(raw) || raw.v !== 2 || !isObj(raw.days)) return null;
  const days: Record<DateStr, DayEntry> = {};
  for (const [d, e] of Object.entries(raw.days)) {
    if (!isDateStr(d) || !isObj(e)) continue;
    const seen = new Set<string>();
    const items: PlannedItem[] = [];
    for (const it of Array.isArray(e.items) ? e.items : []) {
      if (!isObj(it) || typeof it.id !== "string" || !isTimeStr(it.start) || seen.has(it.id)) continue;
      if (known && !known(it.id)) continue;
      seen.add(it.id);
      items.push({ id: it.id, start: it.start });
    }
    const entry: DayEntry = { skySource: e.skySource === "auto" ? "auto" : "manual", items: sortItems(items) };
    if (isWeather(e.sky)) entry.sky = e.sky;
    if (entry.items.length || entry.sky) days[d] = entry;
  }
  return { v: 2, days, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString() };
}

/** Starts for items in display order: each at its suggested start, or after the previous one ends if they'd overlap. */
function sequence(ids: readonly string[], cards: ReadonlyMap<string, PlanCard>): PlannedItem[] {
  let prevEnd = 0;
  const out: PlannedItem[] = [];
  for (const id of ids) {
    const c = cards.get(id);
    if (!c || out.some((o) => o.id === id)) continue;
    const start = Math.min(Math.max(minutesOf(c.suggestedStart), prevEnd), minutesOf(LATEST_START));
    out.push({ id, start: timeOf(start) });
    prevEnd = start + plannedMinutes(c);
  }
  return out;
}

/**
 * Migrates a v1 weekend plan (spec §4.4): `sat` items on `weekendOf`, `sun` items on the next day,
 * each at its activity's suggested start, moved later to avoid overlaps; forecast becomes sky.
 */
export function migrateV1(raw: unknown, cards: ReadonlyMap<string, PlanCard>): Plan | null {
  if (!isObj(raw) || !isDateStr(raw.weekendOf) || !isObj(raw.days)) return null;
  const sat = raw.weekendOf;
  const days: Record<DateStr, DayEntry> = {};
  for (const [key, date] of [["sat", sat], ["sun", addDays(sat, 1)]] as const) {
    const day = raw.days[key];
    if (!isObj(day)) continue;
    const ids = Array.isArray(day.items) ? day.items.filter((x): x is string => typeof x === "string") : [];
    const entry: DayEntry = { skySource: "manual", items: sequence(ids, cards) };
    if (isWeather(day.forecast)) entry.sky = day.forecast;
    if (entry.items.length || entry.sky) days[date] = entry;
  }
  return { v: 2, days, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString() };
}

/** Converts a v1 weekend (from a share link) into dated days, as migration does. */
export function weekendToDays(sat: DateStr, sides: { sat?: { sky?: Weather; ids: string[] }; sun?: { sky?: Weather; ids: string[] } }, cards: ReadonlyMap<string, PlanCard>) {
  return migrateV1({ weekendOf: sat, days: { sat: { forecast: sides.sat?.sky, items: sides.sat?.ids ?? [] }, sun: { forecast: sides.sun?.sky, items: sides.sun?.ids ?? [] } } }, cards)?.days ?? {};
}

// ---- Edits. Each returns a new plan (never mutates) with updatedAt set. ----

const stamp = (p: Plan, days: Record<DateStr, DayEntry>): Plan => ({ v: 2, days, updatedAt: new Date().toISOString() });
const tidy = (e: DayEntry | undefined): DayEntry | undefined => (e && (e.items.length || e.sky) ? e : undefined);
function withDay(p: Plan, d: DateStr, f: (e: DayEntry) => DayEntry): Plan {
  const next = tidy(f(p.days[d] ?? { skySource: "manual", items: [] }));
  const days = { ...p.days };
  if (next) days[d] = { ...next, items: sortItems(next.items) };
  else delete days[d];
  return stamp(p, days);
}

export const hasItem = (p: Plan, d: DateStr, id: string) => !!p.days[d]?.items.some((it) => it.id === id);

/** Adds a plan; an activity is planned at most once per day, so adding it again changes nothing. */
export const addItem = (p: Plan, d: DateStr, id: string, start: TimeStr): Plan =>
  hasItem(p, d, id) ? p : withDay(p, d, (e) => ({ ...e, items: [...e.items, { id, start }] }));

export const removeItem = (p: Plan, d: DateStr, id: string): Plan => withDay(p, d, (e) => ({ ...e, items: e.items.filter((it) => it.id !== id) }));

export const setStart = (p: Plan, d: DateStr, id: string, start: TimeStr): Plan =>
  withDay(p, d, (e) => ({ ...e, items: e.items.map((it) => (it.id === id ? { ...it, start } : it)) }));

/** Moves a plan to another day, keeping its time unless a new one is given. No-op if it's already planned there. */
export function moveItem(p: Plan, from: DateStr, to: DateStr, id: string, start?: TimeStr): Plan {
  const it = p.days[from]?.items.find((x) => x.id === id);
  if (!it) return p;
  if (from === to) return start ? setStart(p, from, id, start) : p;
  if (hasItem(p, to, id)) return p;
  return addItem(removeItem(p, from, id), to, id, start ?? it.start);
}

/** Plan B swap: the backup takes the original's place and start time. */
/**
 * Swaps a planned item for its Plan B. The backup keeps the slot, but never starts before its own
 * suggested start (a rained-out 9:45am walk becomes a gallery visit at 10am, when it opens).
 */
export function swapItem(p: Plan, d: DateStr, fromId: string, toId: string, toStart?: string): Plan {
  if (hasItem(p, d, toId)) return p;
  const start = (s: string) => (toStart && toStart > s ? toStart : s);
  return withDay(p, d, (e) => ({ ...e, items: e.items.map((it) => (it.id === fromId ? { id: toId, start: start(it.start) } : it)) }));
}

export const setSky = (p: Plan, d: DateStr, sky: Weather | undefined): Plan =>
  withDay(p, d, (e) => {
    const next: DayEntry = { skySource: "manual", items: e.items };
    if (sky) next.sky = sky;
    return next;
  });

/** Drops days more than 30 days in the past (spec §4.4). */
export function prunePast(p: Plan, today: DateStr): Plan {
  const cutoff = addDays(today, -KEEP_PAST_DAYS);
  const stale = Object.keys(p.days).filter((d) => d < cutoff);
  if (!stale.length) return p;
  const days = { ...p.days };
  for (const d of stale) delete days[d];
  return { ...p, days };
}

/** Activities planned on any day from today onwards (sorting and Plan B use this). */
export function plannedIdsFrom(p: Plan, today: DateStr): Set<string> {
  return new Set(Object.entries(p.days).filter(([d]) => d >= today).flatMap(([, e]) => e.items.map((it) => it.id)));
}

/** Dates from today onwards on which an activity is planned, soonest first ("Planned · Sat 3 Oct"). */
export const datesPlanned = (p: Plan, id: string, today: DateStr): DateStr[] =>
  Object.keys(p.days).filter((d) => d >= today && p.days[d].items.some((it) => it.id === id)).sort();

/** The next planned days from today (Coming up, spec §3.3). */
export const upcomingDays = (p: Plan, today: DateStr, n = 5): DateStr[] =>
  Object.keys(p.days).filter((d) => d >= today && p.days[d].items.length).sort().slice(0, n);

/** Saving a shared plan (spec §3.4): merge adds items not already on that day, keeping their times; replace overwrites. */
export function saveShared(p: Plan, shared: Record<DateStr, DayEntry>, mode: "merge" | "replace"): Plan {
  const days = { ...p.days };
  for (const [d, s] of Object.entries(shared)) {
    const mine = days[d];
    if (mode === "replace" || !mine) {
      days[d] = { ...s, items: sortItems(s.items) };
      continue;
    }
    const add = s.items.filter((it) => !mine.items.some((m) => m.id === it.id));
    days[d] = { ...mine, sky: mine.sky ?? s.sky, items: sortItems([...mine.items, ...add]) };
    if (!days[d].sky) delete days[d].sky;
  }
  return stamp(p, days);
}

/** Days in a share that already have plans, so the recipient chooses merge or replace. */
export const conflictingDays = (p: Plan, shared: Record<DateStr, DayEntry>): DateStr[] =>
  Object.keys(shared).filter((d) => (p.days[d]?.items.length ?? 0) > 0).sort();
