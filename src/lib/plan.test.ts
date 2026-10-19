import { describe, expect, it } from "vitest";
import { cardMap, card } from "../../tests/unit/cards";
import { addItem, conflictingDays, datesPlanned, emptyPlan, migrateV1, moveItem, normalizePlan, plannedIdsFrom, prunePast, removeItem, saveShared, setSky, setStart, swapItem, upcomingDays } from "./plan";
import { plannedMinutes } from "./planDays";
import { minutesOf, timeOf } from "./dates";

const SAT = "2026-10-03";

describe("plan edits", () => {
  it("adds once per day, sorted by start", () => {
    let p = addItem(emptyPlan(), SAT, "rocks-markets", "13:00");
    p = addItem(p, SAT, "bondi-coogee", "08:30");
    expect(addItem(p, SAT, "bondi-coogee", "15:00")).toBe(p);
    expect(p.days[SAT].items).toEqual([{ id: "bondi-coogee", start: "08:30" }, { id: "rocks-markets", start: "13:00" }]);
  });
  it("removing the last item drops the day unless it has a sky", () => {
    const p = addItem(emptyPlan(), SAT, "bondi-coogee", "08:30");
    expect(removeItem(p, SAT, "bondi-coogee").days[SAT]).toBeUndefined();
    expect(removeItem(setSky(p, SAT, "rainy"), SAT, "bondi-coogee").days[SAT]).toEqual({ sky: "rainy", skySource: "manual", items: [] });
  });
  it("change time, change day (keeps time), swap (keeps time)", () => {
    const p = addItem(emptyPlan(), SAT, "bondi-coogee", "08:30");
    expect(setStart(p, SAT, "bondi-coogee", "09:00").days[SAT].items[0].start).toBe("09:00");
    const moved = moveItem(p, SAT, "2026-10-07", "bondi-coogee");
    expect(moved.days[SAT]).toBeUndefined();
    expect(moved.days["2026-10-07"].items).toEqual([{ id: "bondi-coogee", start: "08:30" }]);
    expect(swapItem(p, SAT, "bondi-coogee", "agnsw").days[SAT].items).toEqual([{ id: "agnsw", start: "08:30" }]);
    // The backup never starts before its own suggested start; a later slot stays as it was.
    expect(swapItem(p, SAT, "bondi-coogee", "agnsw", "10:30").days[SAT].items).toEqual([{ id: "agnsw", start: "10:30" }]);
    expect(swapItem(p, SAT, "bondi-coogee", "agnsw", "07:00").days[SAT].items).toEqual([{ id: "agnsw", start: "08:30" }]);
  });
  it("moving onto a day that already has it does nothing", () => {
    let p = addItem(emptyPlan(), SAT, "bondi-coogee", "08:30");
    p = addItem(p, "2026-10-04", "bondi-coogee", "10:00");
    expect(moveItem(p, SAT, "2026-10-04", "bondi-coogee")).toBe(p);
  });
  it("lookups from today", () => {
    let p = addItem(emptyPlan(), "2026-09-20", "agnsw", "10:00");
    p = addItem(addItem(p, "2026-10-10", "bondi-coogee", "08:30"), SAT, "bondi-coogee", "09:00");
    expect([...plannedIdsFrom(p, SAT)]).toEqual(["bondi-coogee"]);
    expect(datesPlanned(p, "bondi-coogee", SAT)).toEqual([SAT, "2026-10-10"]);
    expect(upcomingDays(p, SAT)).toEqual([SAT, "2026-10-10"]);
  });
  it("prunes days more than 30 days old", () => {
    const p = addItem(addItem(emptyPlan(), "2026-08-31", "agnsw", "10:00"), "2026-09-01", "agnsw", "10:00");
    expect(Object.keys(prunePast(p, "2026-10-01").days)).toEqual(["2026-09-01"]);
  });
});

