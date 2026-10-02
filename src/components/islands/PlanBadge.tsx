import { $plan } from "~/stores/plan";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { useToday } from "~/stores/useToday";
import { emptyPlan, type Plan } from "~/lib/plan";
import { t } from "~/strings/en-AU";

const EMPTY: Plan = emptyPlan();

/** How many plans are coming up, on the My plans tab (`client:idle`). Hidden when there are none. */
export default function PlanBadge() {
  const plan = useHydratedStore($plan, EMPTY);
  const today = useToday();
  const n = today ? Object.entries(plan.days).filter(([d]) => d >= today).reduce((sum, [, e]) => sum + e.items.length, 0) : 0;
  if (!n) return null;
  return (
    <span className="tab-badge">
      {n}
      <span className="sr-only">{t.common.planBadge}</span>
    </span>
  );
}
