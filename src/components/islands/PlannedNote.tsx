import { shortLabel } from "~/lib/dates";
import { Icon } from "~/theme/icons";
import { usePlannedDates } from "~/components/detail/usePlannedDates";
import { t } from "~/strings/en-AU";

/** "Planned for Sat 3 Oct" under the activity's facts (spec §3.2 item 1), when it's planned. */
export default function PlannedNote({ id }: { id: string }) {
  const dates = usePlannedDates(id);
  if (!dates.length) return null;
  const list = dates.slice(0, 3).map(shortLabel).join(", ") + (dates.length > 3 ? t.detail.addToDay.andMore(dates.length - 3) : "");
  return (
    <p className="m-0 mx-1.5 mt-2.5 flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: "var(--sky-mute)" }}>
      <Icon name="check" size={16} strokeWidth={2.5} />
      {t.detail.addToDay.plannedFor(list)}
    </p>
  );
}
