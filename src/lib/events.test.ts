import { describe, expect, it } from "vitest";
import { eventSchema, type EventItem } from "~/content/eventSchema";
import { datesLabel, eventExportInfo, onSoon, toEventCard } from "./events";
import { checkAdd, dayItems, runsOn, toPlanCard } from "./planDays";
import { quickDays } from "./quickDays";
import { pickPlanB } from "./planB";
import { eventFromInfo } from "./calendarExport";

const market: EventItem = eventSchema.parse({
  id: "e-night-market",
  name: "Night Noodle Markets",
  blurb: "Hawker stalls under the fig trees in Hyde Park.",
  start: "2026-10-08",
  end: "2026-10-10",
  area: "Hyde Park",
  venue: { name: "Hyde Park North", lat: -33.8708, lng: 151.2118 },
  weatherFit: { sunny: 2, cloudy: 2, rainy: 0, hot: 1 },
  goodFor: ["friends", "date"],
  duration: { label: "2 hrs", minHours: 1.5, maxHours: 2.5 },
  cost: "$$",
  suggestedStart: "18:00",
  link: { label: "Official site", url: "https://example.org/night-noodle-markets" },
  checked: "2026-10-01",
});
const card = toPlanCard(toEventCard(market));

describe("events (spec §11.4)", () => {
  it("rejects bad ids and end-before-start", () => {
    expect(eventSchema.safeParse({ ...market, id: "night-market" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...market, end: "2026-10-07" }).success).toBe(false);
  });
  it("plans only on its own dates, with its own wording", () => {
    expect(card).toMatchObject({ kind: "event", dates: { from: "2026-10-08", to: "2026-10-10" }, forecastArea: "city" });
    expect(runsOn(card, "2026-10-07")).toBe(false);
    expect(runsOn(card, "2026-10-08")).toBe(true);
    expect(runsOn(card, "2026-10-11")).toBe(false);
    const cards = new Map([[card.id, card]]);
    expect(checkAdd("2026-10-11", "18:00", card, [], cards).closed).toBe("Night Noodle Markets is on Thu 8 Oct – Sat 10 Oct only. Pick one of those days.");
    expect(dayItems("2026-10-12", [{ id: card.id, start: "18:00" }], cards)[0].warning?.text).toBe("Night Noodle Markets is on Thu 8 Oct – Sat 10 Oct only.");
  });
  it("offers its own days as quick days", () => {
    expect(quickDays("2026-10-01", undefined, card.dates!).map((q) => q.date)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"]);
    expect(quickDays("2026-10-09", undefined, card.dates!).map((q) => q.label)).toEqual(["Today", "Tomorrow"]);
  });
  it("is never a Plan B", () => {
    const walk = { ...card, id: "walk", kind: undefined, dates: undefined, weatherFit: { sunny: 2, cloudy: 2, rainy: 0, hot: 2 } as const };
    const indoorEvent = { ...card, weatherFit: { sunny: 2, cloudy: 2, rainy: 2, hot: 2 } as const };
    expect(pickPlanB(walk, "2026-10-08", "rainy", [indoorEvent], new Set())).toBeNull();
  });
  it("shows on soon for the next 14 days, soonest first", () => {
    const later = { ...toEventCard(market), id: "e-later", name: "Later", dates: { from: "2026-10-20" as const, to: "2026-10-21" as const } };
    const ev = toEventCard(market);
    expect(onSoon([later, ev], "2026-10-01").map((e) => e.id)).toEqual([ev.id]);
    expect(onSoon([later, ev], "2026-10-07").map((e) => e.id)).toEqual([ev.id, "e-later"]);
    expect(onSoon([later, ev], "2026-10-11").map((e) => e.id)).toEqual(["e-later"]);
    expect(datesLabel("2026-10-08", "2026-10-08")).toBe("Thu 8 Oct");
  });
  it("exports with the venue and the official page", () => {
    const e = eventFromInfo(eventExportInfo(market), "2026-10-08", "18:00", { site: "https://example.test", includeDirections: true });
    expect(e.location).toBe("Hyde Park North, Hyde Park, Sydney NSW");
    expect(e.url).toBe("https://example.org/night-noodle-markets");
    expect(e.description).toContain("official page");
  });
});
