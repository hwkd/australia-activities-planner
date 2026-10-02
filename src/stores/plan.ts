import { safeStorage, writeDurably } from "./storage";
import { persistentAtom } from "@nanostores/persistent";
import { emptyPlan, migrateV1, normalizePlan, prunePast, PLAN_KEY, PLAN_V1_KEY, type Plan } from "~/lib/plan";
import { todayInSydney } from "~/lib/dates";
import type { PlanCard } from "~/lib/planDays";

function decode(s: string): Plan {
  try {
    return normalizePlan(JSON.parse(s)) ?? emptyPlan();
  } catch {
    return emptyPlan();
  }
}

/**
 * The user's plans (spec §4.4), in localStorage under `swf.plan.v2`, falling back to memory when
 * storage is blocked. Syncs across tabs through the storage event.
 */
export const $plan = persistentAtom<Plan>(PLAN_KEY, emptyPlan(), { encode: JSON.stringify, decode });

/** Edits the plan with one of the pure functions in lib/plan. */
export const updatePlan = (f: (p: Plan) => Plan) => $plan.set(f($plan.get()));

let initialised = false;
/**
 * Runs once per page, from the first island that has the activity list: migrates a v1 weekend plan
 * (deleting v1 only after v2 is really saved), drops unknown activities and prunes old days.
 */
export function initPlan(cards: readonly PlanCard[], today = todayInSydney()): void {
  // Pages without the activity list (404, privacy) can't migrate; leave the plan for a page that can.
  if (initialised || !cards.length) return;
  initialised = true;
  const byId = new Map(cards.map((c) => [c.id, c]));
  if (!(PLAN_KEY in safeStorage) && PLAN_V1_KEY in safeStorage) {
    let migrated: Plan | null = null;
    try {
      migrated = migrateV1(JSON.parse(safeStorage[PLAN_V1_KEY]), byId);
    } catch {
      /* unreadable v1: leave it alone */
    }
    if (migrated) {
      if (writeDurably(PLAN_KEY, JSON.stringify(migrated))) delete safeStorage[PLAN_V1_KEY];
      $plan.set(migrated);
    }
  }
  // Plans for activities that aren't (currently) published are kept, not deleted: an editor may have
  // unpublished one briefly to fix it. The UI hides them while they're unknown (dayItems skips them).
  const current = $plan.get();
  const cleaned = prunePast(normalizePlan(current) ?? emptyPlan(), today);
  if (JSON.stringify(cleaned.days) !== JSON.stringify(current.days)) $plan.set({ ...cleaned, updatedAt: current.updatedAt });
}

/** Test hook. */
export const resetPlanInit = () => {
  initialised = false;
};
