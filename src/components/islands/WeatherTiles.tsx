import { useEffect } from "react";
import { $weather, bindThemeToWeather, chooseWeather, WEATHERS, type Weather } from "~/stores/weather";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { track } from "~/lib/analytics";
import { FIT_LABEL, THEMES, WEATHER_LABEL } from "~/theme/tokens";
import { FitMeter, WeatherIcon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

/** A small scene in each tile's corner. */
function Deco({ w }: { w: Weather }) {
  if (w === "sunny")
    return <span aria-hidden="true" className="absolute -top-4 -right-4 h-14 w-14 rounded-full" style={{ background: "radial-gradient(circle at 38% 36%, #FFF0B8, #FFC940 60%, #F2A51E)", boxShadow: "0 0 24px 6px rgba(255,201,64,0.35)" }} />;
  if (w === "hot")
    return <span aria-hidden="true" className="absolute -top-[22px] -right-[22px] h-[66px] w-[66px] rounded-full" style={{ background: "radial-gradient(circle at 50% 40%, #FFF4D6, #FFE3A1 55%, #FFD07A)", boxShadow: "0 0 30px 10px rgba(255,200,120,0.35)" }} />;
  if (w === "cloudy")
    return (
      <svg aria-hidden="true" viewBox="0 0 200 90" className="absolute -top-1 -right-6 w-24 opacity-70">
        <path fill="#FFFFFF" d="M36 80C16 80 6 66 12 54 17 43 30 40 40 44 42 26 60 16 78 20 88 6 112 2 128 14 140 22 144 32 142 40 158 34 180 42 184 58 188 72 178 80 164 80Z" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 80 60" className="absolute top-0 right-0 w-20 opacity-60">
      <path d="M20 4v10M44 18v10M64 2v10M32 34v10M58 38v10" stroke="#D2DEFF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Weather check (spec §3.2 item 2): the fit for each sky. Tapping a tile sets the app-wide weather,
 * exactly like Set the sky, so the page re-themes and Discover re-ranks (AC 22).
 */
export default function WeatherTiles({ fit }: { fit: Record<Weather, 0 | 1 | 2> }) {
  const current = useHydratedStore($weather, "sunny");
  useEffect(() => bindThemeToWeather(), []);
  const pick = (w: Weather) => {
    if (w === $weather.get()) return;
    chooseWeather(w);
    track({ name: "filter_change", props: { filter: "weather", value: w } });
  };
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label={t.detail.weather.tilesLabel}>
      {WEATHERS.map((w) => {
        const theme = THEMES[w];
        const on = w === current;
        const f = fit[w];
        return (
          <button
            key={w}
            type="button"
            aria-pressed={on}
            onClick={() => pick(w)}
            className="press relative flex min-h-32 flex-col gap-1.5 overflow-hidden rounded-[20px] border-0 p-3 text-left"
            style={{ background: theme.skyChip, color: theme.ink, boxShadow: on ? "0 0 0 2.5px var(--ink), 0 14px 30px rgba(0,0,0,0.28)" : "inset 0 0 0 1px rgba(255,255,255,0.16)" }}
          >
            <Deco w={w} />
            <span className="relative flex items-center gap-[7px] text-[13.5px] font-bold">
              <WeatherIcon weather={w} size={18} strokeWidth={2} />
              {WEATHER_LABEL[w]}
            </span>
            {on && <span className="relative self-start rounded-full border-[1.5px] border-current px-2 py-0.5 text-[10.5px] font-bold tracking-[0.1em] uppercase">{t.detail.weather.yourSky}</span>}
            <span className="relative mt-auto flex items-center gap-2">
              <FitMeter fit={f} color={f === 2 ? theme.great : theme.ink} />
              <span className="w90 text-[22px] font-bold tracking-[-0.02em]">{FIT_LABEL[f]}</span>
            </span>
            <span className="relative text-[12.5px] leading-[1.3]">{t.common.fit.note[f]}</span>
          </button>
        );
      })}
    </div>
  );
}
