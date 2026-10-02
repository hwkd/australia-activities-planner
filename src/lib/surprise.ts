import type { Weather } from "~/stores/weather";
import type { CardData } from "~/lib/content";

export interface SurprisePick<T> {
  card: T;
  /** True when nothing rated Perfect could be picked, so this is a Fine one (the UI says so). */
  fallback: boolean;
}

interface Options {
  /** Activities planned from today onwards: never picked. */
  planned?: ReadonlySet<string>;
  /** Earlier picks, oldest first; the last three aren't picked again while there's anything else. */
  recent?: readonly string[];
  /** 0 ≤ n < 1; injectable for tests. */
  random?: () => number;
}

/**
 * "Surprise me" (spec §11.5): one activity at random from the current results with fit 2, leaving
 * out planned activities and the last three picks. With nothing at fit 2 it picks from fit 1 and
 * flags `fallback`. If the last three picks were all there was, it allows them again (never the very
 * last one twice in a row). Null when every result is already planned.
 */
export function pickSurprise<T extends Pick<CardData, "id" | "weatherFit">>(results: readonly T[], weather: Weather, opts: Options = {}): SurprisePick<T> | null {
  const recent = opts.recent ?? [];
  const lastThree = new Set(recent.slice(-3));
  const last = recent[recent.length - 1];
  const open = results.filter((c) => !opts.planned?.has(c.id));
  for (const fit of [2, 1] as const) {
    const tier = open.filter((c) => c.weatherFit[weather] === fit);
    const pool = tier.filter((c) => !lastThree.has(c.id)).length ? tier.filter((c) => !lastThree.has(c.id)) : tier.filter((c) => c.id !== last);
    if (pool.length) return { card: pool[Math.min(pool.length - 1, Math.floor((opts.random ?? Math.random)() * pool.length))], fallback: fit === 1 };
  }
  return null;
}
