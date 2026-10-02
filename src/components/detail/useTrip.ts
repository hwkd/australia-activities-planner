import { useEffect } from "react";
import { $trip, initTrip, SERVER_TRIP } from "~/stores/trip";
import { useHydratedStore } from "~/stores/useHydratedStore";

/** The activity page's shared state for an island, started once per page. */
export function useTrip() {
  useEffect(() => initTrip(), []);
  return useHydratedStore($trip, SERVER_TRIP);
}
