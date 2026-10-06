import type { Weather } from "~/stores/weather";
import type { EventCard } from "~/lib/events";
import { datesLabel } from "~/lib/events";
import { FitMeter, Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  events: readonly EventCard[];
  weather: Weather;
  plannedLabel: (id: string) => string | null;
  onAdd: (id: string) => void;
}

/** On soon (spec §11.4): curated events in the next 14 days, at the top of Discover. */
export default function OnSoon({ events, weather, plannedLabel, onAdd }: Props) {
  const s = t.discover.onSoon;
  return (
    <section aria-labelledby="on-soon" className="mt-7">
      <h2 id="on-soon" className="w90 m-0 mx-1 text-[22px] leading-[1.05] font-bold tracking-[-0.022em]" style={{ textShadow: "var(--hl)" }}>
        {s.heading}
      </h2>
      <ul className="hs -mx-4 mt-3 flex list-none gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
        {events.map((e) => {
          const fit = e.weatherFit[weather];
          const planned = plannedLabel(e.id);
          return (
            <li key={e.id} className="glass card-in flex w-[280px] shrink-0 flex-col rounded-[24px] p-4 lg:w-auto">
              <p className="m-0 text-[11.5px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--accent)" }}>
                {e.categoryLabel} · {datesLabel(e.dates.from, e.dates.to)}
              </p>
              <h3 className="m-0 mt-2 text-[20px] leading-[1.1] font-[650] tracking-[-0.02em]">{e.name}</h3>
              <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--mute)" }}>
                {s.venue(e.venue, e.area)}
              </p>
              <p className="m-0 mt-1.5 text-[14px] leading-[1.4]">{e.blurb}</p>
              <p className="m-0 mt-2 inline-flex items-center gap-[7px] text-[13px] font-bold">
                <FitMeter fit={fit} />
                {t.common.fit.when(fit, weather)}
              </p>
              {planned && (
                <p className="m-0 mt-1.5 text-[13px] font-bold" style={{ color: "var(--accent)" }}>
                  {planned}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <button type="button" onClick={() => onAdd(e.id)} aria-label={s.addLabel(e.name)} className="press inline-flex h-11 items-center gap-1.5 rounded-[14px] border-0 px-4 font-bold" style={{ background: "var(--sel)", color: "var(--sel-ink)" }}>
                  <Icon name="plus" size={18} />
                  {t.discover.card.add}
                </button>
                <a href={e.link.url} target="_blank" rel="noopener" className="press glass inline-flex h-11 items-center gap-1.5 rounded-[14px] px-3.5 text-[14px] font-bold no-underline" style={{ color: "var(--ink)" }}>
                  {e.link.label}
                  <Icon name="external" size={15} />
                  <span className="sr-only">{t.detail.newTab}</span>
                </a>
                {e.activityId && (
                  <a href={`/a/${e.activityId}`} className="inline-flex h-11 items-center px-1 text-[14px] font-bold underline-offset-2" style={{ color: "var(--ink)" }}>
                    {s.seeActivity}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
