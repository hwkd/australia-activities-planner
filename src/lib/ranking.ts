import type { CardData } from "./content";
import type { Weather } from "~/stores/weather";

/** Discover filters (spec §3.1). */
export type GroupFilter = "any" | "date" | "friends" | "family" | "solo";
export type DurationFilter = "any" | "short" | "half" | "full";
export interface Filters {
  weather: Weather;
  group: GroupFilter;
  duration: DurationFilter;
  freeOnly: boolean;
  /** Accessibility filters (spec §11.6): only activities marked "yes" match. */
  pram?: boolean;
  stepFree?: boolean;
}
export const DEFAULT_FILTERS: Filters = { weather: "sunny", group: "any", duration: "any", freeOnly: false };

export function matchesDuration(c: Pick<CardData, "duration">, d: DurationFilter): boolean {
  const { minHours: lo, maxHours: hi } = c.duration;
  if (d === "short") return hi <= 3;
  if (d === "half") return lo <= 5 && hi >= 2;
  if (d === "full") return hi >= 5;
  return true;
}

interface RankOptions {
  /** Activities planned from today onwards; they sort after unplanned ones within a fit tier. */
  planned?: ReadonlySet<string>;
  /** Month (1–12) used for seasonal activities: today's, or the day being planned. */
  month?: number;
}

/**
 * Ranking (spec §6.1): filter, hide fit 0, then sort by fit (high first), in-season seasonal
 * activities first (spec §11.4, when the month is known), unplanned first, name A–Z.
 * Deterministic: the same inputs always give the same order.
 */
export function rank<T extends CardData>(cards: readonly T[], f: Filters, opts: RankOptions = {}): { shown: T[]; hidden: number } {
  const planned = opts.planned ?? new Set<string>();
  const inSeason = (c: T) => !!c.seasonal && opts.month !== undefined && c.seasonal.months.includes(opts.month);
  const pool = cards.filter(
    (c) =>
      (f.group === "any" || c.goodFor.includes(f.group)) &&
      (!f.freeOnly || c.cost === "Free") &&
      (!f.pram || c.access?.prams === "yes") &&
      (!f.stepFree || c.access?.stepFree === "yes") &&
      matchesDuration(c, f.duration) &&
      (!c.seasonal || opts.month === undefined || c.seasonal.months.includes(opts.month))
  );
  const shown = pool
    .filter((c) => c.weatherFit[f.weather] > 0)
    .sort(
      (a, b) =>
        b.weatherFit[f.weather] - a.weatherFit[f.weather] ||
        Number(inSeason(b)) - Number(inSeason(a)) ||
        Number(planned.has(a.id)) - Number(planned.has(b.id)) ||
        a.name.localeCompare(b.name, "en-AU")
    );
  return { shown, hidden: pool.length - shown.length };
}
