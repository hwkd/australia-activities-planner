import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compareTrip, driftReport, parseTotal, type FetchedJourney, type MapTrip } from "./transportDrift";

const bondi = JSON.parse(readFileSync("db/seed/activities/bondi-coogee.json", "utf8"));
const content = bondi.routes.pt;
const map = bondi.geo.trip;

/** What the Trip Planner would return today for Bondi from Central (seeded, matches the content and the map). */
const same: FetchedJourney = {
  totalMins: 32,
  legs: [
    { mode: "walk", mins: 3 },
    { mode: "train", line: "T4", mins: 12, to: "Bondi Junction Station" },
    { mode: "bus", line: "333", mins: 12, to: "Bondi Beach stop" },
    { mode: "walk", mins: 5 },
  ],
};
const swap = (j: FetchedJourney, from: string, to: string): FetchedJourney => ({ ...j, legs: j.legs.map((l) => (l.line === from ? { ...l, line: to } : l)) });

describe("trip drift check (M9a, D14: from Central only)", () => {
  it("reads content totals", () => {
    expect(parseTotal("≈ 35 min")).toBe(35);
    expect(parseTotal("≈ 1 hr 20 min")).toBe(80);
    expect(parseTotal("2 hrs")).toBe(120);
    expect(parseTotal("soon")).toBeNaN();
  });
  it("a matching journey raises nothing", () => {
    expect(map.legs.map((l: { line?: string }) => l.line).filter(Boolean)).toEqual(["T4", "333"]);
    expect(compareTrip("bondi-coogee", content, same, map)).toEqual({ activityId: "bondi-coogee", routeChanged: false, mapFlag: false, notes: [] });
  });
  it("a seeded change of bus line flags the written trip and the map", () => {
    const d = compareTrip("bondi-coogee", content, swap(same, "333", "380"), map);
    expect(d.routeChanged).toBe(true);
    expect(d.mapFlag).toBe(true);
    expect(d.notes).toEqual(["Lines changed: T4 → 333 is now T4 → 380.", "Map doesn't draw 380.", "Map draws 333, which the trip no longer uses."]);
  });
  it("a map that's out of date is flagged even when the written trip matches", () => {
    const old: MapTrip = { legs: [{ mode: "train", line: "T4" }, { mode: "bus", line: "389" }, { mode: "walk" }] };
    const d = compareTrip("bondi-coogee", content, same, old);
    expect(d).toMatchObject({ routeChanged: false, mapFlag: true });
    expect(d.notes).toContain("Map draws 389, which the trip no longer uses.");
    expect(compareTrip("bondi-coogee", content, same, undefined).notes).toEqual(["The map has no trip from Central yet."]);
  });
  it("a much longer trip and an extra change are reported", () => {
    const slower: FetchedJourney = {
      totalMins: 58,
      legs: [{ mode: "train", line: "T4", mins: 12 }, { mode: "bus", line: "333", mins: 20 }, { mode: "bus", line: "389", mins: 10 }],
    };
    const d = compareTrip("bondi-coogee", content, slower, map);
    expect(d.notes).toEqual(expect.arrayContaining(["Time: about 35 min is now 58 min.", "Changes: 1 is now 2.", "Map doesn't draw 389."]));
  });
  it("the report lists only what needs a look and never claims to edit content", () => {
    const ok = compareTrip("bondi-coogee", content, same, map);
    const bad = compareTrip("icebergs", content, swap(same, "333", "380"), map);
    const md = driftReport([ok, bad], "Sat 3 Oct 2026");
    expect(md).toContain("2 trips from Central checked, 1 need a look.");
    expect(md).toContain("## icebergs · redraw the map's trip");
    expect(md).not.toContain("## bondi-coogee");
    expect(md).toContain("never edited automatically");
  });
});
