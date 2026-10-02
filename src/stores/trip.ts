import { atom } from "nanostores";
import { carryOver, initialDetail, type DetailState } from "~/lib/detailState";
import { $filters } from "./filters";

/**
 * The activity page's shared state (group, extras, map place, toggles), read and written by RouteMap
 * and CostEstimate. Each page is its own document, so this is per page.
 */
export const SERVER_TRIP: DetailState = initialDetail("any");
export const $trip = atom<DetailState>(SERVER_TRIP);

const CARRY = "swf.trip.carry";
let started = false;

/**
 * Sets the starting state once per page: the group carried over from the activity the user came from
 * through "Make a day of it" (spec §3.2 item 9), otherwise the group from Discover's filter.
 */
export function initTrip(): void {
  if (started) return;
  started = true;
  let carried: DetailState | null = null;
  try {
    const raw = sessionStorage.getItem(CARRY);
    sessionStorage.removeItem(CARRY);
    if (raw) {
      const { adults, kids } = JSON.parse(raw) as Partial<DetailState>;
      if (typeof adults === "number" && typeof kids === "number") carried = { ...initialDetail(), adults, kids };
    }
  } catch {
    /* storage blocked: start fresh */
  }
  $trip.set(carried ? carryOver(carried) : initialDetail($filters.get().group));
  // Following a "Make a day of it" pairing carries the group to the next page.
  document.addEventListener("click", (e) => {
    if ((e.target as Element | null)?.closest?.("a[data-pairing]")) carryTrip();
  });
}

/** Called just before following a pairing link. */
export function carryTrip(): void {
  const { adults, kids } = $trip.get();
  try {
    sessionStorage.setItem(CARRY, JSON.stringify({ adults, kids }));
  } catch {
    /* fine: the next page starts fresh */
  }
}

export const updateTrip = (f: (s: DetailState) => DetailState) => $trip.set(f($trip.get()));
