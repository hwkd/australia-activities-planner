/**
 * Trip drift (tracker M9a, narrowed by D14): compares what the Transport for NSW Trip Planner returns
 * for an activity's trip from Central with the activity's written trip (`routes.pt`) and the lines
 * drawn on its map (`geo.trip`). It never edits content or maps; it reports what changed so an editor
 * can update the legs and the map in the admin. No path aliases here: the weekly job imports this
 * file directly with Node.
 */

export type Mode = "walk" | "train" | "bus" | "ferry" | "metro" | "light-rail";

/** One leg as the job normalises it from the Trip Planner response. */
export interface FetchedLeg {
  mode: Mode;
  line?: string;
  mins: number;
  from?: string;
  to?: string;
}
export interface FetchedJourney {
  legs: FetchedLeg[];
  totalMins: number;
}
/** The parts of an activity's written trip (`routes.pt`) the check reads. */
export interface ContentTrip {
  total: string;
  changes: number;
  legs: { mode: Mode; line?: string; mins: number; title: string }[];
}
/** The trip drawn on the activity's map (`geo.trip`); missing when the map has no trip yet. */
export interface MapTrip {
  legs: { mode: Mode; line?: string }[];
}

export interface Drift {
  activityId: string;
  /** The written trip no longer matches the journey: update the legs, time or changes. */
  routeChanged: boolean;
  /** The map draws lines the journey no longer uses (or misses new ones): redraw the trip in the admin. */
  mapFlag: boolean;
  notes: string[];
}

const TRANSIT = (m: Mode) => m !== "walk";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** The lines ridden, in order ("T4 → 333"), the mode where there's no line. */
const ridden = (legs: readonly { mode: Mode; line?: string }[]) => legs.filter((l) => TRANSIT(l.mode)).map((l) => l.line ?? l.mode);
const sameLine = (a: string, b: string) => norm(a) === norm(b);

/** "≈ 35 min", "≈ 1 hr 20 min", "2 hrs" → minutes (NaN if unreadable). */
export function parseTotal(s: string): number {
  const h = /(\d+(?:\.\d+)?)\s*hrs?/.exec(s);
  const m = /(\d+)\s*min/.exec(s);
  if (!h && !m) return NaN;
  return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
}

export function compareTrip(activityId: string, content: ContentTrip, fetched: FetchedJourney, map: MapTrip | undefined): Drift {
  const notes: string[] = [];
  let routeChanged = false;
  let mapFlag = false;

  const want = ridden(content.legs);
  const got = ridden(fetched.legs);
  if (want.length !== got.length || want.some((w, i) => !sameLine(w, got[i]))) {
    routeChanged = true;
    notes.push(`Lines changed: ${want.join(" → ") || "none"} is now ${got.join(" → ") || "none"}.`);
  }
  const changes = Math.max(0, got.length - 1);
  if (changes !== content.changes) {
    routeChanged = true;
    notes.push(`Changes: ${content.changes} is now ${changes}.`);
  }
  const before = parseTotal(content.total);
  const diff = fetched.totalMins - before;
  if (Number.isFinite(before) && Math.abs(diff) > Math.max(10, before * 0.2)) {
    routeChanged = true;
    notes.push(`Time: about ${before} min is now ${fetched.totalMins} min.`);
  }

  // The map: every line the journey rides should be drawn, and nothing it doesn't ride.
  const drawn = map ? ridden(map.legs) : [];
  if (!map) {
    if (got.length) {
      mapFlag = true;
      notes.push("The map has no trip from Central yet.");
    }
  } else {
    for (const l of got) if (!drawn.some((d) => sameLine(d, l))) {
      mapFlag = true;
      notes.push(`Map doesn't draw ${l}.`);
    }
    for (const d of drawn) if (!got.some((l) => sameLine(d, l))) {
      mapFlag = true;
      notes.push(`Map draws ${d}, which the trip no longer uses.`);
    }
  }
  return { activityId, routeChanged, mapFlag, notes };
}

/** The weekly PR's summary. */
export function driftReport(results: Drift[], when: string): string {
  const changed = results.filter((r) => r.routeChanged || r.mapFlag);
  const lines = [`# Transport check, ${when}`, "", `${results.length} trips from Central checked, ${changed.length} need a look.`, ""];
  if (!changed.length) lines.push("Everything matches the content and maps.");
  for (const r of changed) {
    lines.push(`## ${r.activityId}${r.mapFlag ? " · redraw the map's trip" : ""}`, "", ...r.notes.map((n) => `- ${n}`), "");
  }
  lines.push(
    "",
    "Content and maps are never edited automatically: update the trip in the admin (Getting there) and redraw flagged trips on the map (`scripts/map/build-geo.mjs` proposes them; check them in the admin's map editor)."
  );
  return lines.join("\n") + "\n";
}
