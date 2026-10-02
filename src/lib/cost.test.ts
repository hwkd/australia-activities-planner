import { describe, expect, it } from "vitest";
import { activities } from "../../tests/unit/cards";
import { capFor, estimate, money, tripFare, type Money } from "./cost";
import { changesLabel } from "./route";
import golden from "../../tests/fixtures/cost.json";

const byId = new Map(activities.map((a) => [a.id, a]));
const parse = (v: string): Money => {
  if (v === "Free") return [0, 0];
  const m = v.replace(/\$/g, "").split("–").map(Number);
  return [m[0], m[1] ?? m[0]];
};
// Since D14 there's one trip, from Central, by public transport: only those prototype cases still apply.
// The prototype's numbers are a snapshot of the draft content. Activities whose entry prices or cost
// labels were corrected when they were verified (docs/activity-verification.md, 2 Oct 2026) no longer
// match it, so they're left out; trip times and changes are content, checked against the Trip Planner.
const reverified = new Set(["opera-tour", "taronga", "icebergs", "sea-life", "featherdale", "aus-museum", "north-head"]);
const cases = golden.filter((g) => g.origin === "central" && g.mode === "pt" && !reverified.has(g.id));

describe("trip and cost against the prototype (public transport from Central)", () => {
  it(`matches labels exactly and amounts within $2 for ${cases.length} cases`, () => {
    expect(cases.length).toBeGreaterThan(80);
    let exact = 0;
    for (const g of cases) {
      const a = byId.get(g.id)!;
      const ctx = `${g.id} ${g.adults}+${g.kids}`;
      if (a.routes.pt.fare[1] > 0) expect(tripFare(a.routes.pt).label, ctx).toBe(g.costLabel);
      const e = estimate({ activity: a, adults: g.adults, kids: g.kids });
      expect(e.lines.map((l) => l.label), ctx).toEqual(g.lines.map((l) => l.label));
      e.lines.forEach((l, i) => {
        const want = parse(g.lines[i].value);
        expect(Math.abs(l.value[0] - want[0]) <= 2 && Math.abs(l.value[1] - want[1]) <= 2, `${ctx} ${l.label} ${money(l.value)} vs ${g.lines[i].value}`).toBe(true);
      });
      if (e.totalLabel === g.sum) exact++;
    }
    // The prototype rounds at every step; the spec rounds once. Most totals are identical.
    expect(exact / cases.length).toBeGreaterThan(0.9);
  });
});

describe("the fare in Getting there (spec §3.2 item 4)", () => {
  it("is the adult fare from the city each way, with any ferry not on Opal", () => {
    expect(tripFare(byId.get("bondi-coogee")!.routes.pt)).toEqual({ label: "$4–6 each way", note: "Adult Opal fare from the city, est." });
    expect(tripFare(byId.get("royal-np")!.routes.pt).note).toBe("Adult fare from the city, est. Includes $9.40 ferry, not on Opal");
    expect(tripFare(byId.get("chinatown")!.routes.pt).label).toBe("Free");
    expect(changesLabel(0)).toBe("Direct");
    expect(changesLabel(2)).toBe("2 changes");
  });
});

describe("Opal caps by day (spec §6.6, AC 28)", () => {
  it("weekend rate on Fri–Sun and public holidays, weekday rate Mon–Thu", () => {
    expect(capFor("2026-10-05")).toMatchObject({ kind: "weekend", holiday: "Labour Day", adult: 9.65 }); // Monday holiday
    expect(capFor("2026-10-07")).toMatchObject({ kind: "weekday", adult: 19.3, child: 9.65 }); // Wednesday
    expect(capFor("2026-10-09").kind).toBe("weekend"); // Friday
    expect(capFor("2026-10-10").kind).toBe("weekend");
    expect(capFor()).toMatchObject({ kind: "weekend", assumed: true });
  });
  it("a long trip costs more on a Wednesday than on Labour Day", () => {
    const a = byId.get("three-sisters")!;
    const wed = estimate({ activity: a, adults: 2, kids: 0, date: "2026-10-07" });
    const hol = estimate({ activity: a, adults: 2, kids: 0, date: "2026-10-05" });
    expect(hol.lines[0].value[1]).toBe(Math.round(9.65 * 2));
    expect(wed.lines[0].value[1]).toBeGreaterThan(hol.lines[0].value[1]);
    expect(wed.lines[0].note).not.toContain("weekend cap"); // under the $19.30 weekday cap, so no cap note
    expect(hol.lines[0].note).toContain("weekend cap");
    expect(wed.fareNote).toMatch(/peak/);
    expect(hol.fareNote).toContain("Labour Day");
  });
});

describe("AC 18: estimate arithmetic", () => {
  const a = byId.get("royal-np")!;
  it("Family on Bondi to Coogee: 2 × min(adult return, cap) + 2 × min(child return, cap), from the city centre", () => {
    const b = byId.get("bondi-coogee")!;
    const f = b.routes.pt.fare;
    const e = estimate({ activity: b, adults: 2, kids: 2 });
    const end = (i: 0 | 1) => Math.round(2 * Math.min(f[i] * 2, 9.65) + 2 * Math.min(f[i], 4.8));
    expect(e.lines[0].value).toEqual([end(0), end(1)]);
    expect(e.lines[0].note).toMatch(/^From the city centre\. /);
  });
  it("non-Opal legs are never capped and are called out", () => {
    const e = estimate({ activity: a, adults: 2, kids: 2 });
    const p = a.routes.pt;
    expect(p.nonOpal).toBeDefined();
    const adult = Math.min(p.fare[1] * 2, 9.65) + p.nonOpal![1] * 2;
    const kid = Math.min(p.fare[1], 4.8) + (p.nonOpalChild ?? [0, p.nonOpal![1] * 0.5])[1] * 2;
    expect(e.lines[0].value[1]).toBe(Math.round(adult * 2 + kid * 2));
    expect(e.lines[0].note).toMatch(/not on Opal/);
  });
  it("total is the sum of lines and per person divides it; $0 shows Free", () => {
    const e = estimate({ activity: a, adults: 3, kids: 1 });
    const sum = e.lines.reduce((t, l) => [t[0] + l.value[0], t[1] + l.value[1]], [0, 0]);
    expect(e.total).toEqual(sum);
    expect(e.perPerson).toEqual([Math.round(sum[0] / 4), Math.round(sum[1] / 4)]);
    expect(money([0, 0])).toBe("Free");
  });
  it("parking is never part of the total (it stays in the Driving? note)", () => {
    const b = byId.get("bondi-coogee")!;
    const e = estimate({ activity: b, adults: 5, kids: 0 });
    expect(e.lines.map((l) => l.key)).toEqual(["transport", "entry", ...b.costs.extras.filter((x) => x.on).map((x) => `extra:${x.id}`)]);
    expect(e.lines[0].label).toBe("Opal fares, return");
  });
});
