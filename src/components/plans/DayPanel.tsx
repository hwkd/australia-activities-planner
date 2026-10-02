import { lazy, Suspense, useState } from "react";
import { $plan, updatePlan } from "~/stores/plan";
import { $sheet, showToast } from "~/stores/ui";
import { removeItem, setSky, setStart, swapItem } from "~/lib/plan";
import { dayItems, durationLabel, nudge, NUDGE_MINUTES, type PlanCard } from "~/lib/planDays";
import { clockLabel, relativeLabel, shortLabel, longLabel, type DateStr } from "~/lib/dates";
import { holidayOn } from "~/lib/holidays";
import { track } from "~/lib/analytics";
import type { Plan } from "~/lib/plan";
import type { Weather } from "~/stores/weather";
import { FIT_LABEL, WEATHER_WORD } from "~/theme/tokens";
import { FitMeter, Icon } from "~/theme/icons";
import SkyPicker from "~/components/shared/SkyPicker";
import ForecastNote from "~/components/shared/ForecastNote";
import { restoreForecastSky } from "~/lib/forecast";
import ShareButton from "./ShareButton";
import { t } from "~/strings/en-AU";

// MapLibre loads only when the day map is opened (spec §11.2).
import MapBoundary from "~/components/map/MapBoundary";
const MapView = lazy(() => import("~/components/map/MapView"));

interface Props {
  plan: Plan;
  date: DateStr;
  today: DateStr;
  cards: ReadonlyMap<string, PlanCard>;
  backups: Map<string, PlanCard | null>;
  /** Whether the map tiles are available (spec §11.2). */
  mapView?: boolean;
}

/**
 * The selected day (spec §3.3): label, holiday note, the day's sky, the timeline of plans with
 * fit, warnings, Plan B and controls; or the empty state. Past days are read-only.
 */
