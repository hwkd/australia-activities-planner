import { useHydratedStore } from "~/stores/useHydratedStore";
import { $forecast } from "~/stores/forecast";
import type { Weather } from "~/stores/weather";
import { forecastAge, forecastFor, NO_FORECAST, type AreaId } from "~/lib/forecast";
import type { DateStr } from "~/lib/dates";
import { t } from "~/strings/en-AU";

interface Props {
  date: DateStr;
  /** Where the day's plans are; the caption names the area when it isn't the city. */
  area?: AreaId;
  /** The sky showing now. */
  value: Weather | undefined;
  /** Go back to the forecast's sky. */
  onUse: (sky: Weather) => void;
}

/**
 * The forecast under a sky picker (spec §11.1): "Forecast: rainy, 60% chance of rain · updated 2 h
 * ago" when the sky matches it, or what it says with **Use forecast** when the user picked another.
 * Nothing when there's no forecast for that day (more than about a week ahead, or none fetched yet).
 */
export default function ForecastNote({ date, area = "city", value, onUse }: Props) {
  const fc = useHydratedStore($forecast, NO_FORECAST);
  const f = forecastFor(fc, date, area);
  if (!f || !fc.updatedAt) return null;
  const s = t.common.forecast;
  const word = t.common.weather.word[f.sky];
  const age = forecastAge(fc.updatedAt);
  return (
    <div
      className="mt-2 px-1 text-[12.5px] leading-[1.45]"
      style={{ color: "var(--sky-mute, var(--mute))" }}
      data-forecast={f.sky}
    >
      {/* What it says, with Use forecast beside it when another sky is showing (A · Sky Mode artboards). */}
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 min-w-0 flex-1">
          {value === f.sky
            ? f.area === "city"
              ? s.caption(word, f.rain, age)
              : s.captionFor(s.areas[f.area], word, f.rain, age)
            : s.differs(word, f.rain)}
        </p>
        {value !== f.sky && (
          <button
            type="button"
            onClick={() => onUse(f.sky)}
            className="glass press inline-flex h-11 shrink-0 items-center rounded-full px-4 text-[13.5px] font-bold"
            style={{ color: "var(--ink)" }}
          >
            {s.use}
          </button>
        )}
      </div>
      <p className="m-0 mt-1">
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener"
          className="underline-offset-2"
          style={{ color: "inherit" }}
        >
          {s.credit}
        </a>
      </p>
    </div>
  );
}
