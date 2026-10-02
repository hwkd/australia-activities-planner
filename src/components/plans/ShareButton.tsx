import { showToast } from "~/stores/ui";
import { shareUrl, MAX_DAYS } from "~/lib/share";
import { addDays, shortLabel, type DateStr } from "~/lib/dates";
import { track } from "~/lib/analytics";
import type { Plan } from "~/lib/plan";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

/** Share a day or the next 14 days (spec §6.5): Web Share, or copy the link with a "Link copied" toast. */
export default function ShareButton({ plan, date, today }: { plan: Plan; date: DateStr; today: DateStr }) {
  const share = async (scope: "day" | "fortnight") => {
    const dates = scope === "day" ? [date] : Array.from({ length: MAX_DAYS }, (_, i) => addDays(today, i));
    const r = shareUrl(plan, dates, location.origin);
    if (!r.dates.length) return showToast(t.plans.share.nothing);
    track({ name: "plan_share", props: { scope } });
    const title = scope === "day" ? t.plans.share.dayTitle(shortLabel(date)) : t.plans.share.fortnightTitle;
    const note = r.trimmed ? t.plans.share.trimmed(r.dates.length) : "";
    try {
      if (navigator.share) {
        await navigator.share({ title, url: r.url });
        if (note) showToast(t.plans.share.shared(note));
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(r.url);
      showToast(t.plans.share.copied(note));
    } catch {
      window.prompt(t.plans.share.copyPrompt, r.url);
    }
  };
  const style = { background: "transparent", color: "var(--ink)", borderColor: "var(--line)" };
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => share("day")} className="pb press text-[14.5px]" style={style}>
        <Icon name="external" size={17} />
        {t.plans.share.day}
      </button>
      <button type="button" onClick={() => share("fortnight")} className="pb press text-[14.5px]" style={style}>
        <Icon name="external" size={17} />
        {t.plans.share.fortnight}
      </button>
    </div>
  );
}
