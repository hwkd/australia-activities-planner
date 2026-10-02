import type { Activity } from "~/content/schema";
import { lib } from "~/strings/en-AU/lib";
import { money } from "./cost";

/**
 * Getting there (spec §3.2 item 4, §4.3, D14): one public transport trip from the city centre
 * (Central). The way-in strip and the last stretch are derived from the trip's legs, never stored.
 */
export type Routes = Activity["routes"];
export type Pt = Routes["pt"];
export type Leg = Pt["legs"][number];
export type LegMode = Leg["mode"];
/** How a leg is drawn and coloured: metro and light rail look like trains. */
export type LegKind = "train" | "bus" | "ferry" | "walk";
export type Geo = Activity["geo"];
export type MapLeg = NonNullable<Geo["trip"]>["legs"][number];

export const kindOf = (mode: LegMode): LegKind => (mode === "metro" || mode === "light-rail" ? "train" : mode);
const vehicle = (l: { mode: LegMode }) => l.mode !== "walk";

export const changesLabel = (n: number) => (n === 0 ? lib.route.direct : lib.route.changes(n));
/** "35 min", "1 hr", "1 hr 20 min" */
export const minsLabel = (m: number) => (m >= 60 ? lib.route.hoursMins(Math.floor(m / 60), m % 60) : lib.route.mins(m));

export interface WayStep {
  mode: LegMode;
  kind: LegKind;
  /** The line ("T4", "333"), or the mode's name when there's no line ("Bus"). */
  label: string;
}
/** The way-in strip: the trip's train, bus and ferry legs, without the walks. Empty for a walk-only trip. */
export const wayIn = (legs: readonly Leg[]): WayStep[] =>
  legs.filter(vehicle).map((l) => ({ mode: l.mode, kind: kindOf(l.mode), label: l.line ?? lib.route.modeName[l.mode] }));

/** The last stretch: from the last train, bus or ferry leg to the door. A walk-only trip is its walk. */
export function lastStretch<L extends { mode: LegMode }>(legs: readonly L[]): L[] {
  let k = -1;
  legs.forEach((l, i) => {
    if (vehicle(l)) k = i;
  });
  return k < 0 ? [...legs] : legs.slice(k);
}

/** Google Maps public transport directions to `dest`, from wherever the visitor is (opens in a new tab). */
export const directionsHref = (dest: Routes["dest"]) =>
  `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=transit`;

/** The Driving? note (spec §3.2 item 4): a short note, not a travel mode. */
export type DrivingNote =
  | { canDrive: true; time: string; cost: string; notes: string[]; ride: string | null }
  | { canDrive: false; reason: string; ride: string | null };

export function drivingNote(r: Pick<Routes, "drive" | "ride" | "unavailable">): DrivingNote {
  const ride = r.ride ?? null;
  const d = r.drive;
  if (!d) return { canDrive: false, reason: r.unavailable?.drive ?? lib.route.cantDrive, ride };
  // "Parking, 3 hrs: $15–30 per car, est."; a label that already says "est." doesn't say it twice.
  const what = d.perCarLabel.replace(/, est\. /, ". ").replace(/, est\.$/, "");
  const price = d.perCar[1] <= 0 ? lib.cost.free : lib.cost.perCar(money(d.perCar));
  return { canDrive: true, time: d.total, cost: lib.route.driveCost(what, price), notes: d.notes, ride };
}

/** One line on the map in words: "T4 train", "bus 333", "walk". */
export const lineName = (l: { mode: LegMode; line?: string }) => lib.route.lineName[l.mode](l.line);

export interface DrawnLine {
  /** "T4 train", "bus 333", "walk" */
  label: string;
  kind: LegKind;
}
const distinct = (legs: readonly { mode: LegMode; line?: string }[]): DrawnLine[] => {
  const seen = new Map<string, LegKind>();
  for (const l of legs) if (!seen.has(lineName(l))) seen.set(lineName(l), kindOf(l.mode));
  return [...seen].map(([label, kind]) => ({ label, kind }));
};

/**
 * What the map draws for the trip, in order, and for the way back when it's switched on. The way back
 * names what it rides; its walks are drawn like the trip's. Null when the map has no trip lines.
 */
export function drawnLines(geo: Pick<Geo, "trip" | "back">, showBack: boolean): { trip: DrawnLine[]; back: DrawnLine[] } | null {
  const trip = geo.trip?.legs ?? [];
  const back = showBack ? (geo.back?.legs ?? []) : [];
  if (!trip.length && !back.length) return null;
  const rides = back.filter(vehicle);
  return { trip: distinct(trip), back: distinct(rides.length ? rides : back) };
}

/**
 * The line under the map that names what's drawn (spec §3.2 item 3), so the map never relies on
 * colour or sight alone: "On the map: T4 train, bus 333, walk; way back: bus 372". Null when the map
 * has no trip lines.
 */
export function linesInWords(geo: Pick<Geo, "trip" | "back">, showBack: boolean): string | null {
  const d = drawnLines(geo, showBack);
  const words = (l: DrawnLine[]) => (l.length ? l.map((x) => x.label).join(", ") : null);
  return d && lib.route.onTheMap(words(d.trip), words(d.back));
}
