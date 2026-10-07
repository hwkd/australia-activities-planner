import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { activitySchema } from "~/content/schema";
import { toCard } from "./content";
import { rank, type DurationFilter, type GroupFilter } from "./ranking";
import type { Weather } from "~/stores/weather";
import golden from "../../tests/fixtures/ranking.json";

const cards = readdirSync("db/seed/activities").map((f) => toCard(activitySchema.parse(JSON.parse(readFileSync(`db/seed/activities/${f}`, "utf8")))));

// The prototype engine ranks its own copy of the first 29 activities, so the golden runs compare on
// those (every one shows in some combination); activities added since are ranked by the same rules.
const prototypeIds = new Set(golden.flatMap((g) => g.ids));
const prototypeCards = cards.filter((c) => prototypeIds.has(c.id));

describe("ranking (spec §6.1)", () => {
  it(`matches the prototype for all ${golden.length} filter combinations`, () => {
    expect(prototypeCards).toHaveLength(prototypeIds.size);
    for (const g of golden) {
      const r = rank(prototypeCards, { weather: g.weather as Weather, group: g.group as GroupFilter, duration: g.duration as DurationFilter, freeOnly: g.freeOnly });
      expect({ ids: r.shown.map((c) => c.id), hidden: r.hidden }, JSON.stringify(g).slice(0, 80)).toEqual({ ids: g.ids, hidden: g.hidden });
    }
  });
  it("AC 1: rainy hides every activity with rainy fit 0, and counts them", () => {
    const r = rank(cards, { weather: "rainy", group: "any", duration: "any", freeOnly: false });
    expect(r.shown.every((c) => c.weatherFit.rainy > 0)).toBe(true);
    expect(r.hidden).toBe(cards.filter((c) => c.weatherFit.rainy === 0).length);
  });
  it("AC 3: family shows only activities good for families", () => {
    expect(rank(cards, { weather: "sunny", group: "family", duration: "any", freeOnly: false }).shown.every((c) => c.goodFor.includes("family"))).toBe(true);
  });
  it("puts planned activities after unplanned ones in the same fit tier", () => {
    const base = rank(cards, { weather: "sunny", group: "any", duration: "any", freeOnly: false }).shown;
    const first = base[0];
    const withPlan = rank(cards, { weather: "sunny", group: "any", duration: "any", freeOnly: false }, { planned: new Set([first.id]) }).shown;
    expect(withPlan.indexOf(first)).toBeGreaterThan(0);
    expect(withPlan.filter((c) => c.weatherFit.sunny === 2).at(-1)).toBe(first);
  });
  it("access filters match only activities marked yes (spec §11.6)", () => {
    const withAccess = cards.map((c, i) => ({ ...c, access: i === 0 ? { prams: "yes", stepFree: "partial" } : i === 1 ? { prams: "partial", stepFree: "yes" } : undefined }) as typeof c);
    const all = { weather: "cloudy", group: "any", duration: "any", freeOnly: false } as const;
    const ids = (f: object) => rank(withAccess, { ...all, ...f }).shown.map((c) => c.id);
    const shownCloudy = (i: number) => withAccess[i].weatherFit.cloudy > 0;
    expect(ids({ pram: true })).toEqual(shownCloudy(0) ? [withAccess[0].id] : []);
    expect(ids({ stepFree: true })).toEqual(shownCloudy(1) ? [withAccess[1].id] : []);
    expect(ids({ pram: true, stepFree: true })).toEqual([]);
  });
  it("boosts in-season seasonal activities within their fit tier (spec §11.4)", () => {
    const all = { weather: "sunny", group: "any", duration: "any", freeOnly: false } as const;
    const tier = rank(cards, all, { month: 7 }).shown.filter((c) => c.weatherFit.sunny === 2);
    const last = tier.at(-1)!;
    const whales = cards.map((c) => (c.id === last.id ? { ...c, seasonal: { months: [6, 7, 8], note: "Whale season" } } : c));
    expect(rank(whales, all, { month: 7 }).shown[0].id).toBe(last.id);
    // Out of season it's filtered out; with no month it isn't boosted.
    expect(rank(whales, all, { month: 1 }).shown.map((c) => c.id)).not.toContain(last.id);
    expect(rank(whales, all).shown.filter((c) => c.weatherFit.sunny === 2).at(-1)!.id).toBe(last.id);
  });
});
