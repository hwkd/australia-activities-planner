import { describe, expect, it } from "vitest";
import { type DetailState, carryOver, initialDetail, presetKey, setPeople, togglePoi } from "./detailState";

describe("activity page state (spec §3.2)", () => {
  it("starts from Discover's group, with no origin or mode (D14)", () => {
    expect(initialDetail("family")).toMatchObject({ adults: 2, kids: 2 });
    expect(initialDetail("any")).toEqual({ adults: 2, kids: 0, extras: {}, poi: null, showBack: false, showFacilities: true });
  });
  it("pairings keep the group and reset the map place, extras and Way back", () => {
    const s: DetailState = { ...initialDetail("friends"), poi: 3, showBack: true, extras: { lunch: false }, showFacilities: false };
    expect(carryOver(s)).toEqual({ adults: 4, kids: 0, poi: null, showBack: false, extras: {}, showFacilities: false });
  });
  it("steppers clamp and presets follow the counts", () => {
    expect(setPeople(initialDetail(), 0, 9)).toMatchObject({ adults: 1, kids: 6 });
    expect(presetKey(setPeople(initialDetail(), 2, 2))).toBe("family");
    expect(presetKey(setPeople(initialDetail(), 3, 1))).toBe("custom");
  });
  it("a place toggles", () => {
    expect(togglePoi(initialDetail(), 2).poi).toBe(2);
    expect(togglePoi(togglePoi(initialDetail(), 2), 2).poi).toBeNull();
  });
});
