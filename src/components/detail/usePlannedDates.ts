import { $plan } from "~/stores/plan";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { useToday } from "~/stores/useToday";
import { datesPlanned, emptyPlan, type Plan } from "~/lib/plan";

const EMPTY: Plan = emptyPlan();
/** Dates from today onwards on which this activity is planned (empty while hydrating). */
export function usePlannedDates(id: string): string[] {
  const plan = useHydratedStore($plan, EMPTY);
  const today = useToday();
  return today ? datesPlanned(plan, id, today) : [];
}
