import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import ICAL from "ical.js";
import { activities } from "../../tests/unit/cards";
import { escapeText, eventFor, fold, googleLink, icsFileName, placeOf, toIcs, type CalendarEvent } from "./calendarExport";
import { plannedMinutes } from "./planDays";

const SITE = "https://sydneyweekendfinder.com.au";
const a = (id: string) => activities.find((x) => x.id === id)!;
const NOW = new Date("2026-10-01T00:00:00Z");

/** Parses with ical.js (an independent RFC 5545 parser) and returns each event's UTC start and end. */
function parse(ics: string) {
  const cal = new ICAL.Component(ICAL.parse(ics));
  const tz = new ICAL.Timezone(cal.getFirstSubcomponent("vtimezone")!);
  ICAL.TimezoneService.register(tz, "Australia/Sydney");
  return cal.getAllSubcomponents("vevent").map((v) => {
    const ev = new ICAL.Event(v);
    // RFC 5545 §3.3.6: hours and minutes in a DURATION are exact, so end = start + duration in real time.
    // (ical.js's own endDate adds it in wall-clock time, which is wrong across a daylight-saving change.)
    const startMs = ev.startDate.toJSDate().getTime();
    return { uid: ev.uid, start: new Date(startMs).toISOString(), end: new Date(startMs + ev.duration.toSeconds() * 1000).toISOString(), summary: ev.summary, description: ev.description, location: ev.location, alarm: v.getFirstSubcomponent("valarm")?.getFirstPropertyValue("trigger")?.toString() ?? null };
  });
}

/** Structural checks a calendar app relies on: CRLF, ≤75-octet lines, balanced blocks, required properties. */
function lint(ics: string): string[] {
  const problems: string[] = [];
  if (!ics.endsWith("\r\n") || /[^\r]\n/.test(ics)) problems.push("lines must end with CRLF");
  const lines = ics.split("\r\n").slice(0, -1);
  lines.forEach((l, i) => new TextEncoder().encode(l).length > 75 && problems.push(`line ${i + 1} longer than 75 octets`));
  const unfolded = ics.replace(/\r\n /g, "").split("\r\n");
  const stack: string[] = [];
  for (const l of unfolded) {
    if (l.startsWith("BEGIN:")) stack.push(l.slice(6));
    else if (l.startsWith("END:") && stack.pop() !== l.slice(4)) problems.push(`unbalanced ${l}`);
  }
  if (stack.length) problems.push("unclosed blocks");
  for (const p of ["VERSION:2.0", "PRODID:"]) if (!unfolded.some((l) => l.startsWith(p))) problems.push(`missing ${p}`);
  const events = ics.split("BEGIN:VEVENT").slice(1);
  events.forEach((e, i) => ["UID:", "DTSTAMP:", "DTSTART;TZID=Australia/Sydney:", "DURATION:PT", "SUMMARY:"].forEach((p) => !e.includes(`\r\n${p}`) && problems.push(`event ${i + 1} missing ${p}`)));
  return problems;
}

const save = (name: string, ics: string) => {
  mkdirSync("test-results/ics", { recursive: true });
  writeFileSync(`test-results/ics/${name}`, ics);
};

