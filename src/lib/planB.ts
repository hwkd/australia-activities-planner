import type { Weather } from "~/stores/weather";
import type { DateStr } from "./dates";
import { runsOn, sortItems, type PlanCard, type PlannedItem } from "./planDays";

const COST_RANK = { Free: 0, $: 1, $$: 2, $$$: 3 } as const;
/** Indoor or outdoor, for "same category group": an activity that's great in the rain counts as indoor. */
const indoor = (c: PlanCard) => c.weatherFit.rainy === 2;

/** Spec §6.2 step 3. */
export function planBScore(c: PlanCard, x: PlanCard): number {
  return (
    (c.area === x.area ? 3 : 0) +
    (indoor(c) === indoor(x) ? 2 : 0) +
    (c.duration.minHours <= x.duration.maxHours && c.duration.maxHours >= x.duration.minHours ? 1 : 0) +
    (COST_RANK[c.cost] <= COST_RANK[x.cost] ? 1 : 0)
  );
}

/** Day-trip regions beyond greater Sydney: a Plan B there only for a plan already there. */
const AWAY = new Set(["newcastle", "illawarra"]);
const reachable = (c: PlanCard, x: PlanCard) => !AWAY.has(c.forecastArea ?? "") || c.forecastArea === x.forecastArea;

/** The best swap for `x` on day `d` under `sky`, from `pool` (spec §6.2 steps 1–4), or null. */
export function pickPlanB(x: PlanCard, d: DateStr, sky: Weather, pool: readonly PlanCard[], exclude: ReadonlySet<string>): PlanCard | null {
  const cands = pool.filter(
    (c) =>
      c.kind !== "event" &&
      !exclude.has(c.id) &&
      c.weatherFit[sky] === 2 &&
      runsOn(c, d) &&
      c.goodFor.some((g) => x.goodFor.includes(g)) &&
      reachable(c, x)
  );
  if (!cands.length) return null;
  return cands.sort((p, q) => planBScore(q, x) - planBScore(p, x) || p.name.localeCompare(q.name, "en-AU"))[0];
}

export interface DayPlan {
  sky?: Weather;
  items: PlannedItem[];
}

/**
 * Plan B for every planned item whose fit for its day's sky is 0, from today onwards (spec §6.2).
 * Keys are `date:id`; a null value means "Consider moving it to another day". Never stored:
 * recalculate whenever the plan or a day's sky changes.
 */
export function planBs(days: Readonly<Record<DateStr, DayPlan>>, cards: readonly PlanCard[], today: DateStr): Map<string, PlanCard | null> {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const upcoming = Object.keys(days).filter((d) => d >= today).sort();
  const used = new Set(upcoming.flatMap((d) => days[d].items.map((it) => it.id)));
  const out = new Map<string, PlanCard | null>();
  for (const d of upcoming) {
    const { sky, items } = days[d];
    if (!sky) continue;
    for (const it of sortItems(items)) {
      const x = byId.get(it.id);
      if (!x || x.weatherFit[sky] !== 0) continue;
      const b = pickPlanB(x, d, sky, cards, used);
      if (b) used.add(b.id);
      out.set(`${d}:${it.id}`, b);
    }
  }
  return out;
}
