import { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { $plan, updatePlan } from "~/stores/plan";
import { $sheet, showToast, type Sheet as SheetState } from "~/stores/ui";
import { addItem, datesPlanned, moveItem, type Plan } from "~/lib/plan";
import { checkAdd, spanOf, TIME_PRESETS, EARLIEST_START, LATEST_START, type PlanCard } from "~/lib/planDays";
import { clockLabel, dayType, lastPlannableDate, longLabel, monthOf, relativeLabel, shortLabel, todayInSydney, isTimeStr, type DateStr } from "~/lib/dates";
import { holidayOn } from "~/lib/holidays";
import { quickDays } from "~/lib/quickDays";
import { track } from "~/lib/analytics";
import { DEFAULT_WEATHER, FIT_LABEL, WEATHER_WORD } from "~/theme/tokens";
import { FitMeter, Icon, WeatherIcon } from "~/theme/icons";
import MiniMonth from "~/components/shared/MiniMonth";
import Sheet from "./Sheet";
import { t } from "~/strings/en-AU";

const s = t.sheets.addToDay;

type AddSheet = Extract<NonNullable<SheetState>, { kind: "add" }>;
type Slot = "suggested" | (typeof TIME_PRESETS)[number]["key"] | "exact";

interface Props {
  sheet: AddSheet;
  cards: ReadonlyMap<string, PlanCard>;
}

/**
 * Add to a day (spec §3.3), and its edit mode (Change day or time). Quick days, a mini month,
 * time slots or an exact time, then a check of the fit for that day's sky, overlaps (allowed) and
 * closed days (blocked). Confirming adds or moves the plan; edits get an Undo toast.
 */
export default function AddToDaySheet({ sheet, cards }: Props) {
  const plan = useStore($plan);
  const today = todayInSydney();
  const last = lastPlannableDate(today);
  const card = cards.get(sheet.activityId)!;
  const edit = sheet.editOf ?? null;
  const editing = edit ? plan.days[edit.date]?.items.find((i) => i.id === edit.id) : undefined;

  // An event starts on its first day still to come (spec §11.4: only its own dates are offered).
  const earliest = card.dates && card.dates.from > today ? card.dates.from : today;
  const firstDate = edit?.date ?? (sheet.date && sheet.date >= earliest ? sheet.date : earliest);
  const [date, setDate] = useState<DateStr>(firstDate);
  const [month, setMonth] = useState(monthOf(firstDate));
  const [slot, setSlot] = useState<Slot>(editing ? "exact" : "suggested");
  const [exact, setExact] = useState(editing?.start ?? card.suggestedStart);
  const [done, setDone] = useState<{ date: DateStr; start: string } | null>(null);
  // "Pick a date" starts open when the day isn't one of the quick days.
  const [pickOpen, setPickOpen] = useState(() => !quickDays(today, undefined, card.dates).some((q) => q.date === firstDate));

  const start = slot === "suggested" ? card.suggestedStart : slot === "exact" ? exact : TIME_PRESETS.find((p) => p.key === slot)!.time;
  const items = plan.days[date]?.items ?? [];
  const check = checkAdd(date, start, card, items, cards, edit && edit.date === date ? edit.id : undefined);
  const span = spanOf(date, { id: card.id, start }, card);
  const sky = plan.days[date]?.sky;
  const fit = sky ? card.weatherFit[sky] : null;
  const holiday = holidayOn(date);
  const quick = useMemo(() => quickDays(today, date, card.dates), [today, date, card.dates]);
  const planned = datesPlanned(plan, card.id, today);
  const unchanged = !!edit && edit.date === date && editing?.start === start;
  const blocked = check.blocked || check.alreadyPlanned || unchanged;

  const close = () => $sheet.set(null);
  const pickDate = (d: DateStr) => {
    setDate(d);
    setMonth(monthOf(d));
  };

  const confirm = () => {
    if (blocked) return;
    if (edit) {
      const before: Plan = $plan.get();
      updatePlan((p) => moveItem(p, edit.date, date, edit.id, start));
      track({ name: "plan_change", props: { kind: edit.date === date ? "time" : "day" } });
      showToast(edit.date === date ? s.movedTime(clockLabel(span.start)) : s.movedDay(shortLabel(date), clockLabel(span.start)), () => $plan.set(before));
      close();
      return;
    }
    updatePlan((p) => addItem(p, date, card.id, start));
    track({ name: "plan_add", props: { source: sheet.source ?? "card", dayType: dayType(date) } });
    setDone({ date, start: span.start });
  };

  const timeSpan = s.timeSpan(clockLabel(span.start), clockLabel(span.end.time), span.end.date !== date);

  if (done) {
    return (
      <Sheet label={s.done.title} onClose={close} weather={plan.days[done.date]?.sky ?? undefined}>
        <div className="px-5 pt-6 pb-2 text-center" aria-live="polite">
          <span className="pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--sel)", color: "var(--sel-ink)" }} aria-hidden="true">
            <Icon name="check" size={30} strokeWidth={3} />
          </span>
          <h2 className="w90 m-0 mt-4 text-[28px] leading-none font-bold tracking-[-0.03em]" data-autofocus tabIndex={-1}>
            {s.done.heading(longLabel(done.date))}
          </h2>
          <p className="m-0 mt-2 text-sm font-semibold" style={{ color: "var(--mute)" }}>
            {card.name} · <span className="num">{timeSpan}</span>
          </p>
          {fit !== null && sky && (
            <p className="m-0 mt-2 inline-flex items-center gap-2 text-sm font-semibold">
              <FitMeter fit={fit} />
              {s.fitWhen(FIT_LABEL[fit], WEATHER_WORD[sky])}
            </p>
          )}
          <div className="mt-5 grid gap-2">
            <button type="button" onClick={() => $sheet.set({ kind: "export", scope: "item", date: done.date, activityId: card.id })} className="pb press" style={{ background: "var(--sel)", color: "var(--sel-ink)", borderColor: "var(--sel)" }}>
              <Icon name="calendar" size={19} strokeWidth={2.5} />
              {s.done.addToCalendar}
            </button>
            <button type="button" onClick={close} className="pb press" style={{ background: "transparent", color: "var(--ink)", borderColor: "var(--line)" }}>
              {s.done.done}
            </button>
          </div>
          <a href={`/plan?d=${done.date}`} className="press mt-3 inline-flex h-11 items-center gap-1.5 text-sm font-bold no-underline" style={{ color: "var(--ink)" }}>
            {s.done.seeInPlans} <Icon name="next" size={16} />
          </a>
        </div>
      </Sheet>
    );
  }

  const confirmLabel = check.closed
    ? s.confirm.notRunning(shortLabel(date))
    : check.alreadyPlanned
      ? s.confirm.alreadyOn(shortLabel(date))
      : unchanged
        ? s.confirm.noChange
        : edit
          ? s.confirm.move(shortLabel(date), clockLabel(span.start))
          : s.confirm.add(shortLabel(date), clockLabel(span.start));

  return (
    <Sheet
      label={edit ? s.editTitle : s.title}
      onClose={close}
      weather={sky ?? DEFAULT_WEATHER}
      footer={
        <button type="button" disabled={blocked} onClick={confirm} className="pb press disabled:opacity-60" style={{ background: "var(--sel)", color: "var(--sel-ink)", borderColor: "var(--sel)" }}>
          {!blocked && <Icon name={edit ? "check" : "plus"} size={19} strokeWidth={2.5} />}
          <span className="num">{confirmLabel}</span>
        </button>
      }
    >
      <div className="flex items-start gap-2.5 pt-2 pr-2.5 pl-5">
        <div className="min-w-0 flex-1 pt-2">
          <p className="eb m-0" style={{ color: "var(--mute)" }}>
            {edit ? s.editTitle : s.title}
          </p>
          <h2 className="w90 m-0 mt-2 text-[28px] leading-none font-bold tracking-[-0.03em]">{s.heading}</h2>
          <p className="m-0 mt-1.5 truncate text-sm font-semibold" style={{ color: "var(--mute)" }}>
            {card.name}
          </p>
        </div>
        <button type="button" aria-label={t.sheets.sheet.close} onClick={close} data-autofocus className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0" style={{ background: "var(--soft)" }}>
          <Icon name="close" size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-4 pt-4 pb-[18px]">
        {planned.length > 0 && !edit && (
          <p className="m-0 mb-3 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--mute)" }}>
            <Icon name="check" size={15} strokeWidth={2.5} />
            {s.alreadyPlanned(planned.slice(0, 4).map(shortLabel))}
          </p>
        )}

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="k" style={{ color: "var(--mute)" }}>
            {s.quickDays}
          </legend>
          <div className="hs -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pt-0.5 pb-1">
            {quick.map((q) => {
              const on = q.date === date;
              const shut = !!checkAdd(q.date, start, card, [], cards).closed;
              const qs = plan.days[q.date]?.sky;
              return (
                <button
                  key={q.date}
                  type="button"
                  aria-pressed={on}
                  aria-label={s.quickDay(longLabel(q.date), q.holiday, shut, qs ? WEATHER_WORD[qs] : null)}
                  onClick={() => pickDate(q.date)}
                  className="press relative flex h-20 min-w-[60px] flex-[1_0_60px] flex-col items-center justify-between rounded-[18px] border px-1 pt-[9px] pb-2"
                  style={{ background: on ? "var(--sel)" : "var(--glass)", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" }}
                >
                  <span className="text-[11px] font-bold tracking-[0.01em] whitespace-nowrap">{q.label}</span>
                  <span className="num text-[22px] leading-none font-bold" style={{ textDecoration: shut ? "line-through" : "none" }}>
                    {Number(q.date.slice(8))}
                  </span>
                  <span className="flex h-4 items-center text-[10.5px] font-bold tracking-[0.04em] uppercase">
                    {shut ? <span aria-hidden="true">{s.closed}</span> : qs ? <WeatherIcon weather={qs} size={14} strokeWidth={2} /> : null}
                  </span>
                  {q.holiday && <span aria-hidden="true" className="absolute top-[7px] right-[7px] h-[7px] w-[7px] rounded-full" style={{ background: on ? "var(--sel-ink)" : "var(--accent)" }} />}
                </button>
              );
            })}
          </div>
          {quick.some((q) => q.holiday) && (
            <p className="m-0 mt-1.5 flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: "var(--mute)" }}>
              <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              {s.holidays(quick.filter((q) => q.holiday).map((q) => [shortLabel(q.date), q.holiday!]))}
            </p>
          )}
        </fieldset>

        <details className="mt-3.5 rounded-[20px] border" style={{ background: "var(--soft)", borderColor: "var(--line)" }} open={pickOpen} onToggle={(e) => setPickOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-2.5 rounded-[20px] px-3.5">
            <Icon name="calendar" size={18} />
            <span className="flex-1 text-[15px] font-[650]">{s.pickDate}</span>
            <span className="num text-[13.5px] font-semibold" style={{ color: "var(--mute)" }}>
              {shortLabel(date)}
            </span>
          </summary>
          <div className="px-2 pb-2.5">
            <MiniMonth month={month} onMonth={setMonth} selected={date} onPick={pickDate} today={today} last={last} closed={(d) => !!checkAdd(d, start, card, [], cards).closed} />
            <p className="m-0 mx-2 mt-2 text-[12.5px] leading-[1.4]" style={{ color: "var(--mute)" }}>
              {s.calendarKey}
            </p>
          </div>
        </details>

        <fieldset className="m-0 mt-[18px] min-w-0 border-0 p-0">
          <legend className="k" style={{ color: "var(--mute)" }}>
            {s.time}
          </legend>
          <div className="hs -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pt-0.5 pb-1">
            {([{ key: "suggested", label: s.suggested, time: card.suggestedStart }, ...TIME_PRESETS] as const).map((o) => {
              const on = slot === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSlot(o.key)}
                  className="press flex h-14 min-w-[86px] shrink-0 flex-col items-start justify-center gap-[3px] rounded-2xl border px-3.5"
                  style={{ background: on ? "var(--sel)" : "var(--glass)", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" }}
                >
                  <span className="text-[13.5px] font-bold">{o.label}</span>
                  <span className="num text-[12.5px] font-semibold opacity-80">{clockLabel(o.time)}</span>
                </button>
              );
            })}
            <label
              className="press flex h-14 min-w-[110px] shrink-0 cursor-pointer flex-col items-start justify-center gap-[3px] rounded-2xl border px-3.5"
              style={{ background: slot === "exact" ? "var(--sel)" : "var(--glass)", color: slot === "exact" ? "var(--sel-ink)" : "var(--ink)", borderColor: slot === "exact" ? "var(--sel)" : "var(--line)" }}
            >
              <span className="text-[13.5px] font-bold">{s.exactTime}</span>
              <input
                type="time"
                step={900}
                min={EARLIEST_START}
                max={LATEST_START}
                value={exact}
                onFocus={() => setSlot("exact")}
                onChange={(e) => {
                  if (isTimeStr(e.target.value)) {
                    setExact(e.target.value);
                    setSlot("exact");
                  }
                }}
                className="num w-full border-0 bg-transparent p-0 text-[12.5px] font-semibold"
                style={{ color: "inherit", colorScheme: "inherit" }}
              />
            </label>
          </div>
          <p className="m-0 mt-1.5 text-[12.5px]" style={{ color: "var(--mute)" }}>
            {s.suggestedStart(card.name, clockLabel(card.suggestedStart))}
          </p>
        </fieldset>

        <section className="mt-[18px] rounded-[20px] border p-3.5" style={{ background: "var(--soft)", borderColor: "var(--line)" }} aria-live="polite" aria-label={s.check}>
          <h3 className="k m-0" style={{ color: "var(--mute)" }}>
            {s.check}
          </h3>
          <p className="m-0 mt-2 flex flex-wrap items-baseline gap-x-2.5">
            <span className="num w90 text-[22px] font-bold tracking-[-0.02em]">{timeSpan}</span>
            <span className="text-[13.5px] font-semibold" style={{ color: "var(--mute)" }}>
              {relativeLabel(date, today)} · <span className="num">{shortLabel(date)}</span>
            </span>
          </p>
          <div className="mt-2.5 flex items-center gap-2.5">
            {fit !== null ? <FitMeter fit={fit} /> : <Icon name="info" size={16} />}
            <span className="text-sm font-semibold">{fit !== null && sky ? s.fitWhen(FIT_LABEL[fit], WEATHER_WORD[sky]) : s.noSky(shortLabel(date))}</span>
          </div>
          {(check.closed ?? check.overlap?.text) && (
            <p className="leg-in m-0 mt-2.5 flex gap-2 text-[13.5px] leading-[1.4] font-semibold">
              <Icon name="warn" size={16} className="mt-0.5 shrink-0" />
              <span>{check.closed ?? check.overlap?.text}</span>
            </p>
          )}
          {holiday && (
            <p className="leg-in m-0 mt-2.5 flex gap-2 text-[13.5px] leading-[1.4]">
              <Icon name="info" size={16} className="mt-0.5 shrink-0" />
              <span>{s.holiday(holiday)}</span>
            </p>
          )}
        </section>
      </div>
    </Sheet>
  );
}
