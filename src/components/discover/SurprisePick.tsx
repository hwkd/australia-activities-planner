import { useEffect, useRef } from "react";
import type { Weather } from "~/stores/weather";
import type { CardData } from "~/lib/content";
import { FitMeter, Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  /** The pick, or null when everything that suits the sky is already planned. */
  card: CardData | null;
  fallback: boolean;
  weather: Weather;
  /** Changes with every pick, so the reveal plays again on Another one. */
  turn: number;
  onAdd: (id: string) => void;
  onAnother: () => void;
  onClose: () => void;
}

/** The Surprise me reveal above Discover's results (spec §11.5). Focus moves to it so it's announced. */
export default function SurprisePick({ card, fallback, weather, turn, onAdd, onAnother, onClose }: Props) {
  const s = t.discover.surprise;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus(), [turn]);
  const fit = card ? card.weatherFit[weather] : 0;
  return (
    <section ref={ref} key={turn} tabIndex={-1} aria-labelledby="surprise-title" className="glass-strong surprise-in relative mb-3 rounded-[26px] p-[18px] outline-none">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--accent)" }}>
          <Icon name="spark" size={15} />
          {s.eyebrow}
        </p>
        <button type="button" onClick={onClose} aria-label={s.close} className="press -mt-1.5 -mr-1.5 flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent" style={{ color: "var(--ink)" }}>
          <Icon name="close" />
        </button>
      </div>
      {card ? (
        <>
          <h3 id="surprise-title" className="w90 m-0 mt-1 text-[26px] leading-[1.06] font-bold tracking-[-0.022em]">
            <a href={`/a/${card.id}`} className="no-underline" style={{ color: "var(--ink)" }}>
              {card.name}
            </a>
          </h3>
          <p className="m-0 mt-1.5 text-[14.5px] leading-[1.45]" style={{ color: "var(--mute)" }}>
            {card.blurb}
          </p>
          <p className="m-0 mt-2.5 inline-flex items-center gap-[7px] text-[13px] font-bold">
            <FitMeter fit={fit} />
            {t.common.fit.when(fit, weather)}
          </p>
          {fallback && (
            <p className="m-0 mt-2 text-[13px] leading-[1.4]" style={{ color: "var(--mute)" }}>
              {s.fallback(t.common.weather.word[weather])}
            </p>
          )}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => onAdd(card.id)} className="press inline-flex h-11 items-center gap-1.5 rounded-[14px] border-0 px-4 font-bold" style={{ background: "var(--sel)", color: "var(--sel-ink)" }}>
              <Icon name="plus" size={18} />
              {s.add}
            </button>
            <button type="button" onClick={onAnother} className="press glass inline-flex h-11 items-center gap-1.5 rounded-[14px] px-4 font-bold" style={{ color: "var(--ink)" }}>
              <Icon name="spark" size={17} />
              {s.another}
            </button>
          </div>
        </>
      ) : (
        <h3 id="surprise-title" className="m-0 mt-1 text-[17px] leading-[1.35] font-semibold">
          {s.none}
        </h3>
      )}
    </section>
  );
}
