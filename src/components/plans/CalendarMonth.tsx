import { addMonths, clockLabel, longLabel, monthGrid, monthName, monthOf, parts, type DateStr } from "~/lib/dates";
import { sortItems } from "~/lib/planDays";
import { holidayOn } from "~/lib/holidays";
import type { Plan } from "~/lib/plan";
import { WEATHER_WORD, THEMES } from "~/theme/tokens";
import { Icon, WeatherIcon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  plan: Plan;
  month: string;
  onMonth: (m: string) => void;
  selected: DateStr;
  onSelect: (d: DateStr) => void;
  today: DateStr;
  last: DateStr;
  /** Days with a warning (overlap, closed day, or a plan that doesn't suit the sky). */
  needsLook: (d: DateStr) => boolean;
  /** Activity names, for the desktop plan chips. */
  names: ReadonlyMap<string, string>;
}

/**
 * The month (spec §3.3): Monday first, today's month to 6 months ahead. Each day is a 44 px+ button
 * whose name says the date, holiday, number of plans, sky and "needs a look".
 */
export default function CalendarMonth({ plan, month, onMonth, selected, onSelect, today, last, needsLook, names }: Props) {
  const [y, m] = month.split("-").map(Number);
  return (
    <section aria-labelledby="cal-month" className="glass tr card-in mt-5 rounded-[28px] p-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label={t.plans.calendar.prevMonth} disabled={month <= monthOf(today)} onClick={() => onMonth(addMonths(month, -1))} className="press flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent disabled:opacity-35">
          <Icon name="back" size={20} strokeWidth={2.5} />
        </button>
        <h2 id="cal-month" aria-live="polite" className="w90 m-0 text-xl font-bold tracking-[-0.02em]">
          {monthName(m)} {y}
        </h2>
        <button type="button" aria-label={t.plans.calendar.nextMonth} disabled={month >= monthOf(last)} onClick={() => onMonth(addMonths(month, 1))} className="press flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent disabled:opacity-35">
          <Icon name="back" size={20} strokeWidth={2.5} className="rotate-180" />
        </button>
      </div>
      <div aria-hidden="true" className="cgrid mt-1">
        {t.plans.calendar.weekdays.map((l, i) => (
          <span key={i} className="flex h-6 items-center justify-center text-[11.5px] tracking-[0.06em]" style={{ color: "var(--mute)", fontWeight: i >= 5 ? 800 : 600 }}>
            {l}
          </span>
        ))}
      </div>
      <div className="grid gap-[3px]">
        {monthGrid(month).map((week, wi) => (
          <div key={wi} className="cgrid">
            {week.map((d, di) => {
              if (monthOf(d) !== month) return <span key={d} />;
              const e = plan.days[d];
              const n = e?.items.length ?? 0;
              const past = d < today;
              const on = d === selected;
              const hol = holidayOn(d);
              const warn = !past && n > 0 && needsLook(d);
              const cell = t.plans.calendar.cell;
              const aria = [longLabel(d), d === today && cell.today, hol, n ? cell.plans(n) : cell.noPlans, e?.sky && WEATHER_WORD[e.sky], warn && cell.needsLook, past && cell.past].filter(Boolean).join(", ");
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={aria}
                  aria-pressed={on}
                  onClick={() => onSelect(d)}
                  className="cell"
                  style={{
                    background: on ? "var(--sel)" : di >= 5 ? "var(--soft)" : "transparent",
                    color: on ? "var(--sel-ink)" : "var(--ink)",
                    boxShadow: d === today && !on ? "inset 0 0 0 2px var(--ink)" : "none",
                    opacity: past && !on ? 0.45 : 1,
                  }}
                >
                  {hol && (
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" className="absolute top-1 left-1" style={{ color: on ? "var(--sel-ink)" : "var(--accent)" }}>
                      <path d="M5 21V4h11l-2 4 2 4H5" fill="currentColor" />
                    </svg>
                  )}
                  {e?.sky && (
                    <span className="cmini" aria-hidden="true" style={{ background: THEMES[e.sky].seg }}>
                      <WeatherIcon weather={e.sky} size={11} strokeWidth={2.4} />
                    </span>
                  )}
                  <span className="cnum" aria-hidden="true" style={{ fontWeight: on || d === today ? 800 : 600 }}>
                    {parts(d)[2]}
                  </span>
                  {n > 0 && (
                    <span className="cchips" aria-hidden="true">
                      {sortItems(e!.items)
                        .slice(0, 2)
                        .map((it) => (
                          <span key={it.id} className="cchip" style={{ background: on ? "var(--sel-ink)" : "var(--soft)", color: on ? "var(--sel)" : "var(--ink)" }}>
                            <b className="num">{clockLabel(it.start)}</b> {names.get(it.id) ?? it.id}
                          </span>
                        ))}
                      {n > 2 && <span className="cmore">{t.plans.calendar.more(n - 2)}</span>}
                    </span>
                  )}
                  <span className="cdots" aria-hidden="true">
                    {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                      <span key={i} className="cdot" style={{ background: on ? "var(--sel-ink)" : "var(--accent)" }} />
                    ))}
                    {warn && <Icon name="warn" size={9} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <ul aria-hidden="true" className="m-0 mt-2.5 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 px-1 text-xs font-semibold" style={{ color: "var(--mute)" }}>
        <li className="flex items-center gap-1.5">
          <span className="cdot" style={{ background: "var(--accent)" }} />
          {t.plans.calendar.legend.plans}
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="warn" size={11} strokeWidth={2.5} />
          {t.plans.calendar.legend.needsLook}
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
            <path d="M5 21V4h11l-2 4 2 4H5" fill="currentColor" />
          </svg>
          {t.plans.calendar.legend.holiday}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: THEMES.sunny.seg }} />
          {t.plans.calendar.legend.skySet}
        </li>
      </ul>
    </section>
  );
}
