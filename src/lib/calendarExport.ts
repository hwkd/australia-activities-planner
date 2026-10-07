import type { Activity } from "~/content/schema";
import { effectiveStart, endOf, ZONE, type DateStr, type TimeStr } from "./dates";
import { plannedMinutes } from "./planDays";
import { SITE_NAME } from "~/site";
import { lib } from "~/strings/en-AU/lib";

/** Calendar export (spec §6.8): `.ics` for Apple Calendar and Outlook, template links for Google. */

export type Reminder = "none" | "30m" | "2h" | "1d";
export const REMINDERS: readonly { key: Reminder; label: string; trigger: string | null }[] = [
  { key: "none", label: lib.calendarExport.reminders.none, trigger: null },
  { key: "30m", label: lib.calendarExport.reminders["30m"], trigger: "-PT30M" },
  { key: "2h", label: lib.calendarExport.reminders["2h"], trigger: "-PT2H" },
  { key: "1d", label: lib.calendarExport.reminders["1d"], trigger: "-P1D" },
];

export type ExportActivity = Pick<Activity, "id" | "name" | "area" | "duration" | "routes">;

/** Areas that aren't places a calendar app can find; they read as the city instead. */
const CITY_AREAS = new Set(["City", "Inner City"]);

/**
 * A calendar location (spec §6.8): the meeting point, its area and the state, e.g. "Echo Point Lookout,
 * Blue Mountains NSW". "City" and "Inner City" read as Sydney, and an area the meeting point already
 * ends with ("Dixon Street, Haymarket") isn't repeated.
 */
export function placeOf(meeting: string, area: string): string {
  const where = CITY_AREAS.has(area) ? lib.calendarExport.city : area;
  const named = meeting.trim().toLowerCase().endsWith(where.toLowerCase());
  return lib.calendarExport.place(named || !meeting.trim() ? meeting.trim() || where : `${meeting.trim()}, ${where}`);
}

export interface CalendarEvent {
  uid: string;
  title: string;
  date: DateStr;
  start: TimeStr;
  end: { date: DateStr; time: TimeStr };
  /** Real length in minutes. */
  minutes: number;
  location: string;
  /** Where to meet, for calendar apps' maps (GEO). */
  geo?: { lat: number; lng: number };
  description: string;
  url: string;
}

export interface EventOptions {
  /** e.g. "https://sydneyweekendfinder.com.au", for the link back and the UID. */
  site: string;
  includeDirections: boolean;
}

/** The getting-there summary for the notes: "By public transport from Central Station, ≈ 35 min, 1 change: …" (D14). */
export function directionsText(a: ExportActivity): string {
  const p = a.routes.pt;
  const changes = p.changes === 0 ? lib.calendarExport.direct : lib.route.changes(p.changes);
  const steps = p.legs.map((l) => (l.line ? `${l.line}: ${l.title}` : l.title)).join(" → ");
  return lib.calendarExport.directions(p.total, changes, steps, p.back.text);
}

/** What export needs about an activity; served as /data/export.json so it's out of every page's HTML. */
export interface ExportInfo {
  id: string;
  name: string;
  duration: Activity["duration"];
  /** The meeting point, area and state (spec §6.8): "Echo Point Lookout, Blue Mountains NSW". */
  place: string;
  /** The meeting point's coordinates (an activity's destination, an event's venue). */
  geo?: { lat: number; lng: number };
  /** The getting-there summary from Central (directionsText). */
  directions: string;
  /** The link in the event; defaults to the activity page. Events link to their official page. */
  url?: string;
}
export const exportInfo = (a: ExportActivity): ExportInfo => ({
  id: a.id,
  name: a.name,
  duration: a.duration,
  place: placeOf(a.routes.dest.label, a.area),
  geo: { lat: a.routes.dest.lat, lng: a.routes.dest.lng },
  directions: directionsText(a),
});

/** One event for a planned item (spec §6.8). A start in the skipped daylight-saving hour moves to 3am. */
export function eventFromInfo(a: ExportInfo, date: DateStr, start: TimeStr, o: EventOptions): CalendarEvent {
  const site = o.site.replace(/\/$/, "");
  const url = a.url ?? `${site}/a/${a.id}`;
  return {
    uid: `${date}-${a.id}@${new URL(site).host}`,
    title: a.name,
    date,
    start: effectiveStart(date, start),
    end: endOf(date, start, plannedMinutes(a)),
    minutes: plannedMinutes(a),
    location: a.place,
    ...(a.geo ? { geo: a.geo } : {}),
    description: (o.includeDirections ? a.directions + "\n\n" : "") + lib.calendarExport.details(url),
    url,
  };
}
export const eventFor = (a: ExportActivity, date: DateStr, start: TimeStr, o: EventOptions): CalendarEvent => eventFromInfo(exportInfo(a), date, start, o);

// ---- .ics (RFC 5545) ----

const stamp = (d: DateStr, t: TimeStr) => `${d.replace(/-/g, "")}T${t.replace(":", "")}00`;
const isoDuration = (m: number) => (m <= 0 ? "PT0M" : `PT${Math.floor(m / 60) ? `${Math.floor(m / 60)}H` : ""}${m % 60 ? `${m % 60}M` : ""}`);
const utcStamp = (now: Date) => now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Escapes TEXT values (§3.3.11). */
export const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line to at most 75 octets, never splitting a UTF-8 character (§3.1). */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length ? 74 : 75; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Australia/Sydney: AEDT from the first Sunday in October (2am → 3am), AEST from the first Sunday in April (3am → 2am). */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${ZONE}`,
  "BEGIN:STANDARD",
  "DTSTART:19700405T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU",
  "TZOFFSETFROM:+1100",
  "TZOFFSETTO:+1000",
  "TZNAME:AEST",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19701004T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU",
  "TZOFFSETFROM:+1000",
  "TZOFFSETTO:+1100",
  "TZNAME:AEDT",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

/** One VCALENDAR with a VTIMEZONE and a VEVENT per plan; same date and activity → same UID, so re-adding updates. */
export function toIcs(events: readonly CalendarEvent[], reminder: Reminder = "none", now = new Date()): string {
  const trigger = REMINDERS.find((r) => r.key === reminder)?.trigger ?? null;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${SITE_NAME}//Plans//EN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...VTIMEZONE];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=${ZONE}:${stamp(e.date, e.start)}`,
      // DURATION, not a wall-clock DTEND: an end in the repeated hour when clocks go back would be ambiguous.
      `DURATION:${isoDuration(e.minutes)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `LOCATION:${escapeText(e.location)}`,
      ...(e.geo ? [`GEO:${e.geo.lat.toFixed(6)};${e.geo.lng.toFixed(6)}`] : []),
      `DESCRIPTION:${escapeText(e.description)}`,
      `URL:${e.url}`
    );
    if (trigger) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:${trigger}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "sydney-plans-2026-10-03.ics" or "sydney-plans-upcoming.ics". */
export const icsFileName = (date?: DateStr) => `sydney-plans-${date ?? "upcoming"}.ics`;

// ---- Google Calendar ----

/** Google's add-event page for one event, in Sydney local time (`ctz`). Google applies the user's default reminders. */
export function googleLink(e: CalendarEvent): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.date, e.start)}/${stamp(e.end.date, e.end.time)}`,
    ctz: ZONE,
    details: e.description,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
