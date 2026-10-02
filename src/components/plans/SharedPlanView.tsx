import { useState } from "react";
import { $plan, updatePlan } from "~/stores/plan";
import { conflictingDays, saveShared, type DayEntry } from "~/lib/plan";
import { dayItems, type PlanCard } from "~/lib/planDays";
import { clockLabel, longLabel, shortLabel, type DateStr } from "~/lib/dates";
import { useStore } from "@nanostores/react";
import { FIT_LABEL, WEATHER_WORD } from "~/theme/tokens";
import { FitMeter, Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  shared: Record<DateStr, DayEntry>;
  cards: ReadonlyMap<string, PlanCard>;
  onDone: (first: DateStr | null) => void;
}

/** A shared plan, read-only, with Save to my plans; Merge or Replace when days clash (spec §3.4). */
export default function SharedPlanView({ shared, cards, onDone }: Props) {
  const plan = useStore($plan);
  const [asking, setAsking] = useState(false);
  const dates = Object.keys(shared).sort();
  const clashes = conflictingDays(plan, shared);
  const save = (mode: "merge" | "replace") => {
    updatePlan((p) => saveShared(p, shared, mode));
    onDone(dates[0] ?? null);
  };

  return (
    <section aria-labelledby="shared-title" className="glass tr card-in mt-5 rounded-[28px] p-4">
      <p className="eb m-0" style={{ color: "var(--mute)" }}>
        {t.plans.shared.eyebrow}
      </p>
      <h2 id="shared-title" className="w90 m-0 mt-2 text-[30px] leading-none font-bold tracking-[-0.03em]">
        {dates.length ? t.plans.shared.heading(dates.length) : t.plans.shared.empty}
      </h2>
      {dates.map((d) => {
        const e = shared[d];
        return (
          <div key={d} className="mt-4">
            <h3 className="m-0 text-base font-bold">
              {longLabel(d)}
              {e.sky && <span className="ml-2 text-[13px] font-semibold" style={{ color: "var(--mute)" }}>{t.plans.shared.sky(WEATHER_WORD[e.sky])}</span>}
            </h3>
            <ul className="m-0 mt-2 grid list-none gap-1.5 p-0">
              {dayItems(d, e.items, cards).map((r) => (
                <li key={r.card.id} className="flex items-center gap-3 rounded-2xl border px-3 py-2.5" style={{ background: "var(--soft)", borderColor: "var(--line)" }}>
                  <span className="num w-14 shrink-0 text-sm font-bold">{clockLabel(r.span.start)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-[650]">{r.card.name}</span>
                    {e.sky && (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--mute)" }}>
                        <FitMeter fit={r.card.weatherFit[e.sky]} />
                        {FIT_LABEL[r.card.weatherFit[e.sky]]}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {dates.length > 0 && !asking && (
        <button type="button" onClick={() => (clashes.length ? setAsking(true) : save("merge"))} className="pb press mt-5" style={{ background: "var(--sel)", color: "var(--sel-ink)", borderColor: "var(--sel)" }}>
          <Icon name="plus" size={19} strokeWidth={2.5} />
          {t.plans.shared.save}
        </button>
      )}
      {asking && (
        <div className="leg-in mt-5 rounded-[20px] border p-3.5" style={{ background: "var(--soft)", borderColor: "var(--line)" }} role="group" aria-label={t.plans.shared.clashLabel}>
          <p className="m-0 text-sm font-semibold">{t.plans.shared.clash(clashes.map(shortLabel).join(", "))}</p>
          <div className="mt-3 grid gap-2">
            <button type="button" onClick={() => save("merge")} className="pb press" style={{ background: "var(--sel)", color: "var(--sel-ink)", borderColor: "var(--sel)" }}>
              {t.plans.shared.merge}
            </button>
            <button type="button" onClick={() => save("replace")} className="pb press" style={{ background: "transparent", color: "var(--ink)", borderColor: "var(--line)" }}>
              {t.plans.shared.replace}
            </button>
          </div>
        </div>
      )}
      <button type="button" onClick={() => onDone(null)} className="press mt-3 h-11 w-full rounded-[14px] border-0 bg-transparent text-sm font-bold" style={{ color: "var(--ink)" }}>
        {t.plans.shared.notNow}
      </button>
    </section>
  );
}
