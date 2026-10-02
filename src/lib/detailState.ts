import type { GroupFilter } from "./ranking";
import { PRESETS, presetOf, ADULTS, KIDS } from "./cost";

/**
 * What the activity page remembers while the user is on it (spec §3.2): the group, extras, the
 * selected map place and the map toggles. There's no origin or travel mode since D14.
 */
export interface DetailState {
  adults: number;
  kids: number;
  /** Extras the user switched; missing ids use the activity's defaults. */
  extras: Record<string, boolean>;
  /** Selected map place (its number). */
  poi: number | null;
  showBack: boolean;
  showFacilities: boolean;
}

/** The group preset that matches Discover's group filter ("Anyone" starts as a date: 2 adults). */
export function initialDetail(group: GroupFilter = "any"): DetailState {
  const p = PRESETS.find((x) => x.key === group) ?? PRESETS.find((x) => x.key === "date")!;
  return { adults: p.adults, kids: p.kids, extras: {}, poi: null, showBack: false, showFacilities: true };
}

/** Opening a "Make a day of it" pairing (spec §3.2 item 9): the group size carries over; the map place, extras and Way back reset. */
export const carryOver = (s: DetailState): DetailState => ({ ...s, extras: {}, poi: null, showBack: false });

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const setPeople = (s: DetailState, adults: number, kids: number): DetailState => ({
  ...s,
  adults: clamp(adults, ADULTS.min, ADULTS.max),
  kids: clamp(kids, KIDS.min, KIDS.max),
});
export const presetKey = (s: DetailState) => presetOf(s.adults, s.kids);
/** Tapping a place selects it; tapping it again clears it. */
export const togglePoi = (s: DetailState, n: number): DetailState => ({ ...s, poi: s.poi === n ? null : n });
