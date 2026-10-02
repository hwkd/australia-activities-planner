import { lazy, Suspense, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { $sheet, $toast } from "~/stores/ui";
import { initPlan } from "~/stores/plan";
import { applyForecastToPlan, loadForecast } from "~/stores/forecast";
import type { PlanCard } from "~/lib/planDays";
import UndoToast from "~/components/sheets/UndoToast";

// Sheet code loads only the first time one opens, so it isn't in any page's first load.
const AddToDaySheet = lazy(() => import("~/components/sheets/AddToDaySheet"));
const CalendarExportSheet = lazy(() => import("~/components/sheets/CalendarExportSheet"));

/**
 * One host for global overlays on every page (`client:idle`): Add to a day, Add to your calendar and
 * the Undo toast. Gets a compact index of every activity (for overlaps and names), and runs the
 * plan's one-time migration and clean-up.
 */
export default function SheetHost({ cards = [] }: { cards?: PlanCard[] }) {
  const sheet = useStore($sheet);
  const toast = useStore($toast);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  useEffect(() => {
    initPlan(cards);
    // Forecast days get their sky pre-set (spec §11.1): from the saved forecast first, then a fresh one.
    applyForecastToPlan(cards);
    void loadForecast().then(() => applyForecastToPlan(cards));
  }, [cards]);
  return (
    <>
      <Suspense fallback={null}>
        {sheet?.kind === "add" && byId.has(sheet.activityId) && <AddToDaySheet key={`${sheet.activityId}-${sheet.date}-${sheet.editOf?.date}`} sheet={sheet} cards={byId} />}
        {sheet?.kind === "export" && <CalendarExportSheet sheet={sheet} cards={byId} />}
      </Suspense>
      {toast && <UndoToast key={toast.id} toast={toast} />}
    </>
  );
}