describe("calendar export (spec §6.8)", () => {
  it("AC 25: a day with two plans gives one file with two events, place, directions and reminder", () => {
    const events = [eventFor(a("bondi-coogee"), "2026-10-03", "08:30", { site: SITE, includeDirections: true }), eventFor(a("icebergs"), "2026-10-03", "13:00", { site: SITE, includeDirections: true })];
    const ics = toIcs(events, "2h", NOW);
    save("day-two-plans.ics", ics);
    expect(lint(ics)).toEqual([]);
    const parsed = parse(ics);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ uid: "2026-10-03-bondi-coogee@sydneyweekendfinder.com.au", start: "2026-10-02T22:30:00.000Z", summary: a("bondi-coogee").name, alarm: "-PT2H" });
    expect(parsed[0].location).toBe(`${a("bondi-coogee").routes.dest.label}, ${a("bondi-coogee").area} NSW`);
    expect(parsed[0].description).toContain("By public transport from Central Station");
    expect(parsed[0].description).toContain(`${SITE}/a/bondi-coogee`);
    expect(Date.parse(parsed[0].end) - Date.parse(parsed[0].start)).toBe(plannedMinutes(a("bondi-coogee")) * 60000);
    expect(icsFileName("2026-10-03")).toBe("sydney-plans-2026-10-03.ics");
    expect(icsFileName()).toBe("sydney-plans-upcoming.ics");
  });
  it("AC 26: 10am on 4 Oct 2026 is 10:00 Sydney time; 2:30am that day moves to 3:00am", () => {
    const ten = toIcs([eventFor(a("botanic"), "2026-10-04", "10:00", { site: SITE, includeDirections: false })], "none", NOW);
    expect(ten).toContain("DTSTART;TZID=Australia/Sydney:20261004T100000");
    expect(parse(ten)[0].start).toBe("2026-10-03T23:00:00.000Z"); // AEDT, UTC+11
    const early = toIcs([eventFor(a("botanic"), "2026-10-04", "02:30", { site: SITE, includeDirections: false })], "none", NOW);
    save("dst-start.ics", early);
    expect(early).toContain("DTSTART;TZID=Australia/Sydney:20261004T030000");
    expect(parse(early)[0].start).toBe("2026-10-03T16:00:00.000Z");
    expect(lint(early)).toEqual([]);
  });
  it("keeps real length across the April change", () => {
    const e = eventFor(a("botanic"), "2027-04-04", "01:00", { site: SITE, includeDirections: false });
    const ics = toIcs([e], "none", NOW);
    expect(ics).toContain("DURATION:PT1H30M");
    const p = parse(ics)[0];
    expect(p.start).toBe("2027-04-03T14:00:00.000Z"); // 1am AEDT
    expect(p.end).toBe("2027-04-03T15:30:00.000Z"); // the first 2:30am, still AEDT
    expect(e.end.time).toBe("02:30");
  });
  it("same date and activity → same UID (re-adding updates)", () => {
    const o = { site: SITE, includeDirections: false };
    expect(eventFor(a("agnsw"), "2026-10-07", "10:00", o).uid).toBe(eventFor(a("agnsw"), "2026-10-07", "14:00", o).uid);
  });
  it("every activity exports cleanly with directions and every reminder", () => {
    for (const r of ["none", "30m", "2h", "1d"] as const) {
      const ics = toIcs(activities.map((x, i) => eventFor(x, "2026-10-10", `${String(6 + (i % 14)).padStart(2, "0")}:30`, { site: SITE, includeDirections: true })), r, NOW);
      expect(lint(ics)).toEqual([]);
      expect(parse(ics)).toHaveLength(activities.length);
      if (r === "1d") save("all-activities.ics", ics);
    }
  });
  it("escapes text and folds on character boundaries", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const long = "DESCRIPTION:" + "é".repeat(100);
    const folded = fold(long);
    expect(folded.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });
});

describe("calendar location (spec §6.8)", () => {
  it("is the meeting point, its area and the state, with the city for areas that aren't places", () => {
    expect(placeOf("Echo Point Lookout", "Blue Mountains")).toBe("Echo Point Lookout, Blue Mountains NSW");
    expect(placeOf("Sydney Opera House", "City")).toBe("Sydney Opera House, Sydney NSW");
    expect(placeOf("Carriageworks", "Inner City")).toBe("Carriageworks, Sydney NSW");
  });
  it("doesn't repeat an area the meeting point already ends with, or leave an empty part", () => {
    expect(placeOf("Dixon Street, Haymarket", "Haymarket")).toBe("Dixon Street, Haymarket NSW");
    expect(placeOf("", "Mosman")).toBe("Mosman NSW");
  });
  it("puts the meeting point's coordinates in the .ics as GEO", () => {
    const ics = toIcs([eventFor(a("bondi-coogee"), "2026-10-03", "09:00", { site: "https://example.test", includeDirections: false })]);
    const d = a("bondi-coogee").routes.dest;
    expect(ics).toContain(`GEO:${d.lat.toFixed(6)};${d.lng.toFixed(6)}`);
  });
});

describe("AC 27: Google Calendar links", () => {
  it("one link per event with local times and ctz", () => {
    const e: CalendarEvent = eventFor(a("bondi-coogee"), "2026-10-03", "08:30", { site: SITE, includeDirections: true });
    const u = new URL(googleLink(e));
    expect(u.origin + u.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("text")).toBe(a("bondi-coogee").name);
    expect(u.searchParams.get("dates")).toBe(`20261003T083000/20261003T${e.end.time.replace(":", "")}00`);
    expect(u.searchParams.get("ctz")).toBe("Australia/Sydney");
    expect(u.searchParams.get("location")).toBe(e.location);
    expect(u.searchParams.get("details")).toContain("Details:");
  });
});