export default function DayPanel({ plan, date, today, cards, backups, mapView = false }: Props) {
  const entry = plan.days[date];
  const sky = entry?.sky;
  const past = date < today;
  const rows = dayItems(date, entry?.items ?? [], cards);
  const hol = holidayOn(date);
  const looks = rows.filter((r) => r.warning || (sky && r.card.weatherFit[sky] === 0)).length;

  const before = () => $plan.get();
  const change = (msg: string, f: (p: Plan) => Plan, kind?: "time" | "day") => {
    const prev = before();
    updatePlan(f);
    if (kind) track({ name: "plan_change", props: { kind } });
    showToast(msg, () => $plan.set(prev));
  };
  const [showMap, setShowMap] = useState(false);
  const located = rows.filter((r) => r.card.location);
  const pickSky = (w: Weather) => updatePlan((p) => setSky(p, date, p.days[date]?.sky === w ? undefined : w));

  return (
    <section
      aria-labelledby="cal-day"
      className="glass tr card-in mt-3 rounded-[28px] p-4"
      style={{ animationDelay: "80ms" }}
    >
      <p className="eb m-0" style={{ color: "var(--mute)" }}>
        <span>{relativeLabel(date, today)}</span>
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
        <span>{rows.length ? t.plans.day.plans(rows.length) : t.plans.day.free}</span>
      </p>
      <h2 id="cal-day" className="w90 m-0 mt-2 text-[30px] leading-none font-bold tracking-[-0.03em]">
        {longLabel(date)}
      </h2>
      {looks > 0 && !past && (
        <p
          className="m-0 mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold"
          style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
        >
          <Icon name="warn" size={14} strokeWidth={2.5} />
          {t.plans.day.needLook(looks)}
        </p>
      )}
      {hol && (
        <p className="m-0 mt-2.5 flex gap-2 text-[13.5px] leading-[1.4]">
          <Icon name="info" size={16} className="mt-0.5 shrink-0" />
          <span>{t.plans.day.holiday(hol)}</span>
        </p>
      )}

      {!past && (
        <div className="mt-4">
          <div aria-hidden="true" className="mb-2 flex items-baseline justify-between px-1">
            <p className="k m-0" style={{ color: "var(--mute)" }}>
              {t.plans.day.skyHeading}
            </p>
            <p className="m-0 text-[12.5px] font-semibold" style={{ color: "var(--mute)" }}>
              {sky ? `${WEATHER_WORD[sky][0].toUpperCase()}${WEATHER_WORD[sky].slice(1)}` : t.plans.day.skyNotSet}
            </p>
          </div>
          <SkyPicker variant="compact" value={sky} onChange={pickSky} legend={t.plans.day.skyLegend(longLabel(date))} />
          <p className="m-0 mt-1.5 px-1 text-[12.5px]" style={{ color: "var(--mute)" }}>
            {sky ? t.plans.day.skyHintSet : t.plans.day.skyHint}
          </p>
          <ForecastNote
            date={date}
            area={rows[0]?.card.forecastArea}
            value={sky}
            onUse={(w) => updatePlan((p) => restoreForecastSky(p, date, w))}
          />
        </div>
      )}

      {mapView && located.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={showMap}
            onClick={() => setShowMap(!showMap)}
            className="glass press inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-bold"
            style={{ color: "var(--ink)" }}
          >
            <Icon name="map" size={16} />
            {showMap ? t.plans.dayMap.hide : t.plans.dayMap.show}
          </button>
          {showMap && (
            <div className="mt-3">
              <MapBoundary
                fallback={<p className="glass tr m-0 rounded-[22px] p-4 text-[14.5px]">{t.common.map.unavailable}</p>}
              >
                <Suspense fallback={<p className="m-0 text-[14px]">{t.common.map.loading}</p>}>
                  <MapView
                    pins={rows.flatMap((r, i) =>
                      r.card.location
                        ? [
                            {
                              id: r.card.id,
                              lat: r.card.location.lat,
                              lng: r.card.location.lng,
                              label: String(i + 1),
                              name: t.plans.dayMap.pin(i + 1, r.card.name, clockLabel(r.span.start)),
                            },
                          ]
                        : [],
                    )}
                    dark={sky === "rainy"}
                    label={t.plans.dayMap.label(longLabel(date))}
                    height={300}
                  />
                </Suspense>
              </MapBoundary>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 ? (
        <>
          <ol aria-label={t.plans.timeline.label(longLabel(date))} className="m-0 mt-4 grid list-none gap-2.5 p-0">
            {rows.map((r, i) => {
              const fit = sky ? r.card.weatherFit[sky] : null;
              const key = `${date}:${r.card.id}`;
              const backup = backups.has(key) ? backups.get(key) : undefined;
              const earlier = nudge(r.item.start, -NUDGE_MINUTES);
              const later = nudge(r.item.start, NUDGE_MINUTES);
              const endTime = clockLabel(r.span.end.time);
              return (
                <li key={r.card.id} className="card-in flex gap-2" style={{ animationDelay: `${i * 70}ms` }}>
                  <div aria-hidden="true" className="flex w-[52px] shrink-0 flex-col items-end pt-[13px]">
                    <span className="num text-sm font-bold whitespace-nowrap">{clockLabel(r.span.start)}</span>
                    <span
                      className="num mt-[3px] text-xs font-medium whitespace-nowrap"
                      style={{ color: "var(--mute)" }}
                    >
                      {endTime}
                    </span>
                    <span className="mt-2 mr-2 min-h-4 w-0.5 flex-1 rounded-sm" style={{ background: "var(--line)" }} />
                  </div>
                  <article
                    className="min-w-0 flex-1 rounded-[20px] border pt-3 pr-2 pb-1.5 pl-3"
                    style={{ background: "var(--soft)", borderColor: "var(--line)" }}
                  >
                    <h3 className="m-0 pr-1 text-base leading-[1.25] font-[650]">
                      {r.card.kind === "event" && !r.card.activityId ? (
                        // An event has no page of its own: its name opens the official page.
                        <a
                          href={r.card.link?.url}
                          target="_blank"
                          rel="noopener"
                          className="no-underline"
                          style={{ color: "inherit" }}
                        >
                          {r.card.name}
                          <span className="sr-only">{t.detail.newTab}</span>
                        </a>
                      ) : (
                        <a
                          href={`/a/${r.card.activityId ?? r.card.id}?day=${date}`}
                          className="no-underline"
                          style={{ color: "inherit" }}
                        >
                          {r.card.name}
                        </a>
                      )}
                    </h3>
                    <p className="sr-only">{t.plans.timeline.time(clockLabel(r.span.start), endTime)}</p>
                    <p className="m-0 mt-[3px] text-[13px]" style={{ color: "var(--mute)" }}>
                      {t.plans.timeline.meta(r.card.area, durationLabel(r.card))}
                    </p>
                    <p
                      className="m-0 mt-[9px] inline-flex min-h-7 items-center gap-[7px] rounded-full border py-[3px] pr-[11px] pl-[9px] text-[12.5px] font-bold"
                      style={{ background: "var(--soft)", borderColor: "var(--line)" }}
                    >
                      {fit !== null ? <FitMeter fit={fit} /> : <Icon name="info" size={14} />}
                      {fit !== null && sky
                        ? t.plans.timeline.fit(FIT_LABEL[fit], WEATHER_WORD[sky])
                        : t.plans.timeline.noFit}
                    </p>
                    {r.warning && (
                      <p className="leg-in m-0 mt-[9px] flex gap-[7px] pr-1 text-[13px] leading-[1.4]">
                        <Icon name="warn" size={15} className="mt-0.5 shrink-0" />
                        <span>{r.warning.text}</span>
                      </p>
                    )}
                    {fit === 0 && !past && backup !== undefined && (
                      <div
                        className="leg-in mt-2.5 mr-1 flex gap-2.5 rounded-2xl p-3"
                        style={{ background: "var(--soft)" }}
                      >
                        <span className="swing mt-px shrink-0" aria-hidden="true" style={{ color: "var(--accent)" }}>
                          <Icon name="return" size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="k block text-[11px]">{t.plans.planB.heading}</span>
                          {backup ? (
                            <>
                              <span className="w90 mt-[3px] block text-lg leading-[1.12] font-bold tracking-[-0.015em]">
                                {backup.name}
                              </span>
                              <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--mute)" }}>
                                {t.plans.planB.meta(
                                  backup.area,
                                  FIT_LABEL[backup.weatherFit[sky!]],
                                  WEATHER_WORD[sky!],
                                )}
                              </span>
                              <button
                                type="button"
                                aria-label={t.plans.planB.swapLabel(r.card.name, backup.name, clockLabel(r.span.start))}
                                onClick={() => {
                                  const prev = before();
                                  updatePlan((p) => swapItem(p, date, r.card.id, backup.id));
                                  track({ name: "plan_b_swap", props: {} });
                                  showToast(t.plans.planB.swapped(backup.name), () => $plan.set(prev));
                                }}
                                className="press mt-2.5 inline-flex h-11 items-center gap-[7px] rounded-[14px] border-0 px-[15px] text-sm font-bold"
                                style={{ background: "var(--sel)", color: "var(--sel-ink)" }}
                              >
                                <Icon name="return" size={16} strokeWidth={2.5} />
                                {t.plans.planB.swap}
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="mt-[3px] block text-[14.5px] font-semibold">
                                {t.plans.planB.moveHint}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  $sheet.set({
                                    kind: "add",
                                    activityId: r.card.id,
                                    editOf: { date, id: r.card.id },
                                    source: "calendar",
                                  })
                                }
                                className="press mt-2.5 inline-flex h-11 items-center rounded-[14px] border-0 px-[15px] text-sm font-bold"
                                style={{ background: "var(--sel)", color: "var(--sel-ink)" }}
                              >
                                {t.plans.planB.changeDay}
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                    {!past && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          aria-label={t.plans.timeline.earlier(r.card.name)}
                          disabled={!earlier}
                          onClick={() =>
                            earlier &&
                            change(
                              t.plans.timeline.movedTo(clockLabel(earlier)),
                              (p) => setStart(p, date, r.card.id, earlier),
                              "time",
                            )
                          }
                          className="tb press disabled:opacity-40"
                        >
                          {t.plans.timeline.minus30}
                        </button>
                        <button
                          type="button"
                          aria-label={t.plans.timeline.later(r.card.name)}
                          disabled={!later}
                          onClick={() =>
                            later &&
                            change(
                              t.plans.timeline.movedTo(clockLabel(later)),
                              (p) => setStart(p, date, r.card.id, later),
                              "time",
                            )
                          }
                          className="tb press disabled:opacity-40"
                        >
                          {t.plans.timeline.plus30}
                        </button>
                        <span
                          aria-hidden="true"
                          className="pl-0.5 text-xs font-semibold"
                          style={{ color: "var(--mute)" }}
                        >
                          {t.plans.timeline.min}
                        </span>
                        <span className="ml-auto flex">
                          <button
                            type="button"
                            aria-label={t.plans.timeline.changeDay(r.card.name)}
                            onClick={() =>
                              $sheet.set({
                                kind: "add",
                                activityId: r.card.id,
                                editOf: { date, id: r.card.id },
                                source: "calendar",
                              })
                            }
                            className="ib press"
                          >
                            <Icon name="calendar" size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={t.plans.timeline.addToCalendar(r.card.name)}
                            onClick={() => $sheet.set({ kind: "export", scope: "item", date, activityId: r.card.id })}
                            className="ib press"
                          >
                            <Icon name="external" size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={t.plans.timeline.remove(r.card.name, shortLabel(date))}
                            onClick={() =>
                              change(t.plans.timeline.removed(r.card.name), (p) => removeItem(p, date, r.card.id))
                            }
                            className="ib press"
                          >
                            <Icon name="close" size={18} />
                          </button>
                        </span>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
          {!past && (
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => $sheet.set({ kind: "export", scope: "day", date })}
                className="pb press"
                style={{ background: "var(--sel)", color: "var(--sel-ink)", borderColor: "var(--sel)" }}
              >
                <Icon name="calendar" size={19} strokeWidth={2.5} />
                {t.plans.day.addToCalendar(shortLabel(date))}
              </button>
              <ShareButton plan={plan} date={date} today={today} />
            </div>
          )}
        </>
      ) : (
        <div
          className="mt-4 rounded-[20px] border p-4"
          style={{ background: "var(--soft)", borderColor: "var(--line)" }}
        >
          <p className="w90 m-0 text-lg font-bold">{t.plans.day.nothingPlanned(shortLabel(date))}</p>
          {!past && (
            <>
              <p className="m-0 mt-1 text-sm leading-[1.45]" style={{ color: "var(--mute)" }}>
                {t.plans.day.emptyHint}
              </p>
              <a
                href={`/?w=${sky ?? "sunny"}&day=${date}`}
                className="press mt-3 inline-flex h-11 items-center gap-1.5 rounded-[14px] px-4 text-sm font-bold no-underline"
                style={{ background: "var(--sel)", color: "var(--sel-ink)" }}
              >
                {t.plans.day.findIdeas} <Icon name="next" size={16} />
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
