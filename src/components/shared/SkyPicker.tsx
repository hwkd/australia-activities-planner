import { WEATHERS, type Weather } from "~/stores/weather";
import { THEMES } from "~/theme/tokens";
import { WeatherIcon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  value: Weather | undefined;
  onChange: (w: Weather) => void;
  /** Full: Discover (68 px segments, 72 px on desktop). Compact: a day's sky in My plans (44 px). */
  variant?: "full" | "compact";
  /** Accessible group name. */
  legend?: string;
  /** Heading shown above the full strip. */
  heading?: string;
  /** Right-hand note above the full strip. */
  note?: string;
}

/**
 * Set the sky (spec §3.1, Variant 2): four equal segments in one glass panel. Each is a button with
 * aria-pressed; the selected one fills with a small version of its own sky and gets a light inner
 * ring and a bold label. That fill is the only selection cue (AC 24).
 */
export default function SkyPicker({
  value,
  onChange,
  variant = "full",
  legend = t.common.skyPicker.legend,
  heading = t.common.skyPicker.heading,
  note = t.common.skyPicker.note,
}: Props) {
  const full = variant === "full";
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      {full && (
        <div aria-hidden="true" className="mb-2 flex items-baseline justify-between px-1">
          <p className="m-0 text-[11.5px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--mute)" }}>
            {heading}
          </p>
          <p className="m-0 text-[12.5px] font-semibold lg:text-[13px]" style={{ color: "var(--mute)" }}>
            {note}
          </p>
        </div>
      )}
      <div className={`glass grid grid-cols-4 gap-1 ${full ? "rounded-[26px] p-[5px]" : "rounded-[18px] p-1"}`}>
        {WEATHERS.map((w) => {
          const on = value === w;
          const theme = THEMES[w];
          return (
            <button
              key={w}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(w)}
              className={`sky-seg flex items-center justify-center border-0 p-0 ${full ? "h-[68px] flex-col gap-[5px] rounded-[21px] lg:h-[72px]" : "h-11 gap-[5px] rounded-[14px]"}`}
              style={{
                background: on ? theme.seg : "transparent",
                color: on ? "#FFFFFF" : "var(--ink)",
                boxShadow: on
                  ? `inset 0 0 0 1.5px rgba(255,255,255,0.6), 0 8px 18px ${theme.glow}`
                  : "inset 0 0 0 0 transparent",
              }}
            >
              <WeatherIcon weather={w} size={full ? 24 : 17} className={full ? "lg:h-[26px] lg:w-[26px]" : undefined} />
              <span
                className={`whitespace-nowrap ${full ? "text-[13px] lg:text-[14px]" : "text-[12.5px]"}`}
                style={{ fontWeight: on ? 700 : full ? 550 : 500 }}
              >
                {t.common.weather.label[w]}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
