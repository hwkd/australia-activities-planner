import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { activitySchema, type Activity } from "~/content/schema";
import { checkActivities, needsRecheck, sixMonthsBefore } from "./content-checks";

const dir = "db/seed/activities";
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const raw = files.map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
const parsed = raw.map((r) => activitySchema.parse(r)) as Activity[];
const clone = <T>(v: T): T => structuredClone(v);

describe("content (AC 15)", () => {
  it("all current files pass the schema and cross-file checks", () => {
    expect(checkActivities(parsed, files.map((f) => f.replace(".json", "")))).toEqual([]);
  });
  it("rejects a missing required field", () => {
    const bad = clone(raw[0]);
    delete bad.blurb;
    expect(activitySchema.safeParse(bad).success).toBe(false);
  });
  it("rejects weatherFit outside 0–2", () => {
    const bad = clone(raw[0]);
    bad.weatherFit.rainy = 3;
    expect(activitySchema.safeParse(bad).success).toBe(false);
  });
  it("rejects a verified activity without check dates", () => {
    const bad = clone(raw[0]);
    bad.status = "verified";
    bad.lastVerified = null;
    bad.costs.pricesChecked = null;
    expect(activitySchema.safeParse(bad).success).toBe(false);
  });
  it("accepts unconfirmed details on a verified activity, but only known sections and short notes", () => {
    const ok = clone(raw[0]);
    ok.unconfirmed = [{ section: "driving", note: "Parking prices." }];
    expect(activitySchema.safeParse(ok).success).toBe(true);
    const badSection = clone(raw[0]);
    badSection.unconfirmed = [{ section: "lunch", note: "Café prices." }];
    expect(activitySchema.safeParse(badSection).success).toBe(false);
    const long = clone(raw[0]);
    long.unconfirmed = [{ section: "cost", note: "x".repeat(201) }];
    expect(activitySchema.safeParse(long).success).toBe(false);
  });
  it("catches duplicate ids", () => {
    expect(checkActivities([parsed[0], parsed[0]])).toContain(`${parsed[0].id}: duplicate id`);
  });
  it("catches a pairing that points nowhere", () => {
    const a = clone(parsed[0]);
    a.pairings[0].activityId = "nowhere";
    expect(checkActivities([a]).some((p) => p.includes('points to "nowhere"'))).toBe(true);
  });
  it("checks the map's places: numbered 1..n, one start, at most one end", () => {
    const a = clone(parsed.find((x) => x.id === "bondi-coogee")!);
    a.geo.places[1].n = 5;
    a.geo.places[0].type = "beach";
    a.geo.places[2].type = "end";
    const problems = checkActivities([a]);
    expect(problems).toContain("bondi-coogee: map places must be numbered 1..n in order (found 5 at position 2)");
    expect(problems).toContain("bondi-coogee: the map needs a start place");
    expect(problems).toContain("bondi-coogee: the map has more than one end place");
  });
  it("a drawn way back needs Getting back's text; directions must point inside Sydney", () => {
    const a = clone(parsed.find((x) => x.id === "bondi-coogee")!);
    expect(a.geo.back).toBeDefined();
    a.routes.pt.back.text = " ";
    a.routes.dest.lng = 115.86;
    const problems = checkActivities([a]);
    expect(problems).toContain("bondi-coogee: the map draws a way back, but Getting back has no text");
    expect(problems.some((p) => p.includes("directions point outside the Sydney map"))).toBe(true);
  });
});

describe("needs re-checking (spec §5)", () => {
  it("counts six calendar months back, clamped to the month's end", () => {
    expect(sixMonthsBefore("2026-10-01")).toBe("2026-04-01");
    expect(sixMonthsBefore("2026-03-15")).toBe("2025-09-15");
    expect(sixMonthsBefore("2026-08-31")).toBe("2026-02-28");
  });
  it("flags verified activities last checked more than six months ago, never drafts", () => {
    expect(needsRecheck("verified", "2026-04-01", "2026-10-01")).toBe(false);
    expect(needsRecheck("verified", "2026-03-31", "2026-10-01")).toBe(true);
    expect(needsRecheck("verified", null, "2026-10-01")).toBe(true);
    expect(needsRecheck("draft", null, "2026-10-01")).toBe(false);
  });
});
