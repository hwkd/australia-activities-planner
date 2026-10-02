import type { Activity } from "~/content/schema";
import { lib } from "~/strings/en-AU/lib";
import { dayType, weekday, type DateStr } from "./dates";
import { holidayOn } from "./holidays";
import type { Pt } from "./route";

export type Money = [min: number, max: number];

/** Opal daily caps (spec §6.6), as of 30 Sep 2026. Update with the July fare change. */
export const OPAL_CAPS = {
  asOf: "2026-09-30",
  /** Friday to Sunday and public holidays. */
  weekend: { adult: 9.65, child: 4.8 },
  /** Monday to Thursday. */
  weekday: { adult: 19.3, child: 9.65 },
} as const;

export interface CapInfo {
  kind: "weekend" | "weekday";
  adult: number;
  child: number;
  /** True when no day was chosen, so the weekend cap is assumed. */
  assumed: boolean;
  holiday: string | null;
}
/** The cap for the day being planned, or the weekend cap when there's no date. */
export function capFor(date?: DateStr): CapInfo {
  if (!date) return { kind: "weekend", ...OPAL_CAPS.weekend, assumed: true, holiday: null };
  const holiday = holidayOn(date);
  const weekendRate = dayType(date) !== "weekday" || weekday(date) === 4;
  const kind = weekendRate ? "weekend" : "weekday";
  return { kind, ...OPAL_CAPS[kind], assumed: false, holiday };
}

/** Group presets (spec §3.2 item 5) and stepper limits. */
export const PRESETS = [
  { key: "solo", label: lib.cost.presets.solo, adults: 1, kids: 0 },
  { key: "date", label: lib.cost.presets.date, adults: 2, kids: 0 },
  { key: "friends", label: lib.cost.presets.friends, adults: 4, kids: 0 },
  { key: "family", label: lib.cost.presets.family, adults: 2, kids: 2 },
] as const;
export type PresetKey = (typeof PRESETS)[number]["key"];
export const ADULTS = { min: 1, max: 8 } as const;
export const KIDS = { min: 0, max: 6 } as const;
export const presetOf = (adults: number, kids: number): PresetKey | "custom" =>
  PRESETS.find((p) => p.adults === adults && p.kids === kids)?.key ?? "custom";

const dol = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
/** "Free", "$8", "$8–10", "$13.40–15.40" */
export const money = (r: Money) => (r[1] <= 0 ? lib.cost.free : r[0] === r[1] ? `$${dol(r[0])}` : `$${dol(r[0])}–${dol(r[1])}`);
const add = (a: Money, b: Money): Money => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Money, k: number): Money => [a[0] * k, a[1] * k];
const round = (a: Money): Money => [Math.round(a[0]), Math.round(a[1])];
const capAt = (a: Money, c: number): Money => [Math.min(a[0], c), Math.min(a[1], c)];

/** The adult fare in the Getting there summary (spec §3.2 item 4): "$4–6 each way", adult Opal fare from the city. */
export function tripFare(pt: Pt): { label: string; note: string } {
  const no = pt.nonOpal ?? [0, 0];
  const each = add(pt.fare, no);
  if (each[1] <= 0) return { label: lib.cost.free, note: lib.cost.noFare };
  return {
    label: lib.cost.eachWay(money(each)),
    note: pt.nonOpal ? lib.cost.adultFareWithFerry(money(no)) : lib.cost.adultOpalFare,
  };
}

export interface CostLine {
  key: string;
  label: string;
  value: Money;
  note: string;
}
export interface Estimate {
  lines: CostLine[];
  total: Money;
  perPerson: Money;
  totalLabel: string;
  perPersonLabel: string;
  cap: CapInfo;
  /** Shown next to the total: which fares were assumed. */
  fareNote: string;
}

export interface EstimateInput {
  /** Only the trip from the city and the costs are read. */
  activity: { routes: { pt: Pt }; costs: Activity["costs"] };
  adults: number;
  kids: number;
  /** Extras switched on or off by the user; missing ids use the extra's default. */
  extras?: Record<string, boolean>;
  /** The day being planned (spec §6.6). */
  date?: DateStr;
}

/**
 * The cost estimate (spec §6.6). Each line is rounded to whole dollars and the total is their sum,
 * so the breakdown always adds up.
 */
export function estimate({ activity: a, adults, kids, extras = {}, date }: EstimateInput): Estimate {
  const people = adults + kids;
  const cap = capFor(date);
  // Transport is always public transport from the city centre, return (spec §6.6, D14).
  const p = a.routes.pt;
  const no = p.nonOpal ?? [0, 0];
  const adultDay = add(capAt(mul(p.fare, 2), cap.adult), mul(no, 2));
  const kidDay = add(capAt(p.fare, cap.child), mul(p.nonOpalChild ?? mul(no, 0.5), 2));
  const capped = p.fare[1] * 2 > cap.adult;
  const notes = [
    lib.cost.fromCity,
    capped ? lib.cost.capApplies(cap.kind, cap.adult.toFixed(2), kids ? cap.child.toFixed(2) : null) : "",
    p.nonOpal ? lib.cost.ferryNotCapped(money(round(mul(no, 2)))) : "",
    kids ? lib.cost.kidsHalf : "",
  ];
  const transport: CostLine = {
    key: "transport",
    label: p.nonOpal ? lib.cost.opalFaresFerry : lib.cost.opalFares,
    value: round(add(mul(adultDay, adults), mul(kidDay, kids))),
    note: notes.filter(Boolean).join(" "),
  };
  const fareNote = cap.assumed
    ? lib.cost.weekendFaresAssumed
    : cap.kind === "weekday"
      ? lib.cost.weekdayFares
      : cap.holiday
        ? lib.cost.holidayFares(cap.holiday)
        : lib.cost.weekendFares;
  const C = a.costs;
  const entry: CostLine = {
    key: "entry",
    label: lib.cost.entry,
    value: round(add(mul(C.entry, adults), mul(C.entryChild ?? C.entry, kids))),
    note: C.entry[1] > 0 ? (C.entryChild ? lib.cost.kidsEach(money(C.entryChild)) : "") : lib.cost.noTicket,
  };
  const extraLines: CostLine[] = C.extras
    .filter((e) => extras[e.id] ?? e.on)
    .map((e) => ({ key: `extra:${e.id}`, label: e.label, value: round(mul(e.per, people)), note: lib.cost.perPersonShort(money(e.per)) }));
  const lines = [transport, entry, ...extraLines];
  const total = lines.reduce<Money>((t, l) => add(t, l.value), [0, 0]);
  const perPerson = round(mul(total, 1 / people));
  return {
    lines, total, perPerson, cap, fareNote,
    totalLabel: money(total),
    perPersonLabel: total[1] <= 0 ? lib.cost.free : lib.cost.perPerson(money(perPerson)),
  };
}
