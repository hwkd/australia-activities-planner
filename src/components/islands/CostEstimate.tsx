import { useMemo } from "react";
import type { Activity } from "~/content/schema";
import { $planningDate } from "~/stores/ui";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { updateTrip } from "~/stores/trip";
import { setPeople, presetKey } from "~/lib/detailState";
import { ADULTS, estimate, KIDS, money, OPAL_CAPS, PRESETS } from "~/lib/cost";
import type { Pt } from "~/lib/route";
import { shortLabel } from "~/lib/dates";
import { useTrip } from "~/components/detail/useTrip";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  /** The trip from the city: transport is always public transport (spec §6.6, D14). */
  pt: Pt;
  costs: Activity["costs"];
}

const checked = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/**
 * What it'll cost (spec §3.2 item 5, §6.6): group presets and steppers, a breakdown with optional
 * extras, the total and per person. Transport is public transport from the city centre, with the Opal
 * cap for the day being planned, if any; parking stays in Getting there's Driving? note.
 */
export default function CostEstimate({ pt, costs }: Props) {
  const trip = useTrip();
  const day = useHydratedStore($planningDate, null);
  const e = useMemo(
    () => estimate({ activity: { routes: { pt }, costs }, adults: trip.adults, kids: trip.kids, extras: trip.extras, date: day ?? undefined }),
    [pt, costs, trip.adults, trip.kids, trip.extras, day]
  );
  const preset = presetKey(trip);
  const pill = (on: boolean) => ({ background: on ? "var(--sel)" : "var(--soft)", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" });
  const step = (label: string, value: number, dec: () => void, inc: () => void, canDec: boolean, canInc: boolean, what: string) => (
    <div className="rounded-[18px] border px-1.5 pt-2 pb-1.5" style={{ background: "var(--soft)", borderColor: "var(--line)" }}>
      <p className="m-0 pl-1.5 text-xs font-bold" style={{ color: "var(--mute)" }}>
        {label}
      </p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label={t.detail.cost.remove(what)} onClick={dec} disabled={!canDec} className="press flex h-11 w-11 items-center justify-center rounded-xl border-0 bg-transparent disabled:opacity-40">
          <Icon name="minus" size={18} strokeWidth={2.5} />
        </button>
        <span className="w90 text-2xl font-[750]" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={t.detail.cost.add(what)} onClick={inc} disabled={!canInc} className="press flex h-11 w-11 items-center justify-center rounded-xl border-0 disabled:opacity-40" style={{ background: "var(--sel)", color: "var(--sel-ink)" }}>
          <Icon name="plus" size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <fieldset className="m-0 mt-3.5 min-w-0 border-0 p-0">
        <legend className="sr-only">{t.detail.cost.group}</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => updateTrip((s) => setPeople(s, p.adults, p.kids))} className="press h-11 rounded-[14px] border text-sm font-bold" style={pill(preset === p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {step(t.detail.cost.adults, trip.adults, () => updateTrip((s) => setPeople(s, s.adults - 1, s.kids)), () => updateTrip((s) => setPeople(s, s.adults + 1, s.kids)), trip.adults > ADULTS.min, trip.adults < ADULTS.max, t.detail.cost.anAdult)}
        {step(t.detail.cost.kids, trip.kids, () => updateTrip((s) => setPeople(s, s.adults, s.kids - 1)), () => updateTrip((s) => setPeople(s, s.adults, s.kids + 1)), trip.kids > KIDS.min, trip.kids < KIDS.max, t.detail.cost.aChild)}
      </div>
      <p className="m-0 mt-2 px-1 text-[13px] font-semibold" style={{ color: "var(--mute)" }}>
        {t.detail.cost.people(trip.adults, trip.kids)}
        {day && t.detail.cost.faresFor(shortLabel(day))}
      </p>

      <dl className="m-0 mt-3" aria-label={t.detail.cost.breakdown}>
        {e.lines.map((l) => (
          <div key={l.key} className="flex justify-between gap-3 px-0.5 py-[11px]" style={{ borderTop: "1px solid var(--line)" }}>
            <dt className="min-w-0">
              <span className="block text-[14.5px] font-semibold">{l.label}</span>
              {l.note && (
                <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--mute)" }}>
                  {l.note}
                </span>
              )}
            </dt>
            <dd className="m-0 shrink-0 text-right text-[15px] font-bold">
              {money(l.value)}
              {l.value[1] > 0 && (
                <span className="ml-1 text-[11.5px] font-semibold" style={{ color: "var(--mute)" }}>
                  {t.detail.cost.est}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {costs.extras.length > 0 && (
        <>
          <p className="m-0 mt-1.5 pt-2.5 text-xs font-bold tracking-[0.12em] uppercase" style={{ borderTop: "1px solid var(--line)", color: "var(--mute)" }}>
            {t.detail.cost.optionalExtras}
          </p>
          <div className="mt-2 grid gap-1.5">
            {costs.extras.map((x) => {
              const on = trip.extras[x.id] ?? x.on;
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateTrip((s) => ({ ...s, extras: { ...s.extras, [x.id]: !(s.extras[x.id] ?? x.on) } }))}
                  className="press flex min-h-[50px] items-center gap-[11px] rounded-2xl border py-2 pr-3.5 pl-2.5 text-left"
                  style={{ background: on ? "var(--sel)" : "transparent", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" }}
                >
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ boxShadow: `inset 0 0 0 1.8px ${on ? "var(--sel-ink)" : "var(--ink)"}`, background: on ? "var(--sel-ink)" : "transparent", color: "var(--sel)" }}>
                    {on && <Icon name="check" size={16} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-[1.3] font-semibold">{x.label}</span>
                  <span className="shrink-0 text-[13px] font-bold">
                    {t.detail.cost.perPerson(money(x.per))} <span className="font-semibold">{t.detail.cost.est}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3.5 rounded-[20px] p-4" style={{ background: "var(--sel)", color: "var(--sel-ink)" }}>
        <p className="m-0 flex justify-between gap-2 text-xs font-bold tracking-[0.12em] uppercase">
          <span>{t.detail.cost.total}</span>
          <span className="font-semibold tracking-[0.02em] normal-case">{t.detail.cost.publicTransport}</span>
        </p>
        <p className="m-0 mt-1.5 flex items-baseline gap-2" aria-live="polite">
          <span className="w80 text-[42px] leading-none font-extrabold tracking-[-0.035em]">{e.totalLabel}</span>
          {e.total[1] > 0 && <span className="text-sm font-bold">{t.detail.cost.est}</span>}
        </p>
        <p className="m-0 mt-1.5 text-sm font-semibold">{e.perPersonLabel}</p>
        {e.fareNote && <p className="m-0 mt-1 text-[12.5px] font-semibold opacity-90">{e.fareNote}</p>}
      </div>
      <p className="m-0 mt-2.5 px-0.5 text-xs leading-[1.45]" style={{ color: "var(--mute)" }}>
        {t.detail.cost.disclaimer}{" "}
        {costs.pricesChecked ? t.detail.cost.pricesChecked(checked(costs.pricesChecked)) : t.detail.cost.pricesNotChecked} {t.detail.cost.opalCapsAsOf(checked(OPAL_CAPS.asOf))}
      </p>
    </>
  );
}