describe("reading stored plans", () => {
  it("keeps valid parts only", () => {
    const p = normalizePlan(
      { v: 2, days: { [SAT]: { sky: "foggy", items: [{ id: "agnsw", start: "25:00" }, { id: "bondi-coogee", start: "09:00" }, { id: "bondi-coogee", start: "10:00" }, { id: "nope", start: "09:00" }] }, "2026-02-30": { items: [] } }, updatedAt: "x" },
      (id) => cardMap.has(id)
    );
    expect(p?.days).toEqual({ [SAT]: { skySource: "manual", items: [{ id: "bondi-coogee", start: "09:00" }] } });
    expect(normalizePlan({ v: 1 })).toBeNull();
    expect(normalizePlan("junk")).toBeNull();
  });
});

describe("AC 29: v1 migration", () => {
  const v1 = {
    weekendOf: SAT,
    days: {
      sat: { forecast: "sunny", forecastSource: "manual", items: ["bondi-coogee", "icebergs", "rocks-markets"] },
      sun: { forecast: "rainy", forecastSource: "manual", items: ["agnsw"] },
    },
    updatedAt: "2026-09-30T00:00:00.000Z",
  };
  it("loses no plans and gives non-overlapping starts in the old order", () => {
    const p = migrateV1(v1, cardMap)!;
    expect(p.days[SAT].sky).toBe("sunny");
    expect(p.days["2026-10-04"]).toEqual({ sky: "rainy", skySource: "manual", items: [{ id: "agnsw", start: card("agnsw").suggestedStart }] });
    const sat = p.days[SAT].items;
    expect(sat.map((i) => i.id)).toEqual(v1.days.sat.items);
    for (let i = 1; i < sat.length; i++) {
      const prev = sat[i - 1];
      expect(minutesOf(sat[i].start)).toBeGreaterThanOrEqual(Math.min(minutesOf(prev.start) + plannedMinutes(card(prev.id)), minutesOf("22:00")));
    }
    expect(sat[0].start).toBe(card("bondi-coogee").suggestedStart);
  });
  it("moves an overlapping item to start after the previous one ends", () => {
    const p = migrateV1({ weekendOf: SAT, days: { sat: { items: ["bondi-coogee", "bondi-coogee", "icebergs"] } } }, new Map([
      ["bondi-coogee", { ...card("bondi-coogee"), suggestedStart: "09:00", duration: { label: "", minHours: 2, maxHours: 3 } }],
      ["icebergs", { ...card("icebergs"), suggestedStart: "10:00", duration: { label: "", minHours: 1, maxHours: 1 } }],
    ]))!;
    expect(p.days[SAT].items).toEqual([{ id: "bondi-coogee", start: "09:00" }, { id: "icebergs", start: timeOf(9 * 60 + 150) }]);
  });
});

describe("saving a shared plan (spec §3.4)", () => {
  const mine = addItem(emptyPlan(), SAT, "bondi-coogee", "08:30");
  const shared = { [SAT]: { skySource: "manual" as const, sky: "sunny" as const, items: [{ id: "bondi-coogee", start: "10:00" }, { id: "icebergs", start: "12:00" }] }, "2026-10-04": { skySource: "manual" as const, items: [{ id: "agnsw", start: "10:00" }] } };
  it("knows which days conflict", () => expect(conflictingDays(mine, shared)).toEqual([SAT]));
  it("merge adds missing items and keeps existing times", () => {
    const p = saveShared(mine, shared, "merge");
    expect(p.days[SAT].items).toEqual([{ id: "bondi-coogee", start: "08:30" }, { id: "icebergs", start: "12:00" }]);
    expect(p.days[SAT].sky).toBe("sunny");
    expect(p.days["2026-10-04"].items).toHaveLength(1);
  });
  it("replace overwrites those days", () => {
    expect(saveShared(mine, shared, "replace").days[SAT].items[0]).toEqual({ id: "bondi-coogee", start: "10:00" });
  });
});
