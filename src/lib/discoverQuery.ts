import { isWeather, type Weather } from "~/stores/weather";
import { lib } from "~/strings/en-AU/lib";
import { isDateStr, type DateStr } from "./dates";
import type { DurationFilter, GroupFilter } from "./ranking";

/** The Discover filters other than the weather (which has its own store). */
export interface FilterState {
  group: GroupFilter;
  duration: DurationFilter;
  freeOnly: boolean;
  /** Pram-friendly and Step-free (spec §11.6). */
  pram: boolean;
  stepFree: boolean;
}
export const DEFAULT_FILTER_STATE: FilterState = { group: "any", duration: "any", freeOnly: false, pram: false, stepFree: false };

export const GROUPS: readonly { key: GroupFilter; label: string }[] = [
  { key: "any", label: lib.discoverQuery.groups.any },
  { key: "date", label: lib.discoverQuery.groups.date },
  { key: "friends", label: lib.discoverQuery.groups.friends },
  { key: "family", label: lib.discoverQuery.groups.family },
  { key: "solo", label: lib.discoverQuery.groups.solo },
];
export const DURATIONS: readonly { key: DurationFilter; label: string }[] = [
  { key: "any", label: lib.discoverQuery.durations.any },
  { key: "short", label: lib.discoverQuery.durations.short },
  { key: "half", label: lib.discoverQuery.durations.half },
  { key: "full", label: lib.discoverQuery.durations.full },
];
const isGroup = (v: unknown): v is GroupFilter => GROUPS.some((g) => g.key === v);
const isDuration = (v: unknown): v is DurationFilter => DURATIONS.some((d) => d.key === v);

export function normalizeFilters(raw: unknown): FilterState {
  const r = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  return {
    group: isGroup(r.group) ? r.group : "any",
    duration: isDuration(r.duration) ? r.duration : "any",
    freeOnly: r.freeOnly === true,
    pram: r.pram === true,
    stepFree: r.stepFree === true,
  };
}

export interface DiscoverQuery {
  weather?: Weather;
  /** Present when the URL describes a Discover view; missing filters then mean their defaults. */
  filters?: FilterState;
  /** The day being planned, when Discover was opened from a day in My plans. */
  day?: DateStr;
}

/**
 * Reads `?w=rainy&g=family&free=1&d=half&pram=1&step=1&day=2026-10-07` (spec §3.1, §11.6). A query with any Discover
 * parameter is the whole view; with none, the saved filters apply.
 */
export function parseDiscoverQuery(search: string): DiscoverQuery {
  const q = new URLSearchParams(search);
  const out: DiscoverQuery = {};
  const w = q.get("w");
  if (isWeather(w)) out.weather = w;
  if (["w", "g", "d", "free", "pram", "step"].some((k) => q.has(k))) {
    out.filters = {
      group: isGroup(q.get("g")) ? (q.get("g") as GroupFilter) : "any",
      duration: isDuration(q.get("d")) ? (q.get("d") as DurationFilter) : "any",
      freeOnly: q.get("free") === "1",
      pram: q.get("pram") === "1",
      stepFree: q.get("step") === "1",
    };
  }
  const day = q.get("day");
  if (isDateStr(day)) out.day = day;
  return out;
}

/** The query for a view: the weather always (so the link is a complete view), other filters only when set. */
export function discoverQuery(weather: Weather, f: FilterState, day?: DateStr | null): string {
  const q = new URLSearchParams({ w: weather });
  if (f.group !== "any") q.set("g", f.group);
  if (f.freeOnly) q.set("free", "1");
  if (f.duration !== "any") q.set("d", f.duration);
  if (f.pram) q.set("pram", "1");
  if (f.stepFree) q.set("step", "1");
  if (day) q.set("day", day);
  return `?${q}`;
}
