import { describe, expect, it } from "vitest";
import { cardMap, card, cards } from "../../tests/unit/cards";
import { checkAdd, dayItems, nudge, onlyDaysLabel, plannedHours, runsOn, sortItems, spanOf } from "./planDays";

describe("planned length (spec §4.4)", () => {
  it("is the midpoint rounded to the half hour, or minHours for full days", () => {
    expect(plannedHours({ duration: { minHours: 2, maxHours: 3 } })).toBe(2.5);
    expect(plannedHours({ duration: { minHours: 1, maxHours: 2.5 } })).toBe(2); // 1.75 → 2
    expect(plannedHours({ duration: { minHours: 1.5, maxHours: 2 } })).toBe(2); // 1.75 → 2
    expect(plannedHours({ duration: { minHours: 1, maxHours: 1.5 } })).toBe(1.5); // 1.25 → 1.5
    expect(plannedHours({ duration: { minHours: 5, maxHours: 8 } })).toBe(5);
  });
  it("gives every activity a positive whole number of half hours", () => {
    for (const c of cards) expect(Number.isInteger(plannedHours(c) * 2) && plannedHours(c) > 0, c.id).toBe(true);
  });
});

describe("days it runs", () => {
  it("Carriageworks runs on Saturdays only", () => {
    expect(runsOn(card("carriageworks"), "2026-10-03")).toBe(true);
    expect(runsOn(card("carriageworks"), "2026-10-04")).toBe(false);
    expect(runsOn(card("bondi-coogee"), "2026-10-06")).toBe(true);
  });
  it("labels", () => {
    expect(onlyDaysLabel(["sat"])).toBe("Saturdays");
    expect(onlyDaysLabel(["sat", "sun"])).toBe("Saturdays and Sundays");
    expect(onlyDaysLabel(["fri", "sat", "sun"])).toBe("Fridays, Saturdays and Sundays");
  });
});

describe("a day's plans (spec §6.7)", () => {
  it("sorts by start time", () => {
    expect(sortItems([{ id: "b", start: "13:00" }, { id: "a", start: "08:30" }]).map((i) => i.id)).toEqual(["a", "b"]);
  });
  it("AC 9: flags overlaps on both plans", () => {
    const rows = dayItems("2026-10-03", [{ id: "bondi-coogee", start: "09:00" }, { id: "icebergs", start: "10:00" }, { id: "chinatown", start: "18:00" }], cardMap);
    expect(rows[0].warning).toEqual({ kind: "overlap", withId: "icebergs", text: `Overlaps with ${card("icebergs").name}.` });
    expect(rows[1].overlapsWith).toEqual(["bondi-coogee"]);
    expect(rows[2].warning).toBeNull();
  });
  it("back-to-back plans don't overlap", () => {
    const len = plannedHours(card("bondi-coogee")) * 60;
    const end = `${String(9 + Math.floor(len / 60)).padStart(2, "0")}:${String(len % 60).padStart(2, "0")}`;
    const rows = dayItems("2026-10-03", [{ id: "bondi-coogee", start: "09:00" }, { id: "icebergs", start: end }], cardMap);
    expect(rows.every((r) => r.warning === null)).toBe(true);
  });
  it("flags a plan on a day it doesn't run", () => {
    const [row] = dayItems("2026-10-04", [{ id: "carriageworks", start: "08:00" }], cardMap);
    expect(row.warning?.kind).toBe("closed");
    expect(row.warning?.text).toBe(`${card("carriageworks").name} runs on Saturdays only.`);
  });
  it("keeps the real length across the daylight-saving change (4 Oct 2026)", () => {
    const s = spanOf("2026-10-04", { id: "x", start: "01:30" }, { duration: { minHours: 1, maxHours: 1 } });
    expect(s.end.time).toBe("03:30");
    expect(s.endMs - s.startMs).toBe(3600000);
    expect(spanOf("2026-10-04", { id: "x", start: "02:30" }, { duration: { minHours: 1, maxHours: 1 } }).start).toBe("03:00");
  });
});

describe("Add to a day checks (AC 8)", () => {
  const items = [{ id: "bondi-coogee", start: "09:00" }];
  it("a closed day blocks; an overlap doesn't", () => {
    expect(checkAdd("2026-10-04", "08:00", card("carriageworks"), [], cardMap).blocked).toBe(true);
    const c = checkAdd("2026-10-03", "10:00", card("icebergs"), items, cardMap);
    expect(c.blocked).toBe(false);
    expect(c.overlap?.text).toBe(`Overlaps with ${card("bondi-coogee").name} (9am). You can still add it.`);
  });
  it("once per day, except when editing that plan", () => {
    expect(checkAdd("2026-10-03", "14:00", card("bondi-coogee"), items, cardMap).alreadyPlanned).toBe(true);
    const edit = checkAdd("2026-10-03", "14:00", card("bondi-coogee"), items, cardMap, "bondi-coogee");
    expect(edit.alreadyPlanned).toBe(false);
    expect(edit.overlap).toBeNull();
  });
});

describe("nudge (±30 min, 6am–10pm)", () => {
  it("moves within bounds and stops at the edges", () => {
    expect(nudge("09:00", -30)).toBe("08:30");
    expect(nudge("06:00", -30)).toBeNull();
    expect(nudge("21:30", 30)).toBe("22:00");
    expect(nudge("22:00", 30)).toBeNull();
  });
});
