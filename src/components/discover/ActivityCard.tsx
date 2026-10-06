import { useEffect, useRef, useState } from "react";
import { WEATHERS, type Weather } from "~/stores/weather";
import type { CardData } from "~/lib/content";
import { FitMeter, Icon, WeatherIcon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  card: CardData;
  /** Position in the ranked list (0-based). */
  index: number;
  weather: Weather;
  /** "Planned · Sat 3 Oct" or "Planned · 2 days", when it's planned from today onwards. */
  planned: string | null;
  onAdd: (id: string) => void;
}

/**
 * A Discover result (spec §3.1). The name links to the activity page and the whole card is clickable
 * through it; the Add button sits above that link. One markup, two layouts: the phone card (A · Sky
 * Mode — Mobile) and, in desktop's two-column grid, the tile (A · Sky Mode — Desktop): big number, the
 * fit strip with icons over labels, and a full-width Add to a day. The `rc-` classes in global.css
 * switch between them with a container query, so nothing moves after the page loads.
 *
 * The entrance plays once: re-ranking moves cards in the DOM, and a moved element restarts its CSS
 * animations, so `card-in` comes off when it ends, or at hydration if it already has (it starts with
 * the server HTML, so on a slow phone it can end before React is listening).
 */
export default function ActivityCard({ card: c, index, weather, planned, onAdd }: Props) {
  const fit = c.weatherFit[weather];
  const [entered, setEntered] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current?.getAnimations().length) setEntered(true);
  }, []);
  return (
    <article
      ref={ref}
      className={`rc glass ${entered ? "" : "card-in "}relative overflow-hidden rounded-[26px]`}
      style={entered ? undefined : { animationDelay: `${Math.min(index, 8) * 60}ms` }}
      onAnimationEnd={(e) => e.target === e.currentTarget && setEntered(true)}
    >
      <div className="rc-head px-[18px] pt-[18px]">
        <div className="rc-top flex items-center justify-between gap-2.5">
          <p className="rc-tag m-0 flex min-w-0 items-baseline gap-2.5">
            <span className="rc-num w80 text-base font-extrabold" style={{ color: "var(--accent)" }} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="rc-kick flex min-w-0 items-baseline gap-2.5">
              <span
                className="truncate text-[11.5px] font-semibold tracking-[0.1em] uppercase"
                style={{ color: "var(--mute)" }}
              >
                {t.discover.card.kicker(c.categoryLabel, c.area)}
              </span>
              {c.seasonal && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-normal normal-case"
                  style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
                >
                  {t.discover.seasonal}
                </span>
              )}
            </span>
          </p>
          <span
            className="rc-badge inline-flex h-[30px] shrink-0 items-center gap-[7px] rounded-full pr-3 pl-2.5 text-[13px] font-bold"
            style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
          >
            <FitMeter fit={fit} />
            {t.common.fit.label[fit]}
            <span className="sr-only">{t.discover.card.fitWhen(t.common.weather.word[weather])}</span>
          </span>
        </div>
        <h3 className="rc-name m-0 mt-2.5 text-2xl leading-[1.06] font-[650] tracking-[-0.022em]">
          <a
            href={`/a/${c.id}`}
            className="card-link w90 flex items-start justify-between gap-2.5 no-underline"
            style={{ color: "inherit" }}
          >
            {c.name}
            <Icon name="arrow" size={20} className="rc-arrow mt-1 shrink-0 opacity-70" />
          </a>
        </h3>
        <p className="rc-blurb m-0 mt-2 text-sm leading-[1.45]" style={{ color: "var(--mute)" }}>
          {c.blurb}
        </p>
        {planned && (
          <p
            className="rc-planned m-0 mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold"
            style={{ color: "var(--accent)" }}
          >
            <Icon name="check" size={15} strokeWidth={2.5} />
            {planned}
          </p>
        )}
      </div>
      <ul
        className="rc-strip m-0 mx-3.5 mt-3.5 grid list-none grid-cols-4 gap-1 rounded-2xl p-1"
        style={{ background: "var(--soft)" }}
        aria-label={t.discover.card.fitStrip}
      >
        {WEATHERS.map((w) => {
          const cur = w === weather;
          return (
            <li
              key={w}
              className="rc-cell flex h-9 items-center justify-center gap-[5px] rounded-xl text-xs"
              style={{
                background: cur ? "var(--sel)" : "transparent",
                color: cur ? "var(--sel-ink)" : "var(--mute)",
                fontWeight: cur ? 700 : 500,
              }}
            >
              <WeatherIcon weather={w} size={15} strokeWidth={2} />
              <span className="sr-only">{t.discover.card.fitSky(t.common.weather.label[w])}</span>
              {t.common.fit.label[c.weatherFit[w]]}
            </li>
          );
        })}
      </ul>
      <div className="rc-foot flex items-center gap-2 px-3.5 pt-3 pb-3.5">
        <p
          className="rc-meta m-0 flex min-w-0 flex-1 items-center gap-3 pl-1 text-[13px]"
          style={{ color: "var(--mute)" }}
        >
          <span className="inline-flex items-center gap-[5px]">
            <Icon name="clock" />
            {c.duration.label}
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <Icon name="ticket" />
            <span className="sr-only">{t.discover.card.costPrefix}</span>
            {c.cost}
          </span>
        </p>
        <span className="rc-add">
          <button
            type="button"
            onClick={() => onAdd(c.id)}
            aria-label={t.discover.card.addLabel(c.name)}
            className="press relative z-[1] inline-flex h-11 w-full min-w-[88px] items-center justify-center gap-1.5 rounded-[14px] px-3.5 text-[13.5px] font-bold"
            style={{ background: "var(--sel)", color: "var(--sel-ink)", border: "1px solid var(--sel)" }}
          >
            <Icon name="plus" size={16} strokeWidth={2.5} />
            <span className="rc-add-short">{t.discover.card.add}</span>
            <span className="rc-add-long">{t.discover.card.addLong}</span>
          </button>
        </span>
      </div>
    </article>
  );
}
