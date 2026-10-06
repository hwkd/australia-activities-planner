import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { $plan, initPlan } from "~/stores/plan";
import { $forecastAlerts, dismissForecastAlerts } from "~/stores/forecast";
import { addDays, isDateStr, lastPlannableDate, monthOf, relativeLabel, shortLabel, todayInSydney, type DateStr } from "~/lib/dates";
import { upcomingDays } from "~/lib/plan";
import { dayItems, type PlanCard } from "~/lib/planDays";
import { planBs } from "~/lib/planB";
import { readShare } from "~/lib/share";
import { DEFAULT_WEATHER, THEMES, WEATHER_WORD } from "~/theme/tokens";
import { applyTheme } from "~/stores/weather";
import { Icon, WeatherIcon } from "~/theme/icons";
import { t } from "~/strings/en-AU";
import CalendarMonth from "~/components/plans/CalendarMonth";
import DayPanel from "~/components/plans/DayPanel";
import SharedPlanView from "~/components/plans/SharedPlanView";

/**
 * My plans (`client:only`, spec §3.3): the month, the selected day and Coming up. Everything depends
 * on this device's plans and today's date, so nothing is server-rendered. `?d=` selects a day;
 * `?s=` shows a shared plan first (§3.4). The page takes the selected day's sky.
 */
export default function MyPlans({ cards, mapView = false }: { cards: PlanCard[]; mapView?: boolean }) {
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const names = useMemo(() => new Map(cards.map((c) => [c.id, c.name])), [cards]);
  // Migrate and clean the stored plan before choosing the first day to show (idempotent).
  useState(() => initPlan(cards));
  const plan = useStore($plan);
  const forecastAlerts = useStore($forecastAlerts);
  const today = todayInSydney();
  const last = lastPlannableDate(today);
  const q = useMemo(() => new URLSearchParams(location.search), []);
  const [shared, setShared] = useState(() => (q.get("s") ? readShare(q.get("s")!, byId, today) : null));
  const startDay = (() => {
    const d = q.get("d");
    if (isDateStr(d) && d >= addDays(today, -30) && d <= last) return d;
    return upcomingDays(plan, today, 1)[0] ?? today;
  })();
  const [selected, setSelected] = useState<DateStr>(startDay);
  const [month, setMonth] = useState(monthOf(startDay));

  const select = (d: DateStr) => {
    setSelected(d);
    setMonth(monthOf(d));
    history.replaceState(history.state, "", `/plan?d=${d}`);
  };

  // The page takes the selected day's sky, its scene fading in (unset reads as the default theme).
  const sky = plan.days[selected]?.sky ?? DEFAULT_WEATHER;
  useEffect(() => {
    applyTheme(sky);
  }, [sky]);

  const backups = useMemo(() => planBs(plan.days, cards, today), [plan, cards, today]);
  const needsLook = (d: DateStr) => {
    const e = plan.days[d];
    if (!e) return false;
    return dayItems(d, e.items, byId).some((r) => r.warning || (e.sky && r.card.weatherFit[e.sky] === 0));
  };
  const upcoming = upcomingDays(plan, today, 5);
  const alerts = forecastAlerts.filter((a) => a.date >= today);
  // Plans for activities that aren't published right now are kept but hidden, so they don't count.
  const total = Object.entries(plan.days).filter(([d]) => d >= today).reduce((sum, [, e]) => sum + e.items.filter((i) => byId.has(i.id)).length, 0);

  return (
    <>
      <header className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="eb m-0" style={{ color: "var(--sky-mute)" }}>
            <span>{t.plans.header.city}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
            <span>{t.plans.header.comingUp(total)}</span>
          </p>
          <h1 className="w90 m-0 mt-3.5 text-[46px] leading-[0.94] font-medium tracking-[-0.035em]" style={{ textShadow: "var(--hl)" }}>
            {t.plans.header.heading}
          </h1>
        </div>
        <button type="button" onClick={() => select(today)} className="glass press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold" style={{ color: "var(--ink)" }}>
          <Icon name="calendar" size={16} />
          {t.plans.header.today}
        </button>
      </header>

      {shared && (
        <SharedPlanView
          shared={shared}
          cards={byId}
          onDone={(first) => {
            setShared(null);
            if (first) select(first);
            else history.replaceState(history.state, "", "/plan");
          }}
        />
      )}

      {alerts.length > 0 && (
        <section role="status" aria-label={t.plans.forecastAlert.label} className="glass-strong card-in mt-4 rounded-[22px] p-3.5">
          <ul className="m-0 grid list-none gap-1 p-0">
            {alerts.map((a) => (
              <li key={a.date}>
                <button type="button" onClick={() => select(a.date)} className="press flex min-h-11 w-full items-center gap-2.5 rounded-[14px] border-0 bg-transparent px-1 text-left text-[14.5px] font-semibold" style={{ color: "var(--ink)" }}>
                  <Icon name="warn" size={16} strokeWidth={2.5} />
                  <span className="flex-1">{t.common.forecast.alert(relativeLabel(a.date, today), WEATHER_WORD[a.sky], a.count)}</span>
                  <Icon name="next" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={dismissForecastAlerts} className="press mt-1 h-11 rounded-[14px] border-0 bg-transparent px-1 text-[13.5px] font-bold underline underline-offset-2" style={{ color: "var(--ink)" }}>
            {t.common.forecast.dismiss}
          </button>
        </section>
      )}

      <CalendarMonth plan={plan} month={month} onMonth={setMonth} selected={selected} onSelect={select} today={today} last={last} needsLook={needsLook} names={names} />
      <DayPanel plan={plan} date={selected} today={today} cards={byId} backups={backups} mapView={mapView} />

      {upcoming.length > 0 && (
        <section aria-labelledby="cal-up" className="coming-up mt-6">
          <h2 id="cal-up" className="w90 m-0 px-1 text-[26px] leading-[1.05] font-bold tracking-[-0.025em]" style={{ textShadow: "var(--hl)" }}>
            {t.plans.comingUp.heading}
          </h2>
          <ul className="glass m-0 mt-3 list-none rounded-[24px] p-1.5">
            {upcoming.map((d) => {
              const e = plan.days[d];
              const names = dayItems(d, e.items, byId).map((r) => r.card.name).join(", ");
              const warn = needsLook(d);
              return (
                <li key={d}>
                  <button type="button" aria-pressed={d === selected} onClick={() => select(d)} className="press flex min-h-14 w-full items-center gap-3 rounded-[18px] border-0 px-2.5 py-2 text-left" style={{ background: d === selected ? "var(--soft)" : "transparent", color: "var(--ink)" }}>
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px]" aria-hidden="true" style={{ background: e.sky ? THEMES[e.sky].seg : "var(--soft)", color: e.sky ? "#FFFFFF" : "var(--mute)" }}>
                      {e.sky ? <WeatherIcon weather={e.sky} size={17} strokeWidth={2} /> : <Icon name="calendar" size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold">
                        {shortLabel(d)}{" "}
                        <span className="font-semibold" style={{ color: "var(--mute)" }}>
                          {t.plans.comingUp.when(relativeLabel(d, today))}
                        </span>
                      </span>
                      <span className="block truncate text-[13px]" style={{ color: "var(--mute)" }}>
                        {names}
                      </span>
                      <span className="sr-only">{t.plans.comingUp.sky(e.sky && WEATHER_WORD[e.sky])}</span>
                    </span>
                    {warn && (
                      <span>
                        <Icon name="warn" size={16} strokeWidth={2.5} />
                        <span className="sr-only">{t.plans.comingUp.needsLook}</span>
                      </span>
                    )}
                    <Icon name="next" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
