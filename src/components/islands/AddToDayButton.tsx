import { $sheet, $planningDate } from "~/stores/ui";
import { shortLabel } from "~/lib/dates";
import { Icon } from "~/theme/icons";
import { usePlannedDates } from "~/components/detail/usePlannedDates";
import { t } from "~/strings/en-AU";

/**
 * The activity page's sticky "Add to a day" (spec §3.2 item 10, `client:idle`). Reads
 * "Planned · Sat 3 Oct" when it's planned; either way it opens the Add to a day sheet.
 */
export default function AddToDayButton({ id, name }: { id: string; name: string }) {
  const dates = usePlannedDates(id);
  const s = t.detail.addToDay;
  const label = dates.length === 0 ? s.label : dates.length === 1 ? s.plannedOn(shortLabel(dates[0])) : s.plannedDays(dates.length);
  const open = () => {
    const date = $planningDate.get();
    $sheet.set({ kind: "add", activityId: id, source: "detail", ...(date ? { date } : {}) });
  };
  return (
    <button
      type="button"
      onClick={open}
      // The accessible name starts with the visible label (WCAG 2.5.3).
      aria-label={dates.length ? s.ariaPlanned(label, name) : s.ariaAdd(name)}
      className="press flex h-[54px] w-full items-center justify-center gap-2 rounded-[19px] border text-[14.5px] font-bold"
      style={{ background: "var(--sel)", color: "var(--sel-ink)", borderColor: "var(--sel)" }}
    >
      <Icon name={dates.length ? "check" : "calendar"} size={19} strokeWidth={2.5} />
      {label}
    </button>
  );
}
