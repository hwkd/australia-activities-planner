import { afterEach, describe, expect, it, vi } from "vitest";
import { cards } from "../../tests/unit/cards";

/** A localStorage stand-in; `failWrites` simulates a full or blocked store. */
function fakeStorage(seed: Record<string, string>, failWrites = false) {
  const m = new Map(Object.entries(seed));
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites && k !== "__swf_probe__") throw new Error("QuotaExceededError");
      m.set(k, v);
    },
    removeItem: (k: string) => void m.delete(k),
  };
}

async function load(storage: ReturnType<typeof fakeStorage>) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage);
  const { setPersistentEngine } = await import("@nanostores/persistent");
  const { safeStorage } = await import("./storage");
  setPersistentEngine(safeStorage, { addEventListener() {}, removeEventListener() {} });
  return import("./plan");
}

const v1 = JSON.stringify({
  weekendOf: "2026-10-03",
  days: { sat: { forecast: "sunny", forecastSource: "manual", items: ["bondi-coogee", "icebergs"] }, sun: { forecast: "rainy", forecastSource: "manual", items: ["agnsw"] } },
  updatedAt: "2026-09-30T00:00:00.000Z",
});

afterEach(() => vi.unstubAllGlobals());

describe("$plan store (spec §4.4, AC 29)", () => {
  it("migrates v1, writes v2, then deletes v1", async () => {
    const s = fakeStorage({ "swf.plan.v1": v1 });
    const { $plan, initPlan } = await load(s);
    initPlan(cards, "2026-10-01");
    expect($plan.get().days["2026-10-03"].items.map((i) => i.id)).toEqual(["bondi-coogee", "icebergs"]);
    expect($plan.get().days["2026-10-04"].sky).toBe("rainy");
    expect(JSON.parse(s.m.get("swf.plan.v2")!).days["2026-10-04"].items).toHaveLength(1);
    expect(s.m.has("swf.plan.v1")).toBe(false);
  });
  it("keeps v1 when v2 can't be saved, and still works in memory", async () => {
    const s = fakeStorage({ "swf.plan.v1": v1 }, true);
    const { $plan, initPlan, updatePlan } = await load(s);
    initPlan(cards, "2026-10-01");
    expect(Object.keys($plan.get().days)).toEqual(["2026-10-03", "2026-10-04"]);
    expect(s.m.has("swf.plan.v1")).toBe(true);
    const { addItem } = await import("~/lib/plan");
    updatePlan((p) => addItem(p, "2026-10-07", "chinatown", "18:30"));
    expect($plan.get().days["2026-10-07"]).toBeDefined();
  });
  it("keeps plans for unknown (unpublished) activities but prunes old days", async () => {
    const stored = { v: 2, updatedAt: "x", days: { "2026-08-01": { skySource: "manual", items: [{ id: "agnsw", start: "10:00" }] }, "2026-10-03": { skySource: "manual", items: [{ id: "gone", start: "10:00" }, { id: "agnsw", start: "11:00" }] } } };
    const s = fakeStorage({ "swf.plan.v2": JSON.stringify(stored) });
    const { $plan, initPlan } = await load(s);
    initPlan(cards, "2026-10-01");
    expect($plan.get().days).toEqual({ "2026-10-03": { skySource: "manual", items: [{ id: "gone", start: "10:00" }, { id: "agnsw", start: "11:00" }] } });
  });
  it("does nothing on a page without the activity list (it would otherwise lose plans)", async () => {
    const stored = { v: 2, updatedAt: "x", days: { "2026-10-03": { skySource: "manual", items: [{ id: "agnsw", start: "11:00" }] } } };
    const s = fakeStorage({ "swf.plan.v2": JSON.stringify(stored) });
    const { $plan, initPlan } = await load(s);
    initPlan([], "2026-10-01");
    expect($plan.get().days["2026-10-03"].items).toHaveLength(1);
    expect(JSON.parse(s.m.get("swf.plan.v2")!).days["2026-10-03"].items).toHaveLength(1);
  });
  it("reads corrupt storage as an empty plan", async () => {
    const { $plan } = await load(fakeStorage({ "swf.plan.v2": "{not json" }));
    expect($plan.get().days).toEqual({});
  });
});
