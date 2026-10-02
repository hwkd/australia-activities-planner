import { useState } from "react";
import { $plan, updatePlan } from "~/stores/plan";
import { showToast } from "~/stores/ui";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { useToday } from "~/stores/useToday";
import { emptyPlan, removeItem, setSky, swapItem, upcomingDays, type Plan } from "~/lib/plan";
import { addDays, clockLabel, dayName, daysBetween, relativeLabel, shortLabel } from "~/lib/dates";
import { dayItems, durationLabel, type PlanCard } from "~/lib/planDays";
import { planBs } from "~/lib/planB";
import { shareUrl, MAX_DAYS } from "~/lib/share";
import { track } from "~/lib/analytics";
import { WEATHERS, type Weather } from "~/stores/weather";
import { FitMeter, Icon, WeatherIcon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

const EMPTY: Plan = emptyPlan();
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/**
 * Discover's desktop rail (`client:media="(min-width: 1024px)"`, A · Sky Mode — Desktop): Your plans
 * with Open My plans and Share, then a card per coming day in that day's own sky, with its sky picker,
 * the plans (fit, remove) and a Plan B where one doesn't suit the sky. Phones never load it.
 */
export default function ComingUpRail({ cards }: { cards: PlanCard[] }) {
  const plan = useHydratedStore($plan, EMPTY);
  const today = useToday();
  const [shared, setShared] = useState<"copied" | "sent" | null>(null);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const days = today ? upcomingDays(plan, today, 4) : [];
  const backups = today ? planBs(plan.days, cards, today) : new Map<string, PlanCard | null>();
  const count = today
    ? Object.entries(plan.days)
        .filter(([d]) => d >= today)
        .reduce((n, [, e]) => n + e.items.filter((i) => byId.has(i.id)).length, 0)
    : 0;

  const change = (msg: string, f: (p: Plan) => Plan) => {
    const prev = $plan.get();
    updatePlan(f);
    showToast(msg, () => $plan.set(prev));
  };

  // Share the next 14 days (spec §6.5): Web Share, or copy the link.
  const share = async () => {
    if (!today) return;
    const r = shareUrl(
      plan,
      Array.from({ length: MAX_DAYS }, (_, i) => addDays(today, i)),
      location.origin,
    );
    if (!r.dates.length) return showToast(t.plans.share.nothing);
    track({ name: "plan_share", props: { scope: "fortnight" } });
    try {
      if (navigator.share) {
        await navigator.share({ title: t.plans.share.fortnightTitle, url: r.url });
        return setShared("sent");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(r.url);
      setShared("copied");
    } catch {
      window.prompt(t.plans.share.copyPrompt, r.url);
    }
  };

  return (
    <>
      <div className="px-[22px] pt-[22px] pb-3.5">
        <div className="-mt-2.5 -mr-2 flex items-center justify-between gap-2.5">
          <p className="eb m-0" style={{ color: "var(--mute)" }}>
            {t.discover.comingUp.eyebrow}
          </p>
          <a
            href="/plan"
            className="press inline-flex h-11 items-center gap-[5px] rounded-xl px-2.5 text-[13.5px] font-bold underline decoration-1 underline-offset-[3px]"
            style={{ color: "var(--ink)" }}
          >
            {t.discover.comingUp.openPlans}
            <Icon name="arrow" size={15} />
          </a>
        </div>
        <h2 className="w80 m-0 mt-0.5 text-[38px] leading-[0.95] font-[750] tracking-[-0.035em]">
          {t.discover.comingUp.title}
        </h2>
        {count > 0 && (
          <>
            <p className="m-0 mt-2 text-[13.5px]" style={{ color: "var(--mute)" }}>
              {t.discover.comingUp.count(count)}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <button
                type="button"
                onClick={share}
                className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border pr-4 pl-[13px] text-[14px] font-bold"
                style={{
                  borderColor: "var(--line)",
                  background: shared ? "var(--sel)" : "transparent",
                  color: shared ? "var(--sel-ink)" : "var(--ink)",
                }}
              >
                {shared ? <Icon name="check" size={16} strokeWidth={2.5} /> : <Icon name="share" size={16} />}
                {t.discover.comingUp.share}
              </button>
              <p
                aria-live="polite"
                className="m-0 text-[12.5px] leading-[1.3] font-semibold"
                style={{ color: "var(--mute)" }}
              >
                {shared === "copied"
                  ? t.discover.comingUp.shareDone
                  : shared === "sent"
                    ? t.discover.comingUp.shareSent
                    : ""}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="hs flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {days.length === 0 && (
          <div
            className="mx-2.5 rounded-[22px] border p-4"
            style={{ background: "var(--soft)", borderColor: "var(--line)" }}
          >
            <p className="m-0 text-[15px] font-bold">{t.discover.comingUp.emptyTitle}</p>
            <p className="m-0 mt-1 text-sm leading-[1.45]" style={{ color: "var(--mute)" }}>
              {t.discover.comingUp.emptyBody}
            </p>
          </div>
        )}
        {today &&
          days.map((d, di) => {
            const e = plan.days[d];
            const sky = e.sky;
            const rows = dayItems(d, e.items, byId);
            const n = daysBetween(today, d);
            const label = n <= 1 ? relativeLabel(d, today) : dayName(d);
            const looks = rows.filter((r) => r.warning || (sky && r.card.weatherFit[sky] === 0)).length;
            const word = sky ? cap(t.common.weather.word[sky]) : "";
            const skyLine = !sky
              ? t.discover.comingUp.skyLine.none
              : e.skySource === "auto"
                ? t.discover.comingUp.skyLine.auto(word)
                : t.discover.comingUp.skyLine.manual(word);
            const pickSky = (w: Weather) => updatePlan((p) => setSky(p, d, p.days[d]?.sky === w ? undefined : w));
            return (
              <section
                key={d}
                data-weather={sky}
                aria-label={`${label}, ${shortLabel(d)}`}
                className="dday card-in relative isolate shrink-0 overflow-hidden rounded-[26px]"
                style={{ animationDelay: `${di * 120 + 80}ms`, color: "var(--ink)" }}
              >
                <DaySky sky={sky} />
                <div className="px-3 pt-2.5 pb-3">
                  <div className="px-1.5">
                    <h3 className="w80 m-0 text-[32px] leading-[0.95] font-[750] tracking-[-0.035em]">
                      <a
                        href={`/plan?d=${d}`}
                        aria-label={t.discover.comingUp.openDay(label, shortLabel(d))}
                        className="inline-flex min-h-11 items-center gap-2 no-underline"
                        style={{ color: "inherit" }}
                      >
                        {label}
                        <Icon name="arrow" size={20} className="opacity-75" />
                      </a>
                    </h3>
                    <p className="m-0 mt-0.5 text-[13.5px] font-semibold">
                      {shortLabel(d)} · {skyLine}
                    </p>
                    {looks > 0 && (
                      <p className="glass m-0 mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-bold">
                        <Icon name="warn" size={13} />
                        {t.plans.day.needLook(looks)}
                      </p>
                    )}
                  </div>
                  <fieldset className="m-0 mt-3 min-w-0 border-0 p-0">
                    <legend className="sr-only">{t.plans.day.skyLegend(shortLabel(d))}</legend>
                    <div className="glass grid grid-cols-4 gap-[3px] rounded-2xl p-[3px]">
                      {WEATHERS.map((w) => {
                        const on = sky === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            aria-pressed={on}
                            onClick={() => pickSky(w)}
                            className="press flex h-11 items-center justify-center gap-1 rounded-[13px] border-0 p-0 text-xs"
                            style={{
                              background: on ? "var(--sel)" : "transparent",
                              color: on ? "var(--sel-ink)" : "var(--ink)",
                              fontWeight: on ? 700 : 500,
                            }}
                          >
                            <WeatherIcon weather={w} size={16} strokeWidth={2} />
                            {t.common.weather.label[w]}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  {rows.map((r, i) => {
                    const fit = sky ? r.card.weatherFit[sky] : null;
                    const key = `${d}:${r.card.id}`;
                    const backup = backups.has(key) ? backups.get(key) : undefined;
                    return (
                      <div
                        key={r.card.id}
                        className="glass card-in mt-2 overflow-hidden rounded-[18px]"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="flex items-center gap-0.5 py-1 pr-1 pl-3.5">
                          <a
                            href={`/a/${r.card.activityId ?? r.card.id}?day=${d}`}
                            className="flex min-h-[52px] min-w-0 flex-1 flex-col justify-center gap-1 py-[5px] no-underline"
                            style={{ color: "inherit" }}
                          >
                            <span className="text-[14.5px] leading-[1.25] font-[650]">{r.card.name}</span>
                            <span
                              className="flex items-center gap-1.5 text-xs font-semibold"
                              style={{ color: "var(--mute)" }}
                            >
                              {fit !== null && <FitMeter fit={fit} />}
                              {fit !== null ? `${t.common.fit.label[fit]} · ` : ""}
                              {durationLabel(r.card)}
                            </span>
                          </a>
                          <button
                            type="button"
                            aria-label={t.plans.timeline.remove(r.card.name, shortLabel(d))}
                            onClick={() =>
                              change(t.plans.timeline.removed(r.card.name), (p) => removeItem(p, d, r.card.id))
                            }
                            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-0 bg-transparent p-0"
                            style={{ color: "var(--mute)" }}
                          >
                            <Icon name="close" size={17} />
                          </button>
                        </div>
                        {fit === 0 && sky && backup !== undefined && (
                          <div
                            className="leg-in mx-[5px] mb-[5px] flex gap-2.5 rounded-[15px] p-3"
                            style={{ background: "var(--soft)" }}
                          >
                            <span
                              className="swing mt-0.5 shrink-0"
                              aria-hidden="true"
                              style={{ color: "var(--accent)" }}
                            >
                              <Icon name="umbrella" size={22} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] leading-[1.4]" style={{ color: "var(--mute)" }}>
                                {t.discover.comingUp.notGreat[sky]}
                                {!backup && ` ${t.plans.planB.moveHint}.`}
                              </span>
                              {backup && (
                                <>
                                  <span className="eb mt-[7px] block text-[10.5px]">{t.plans.planB.heading}</span>
                                  <span className="w90 mt-0.5 block text-[17px] leading-[1.1] font-bold tracking-[-0.015em]">
                                    {backup.name}
                                  </span>
                                  <span className="mt-0.5 block text-xs" style={{ color: "var(--mute)" }}>
                                    {t.discover.comingUp.planBMeta(backup.area, durationLabel(backup))}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={t.plans.planB.swapLabel(
                                      r.card.name,
                                      backup.name,
                                      clockLabel(r.span.start),
                                    )}
                                    onClick={() => {
                                      track({ name: "plan_b_swap", props: {} });
                                      change(t.plans.planB.swapped(backup.name), (p) =>
                                        swapItem(p, d, r.card.id, backup.id),
                                      );
                                    }}
                                    className="press mt-[9px] inline-flex h-11 items-center gap-[7px] rounded-[13px] border-0 px-3.5 text-[13.5px] font-bold"
                                    style={{ background: "var(--sel)", color: "var(--sel-ink)" }}
                                  >
                                    <Icon name="return" size={15} strokeWidth={2.5} />
                                    {t.discover.comingUp.swapIn}
                                  </button>
                                </>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>
    </>
  );
}

/** A small version of the day's sky behind its card (decorative). No sky set: the page's glass. */
function DaySky({ sky }: { sky: Weather | undefined }) {
  return (
    <div aria-hidden="true" className={`dsky dsky-${sky ?? "none"}`}>
      {sky === "sunny" && (
        <>
          <svg className="dsky-rays" width="180" height="180" viewBox="0 0 300 300">
            <path
              d="M150 66V30M192 77.3L210 46.1M222.7 108L253.9 90M234 150H270M222.7 192L253.9 210M192 222.7L210 253.9M150 234V270M108 222.7L90 253.9M77.3 192L46.1 210M66 150H30M77.3 108L46.1 90M108 77.3L90 46.1"
              fill="none"
              stroke="#FFD66B"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
          <div className="dsky-sun" />
          <div className="dsky-sea" />
        </>
      )}
      {sky === "cloudy" && (
        <>
          <svg
            className="dsky-cloud"
            width="180"
            height="81"
            viewBox="0 0 200 90"
            style={{ left: 140, top: 6, opacity: 0.8 }}
          >
            <use href="#sky-cl" fill="url(#sky-cg)" />
          </svg>
          <svg
            className="dsky-cloud dsky-cloud2"
            width="130"
            height="59"
            viewBox="0 0 200 90"
            style={{ left: 20, top: 130, opacity: 0.6, filter: "blur(2px)" }}
          >
            <use href="#sky-cl" fill="url(#sky-cg)" />
          </svg>
        </>
      )}
      {sky === "rainy" && (
        <div className="dsky-rain">
          <svg width="100%" height="100%">
            <rect width="100%" height="100%" fill="url(#sky-rM)" />
          </svg>
        </div>
      )}
      {sky === "hot" && <div className="dsky-heat" />}
    </div>
  );
}
