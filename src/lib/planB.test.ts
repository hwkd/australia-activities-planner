import { describe, expect, it } from "vitest";
import { card, cards } from "../../tests/unit/cards";
import { planBs } from "./planB";
import type { Weather } from "~/stores/weather";
import golden from "../../tests/fixtures/planb.json";

const SAT = "2026-10-03";

describe("Plan B (spec §6.2)", () => {
  it(`matches the prototype for ${golden.length} single-plan cases`, () => {
    for (const g of golden) {
      const r = planBs({ [SAT]: { sky: g.weather as Weather, items: [{ id: g.id, start: "09:00" }] } }, cards, SAT);
      expect(r.get(`${SAT}:${g.id}`)?.id ?? null, g.id).toBe(g.backup);
    }
  });
  it("AC 6: suggests only for fit 0, with a backup that's great in that sky and shares a group", () => {
    const r = planBs({ [SAT]: { sky: "rainy", items: [{ id: "bondi-coogee", start: "09:00" }, { id: "agnsw", start: "14:00" }] } }, cards, SAT);
    expect([...r.keys()]).toEqual([`${SAT}:bondi-coogee`]);
    const b = r.get(`${SAT}:bondi-coogee`)!;
    expect(b.weatherFit.rainy).toBe(2);
    expect(b.id).not.toBe("agnsw"); // already planned
    expect(b.goodFor.some((g) => card("bondi-coogee").goodFor.includes(g))).toBe(true);
  });
  it("AC 7: never suggests the same backup twice, in date then time order", () => {
    const r = planBs(
      {
        "2026-10-10": { sky: "rainy", items: [{ id: "spit-manly", start: "09:00" }] },
        [SAT]: { sky: "rainy", items: [{ id: "wentworth", start: "13:00" }, { id: "bondi-coogee", start: "08:00" }] },
      },
      cards,
      SAT
    );
    const ids = [...r.values()].map((c) => c?.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...r.keys()]).toEqual([`${SAT}:bondi-coogee`, `${SAT}:wentworth`, "2026-10-10:spit-manly"]);
    expect(r.get(`${SAT}:bondi-coogee`)?.id).toBe("agnsw");
  });
  it("skips days without a sky and past days; respects days it runs", () => {
    expect(planBs({ [SAT]: { items: [{ id: "bondi-coogee", start: "09:00" }] } }, cards, SAT).size).toBe(0);
    expect(planBs({ "2026-09-26": { sky: "rainy", items: [{ id: "bondi-coogee", start: "09:00" }] } }, cards, SAT).size).toBe(0);
    const sun = planBs({ "2026-10-04": { sky: "rainy", items: [{ id: "bondi-coogee", start: "09:00" }] } }, cards, SAT);
    expect(sun.get("2026-10-04:bondi-coogee")?.id).not.toBe("carriageworks");
  });
});
