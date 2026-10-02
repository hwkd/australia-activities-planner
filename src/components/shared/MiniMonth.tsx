import { addMonths, monthGrid, monthName, monthOf, parts, longLabel, type DateStr } from "~/lib/dates";
import { holidayOn } from "~/lib/holidays";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  month: string;
  onMonth: (m: string) => void;
  selected: DateStr | null;
  onPick: (d: DateStr) => void;
  today: DateStr;
  last: DateStr;
  /** Days the activity doesn't run: struck through, say "Closed", can't be confirmed (still pickable to explain). */
  closed?: (d: DateStr) => boolean;
}

/** A compact month (Monday first) for Add to a day's "Pick a date". Past days are disabled. */
export default function MiniMonth({ month, onMonth, selected, onPick, today, last, closed }: Props) {
  const [y, m] = month.split("-").map(Number);
  const canPrev = month > monthOf(today);
  const canNext = month < monthOf(last);
  return (
    <div>
      <div className="flex items-center justify-between pb-1 pl-2">
        <p className="m-0 text-[15px] font-bold" aria-live="polite">
          {monthName(m)} {y}
        </p>
        <div className="flex gap-0.5">
          <button type="button" aria-label={t.plans.calendar.prevMonth} disabled={!canPrev} onClick={() => onMonth(addMonths(month, -1))} className="press flex h-11 w-11 items-center justify-center rounded-[14px] border-0 bg-transparent disabled:opacity-35">
            <Icon name="back" size={18} strokeWidth={2.5} />
          </button>
          <button type="button" aria-label={t.plans.calendar.nextMonth} disabled={!canNext} onClick={() => onMonth(addMonths(month, 1))} className="press flex h-11 w-11 items-center justify-center rounded-[14px] border-0 bg-transparent disabled:opacity-35">
            <Icon name="back" size={18} strokeWidth={2.5} className="rotate-180" />
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-7 gap-0.5 pb-1 text-center text-[11.5px]" style={{ color: "var(--mute)" }}>
        {t.plans.calendar.weekdays.map((l, i) => (
          <span key={i} style={{ fontWeight: i >= 5 ? 800 : 600 }}>
            {l}
          </span>
        ))}
      </div>
      {monthGrid(month).map((week, wi) => (
        <div key={wi} className="mt-0.5 grid grid-cols-7 gap-0.5">
          {week.map((d) => {
            const inMonth = monthOf(d) === month;
            if (!inMonth) return <span key={d} />;
            const past = d < today || d > last;
            const on = d === selected;
            const shut = closed?.(d) ?? false;
            const hol = holidayOn(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                disabled={past}
                aria-label={t.plans.calendar.miniDay(longLabel(d), hol, shut, d === today)}
                onClick={() => onPick(d)}
                className="press relative flex h-[46px] flex-col items-center justify-center gap-[3px] rounded-[14px] border-0 p-0 disabled:opacity-35"
                style={{ background: on ? "var(--sel)" : "transparent", color: on ? "var(--sel-ink)" : "var(--ink)", boxShadow: d === today && !on ? "inset 0 0 0 1.5px var(--ink)" : "none" }}
              >
                <span className="num text-[14.5px] leading-none" style={{ fontWeight: on || d === today ? 800 : 600, textDecoration: shut ? "line-through" : "none" }}>
                  {parts(d)[2]}
                </span>
                {hol && <span aria-hidden="true" className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: on ? "var(--sel-ink)" : "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
