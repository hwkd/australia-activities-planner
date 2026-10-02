import { WEATHERS, type Weather } from "~/stores/weather";
import { t } from "~/strings/en-AU";

/**
 * Sky Mode's theme per weather (implementation-plan.md §5), ported from the A artboards' `themeVals`.
 * Changed from the artboards for AA contrast (AC 12, src/theme/contrast.test.ts): `mute`/`skyMute`
 * for sunny and hot are slightly more opaque, and the selected-segment skies (`seg`) end darker so
 * the white label passes (cloudy's is now a deeper slate).
 * Components read these as CSS variables and never hard-code a weather colour. Any element with
 * `data-weather` gets that weather's variables, so a calendar badge or the Add to a day sheet can
 * show another day's sky inside a page themed for a different one.
 */
export interface Theme {
  /** Main text. */
  ink: string;
  /** Secondary text on glass. */
  mute: string;
  /** Text placed straight on the sky (eyebrows, headline lines). */
  skyMute: string;
  /** Glass panel fill, and the heavier fill for sheets and fallbacks. */
  glass: string;
  glass2: string;
  line: string;
  soft: string;
  /** Selected control fill and its text. */
  sel: string;
  selInk: string;
  /** The headline weather word and highlights. */
  accent: string;
  /** "Perfect" fit meter colour. */
  great: string;
  shadow: string;
  /** Text shadow for headlines on the sky. */
  hl: string;
  scrim: string;
  /** A small sky swatch (calendar badges, weather tiles). */
  skyChip: string;
  /** The selected Set the sky segment: a slightly deeper mini sky so a white icon still reads. */
  seg: string;
  /** Glow under the selected segment. */
  glow: string;
  /** Solid colour behind the scene (also the theme-color and the no-scene fallback). */
  bg: string;
  scheme: "light" | "dark";
}

export const THEMES: Record<Weather, Theme> = {
  sunny: {
    ink: "#FFFFFF", mute: "rgba(255,255,255,0.96)", skyMute: "rgba(255,255,255,0.97)",
    glass: "rgba(9,28,92,0.56)", glass2: "rgba(8,24,80,0.76)", line: "rgba(255,255,255,0.24)", soft: "rgba(255,255,255,0.09)",
    sel: "#FFFFFF", selInk: "#0D38A3", accent: "#FFC940", great: "#FFC940",
    shadow: "0 18px 48px rgba(3,16,66,0.32)", hl: "0 2px 28px rgba(3,16,66,0.35)", scrim: "rgba(3,14,60,0.3)",
    skyChip: "linear-gradient(160deg, #0F3FB8 0%, #2659D8 100%)", seg: "linear-gradient(160deg, #1546C4 0%, #386DE5 100%)",
    glow: "rgba(255,201,64,0.6)", bg: "#1B4BC8", scheme: "dark",
  },
  cloudy: {
    ink: "#16202B", mute: "#364251", skyMute: "#16202B",
    glass: "rgba(255,255,255,0.58)", glass2: "rgba(247,249,251,0.86)", line: "rgba(255,255,255,0.78)", soft: "rgba(22,32,43,0.07)",
    sel: "#16202B", selInk: "#FFFFFF", accent: "#1D3A5F", great: "#0A6B3D",
    shadow: "0 18px 44px rgba(38,52,70,0.16)", hl: "0 1px 0 rgba(255,255,255,0.3)", scrim: "rgba(60,72,88,0.22)",
    skyChip: "linear-gradient(165deg, #8E9AA8 0%, #C9D1D9 100%)", seg: "linear-gradient(165deg, #5F6D7F 0%, #697789 100%)",
    glow: "rgba(255,255,255,0.85)", bg: "#A9B4C0", scheme: "light",
  },
  rainy: {
    ink: "#F1F4FF", mute: "rgba(226,233,255,0.84)", skyMute: "rgba(226,233,255,0.86)",
    glass: "rgba(150,172,255,0.1)", glass2: "rgba(14,24,58,0.82)", line: "rgba(170,192,255,0.24)", soft: "rgba(210,222,255,0.08)",
    sel: "#DCE6FF", selInk: "#0A1330", accent: "#8FB3FF", great: "#9CF5C4",
    shadow: "0 18px 48px rgba(0,0,0,0.38)", hl: "0 2px 30px rgba(0,0,0,0.4)", scrim: "rgba(2,6,20,0.4)",
    skyChip: "linear-gradient(165deg, #0A1330 0%, #1C2B55 100%)", seg: "linear-gradient(165deg, #101B40 0%, #24356A 100%)",
    glow: "rgba(143,179,255,0.6)", bg: "#131F44", scheme: "dark",
  },
  hot: {
    ink: "#FFF7EC", mute: "rgba(255,240,224,0.95)", skyMute: "rgba(255,244,230,0.96)",
    glass: "rgba(70,16,2,0.64)", glass2: "rgba(66,14,2,0.82)", line: "rgba(255,222,180,0.26)", soft: "rgba(255,232,205,0.1)",
    sel: "#FFE3A1", selInk: "#5A1A04", accent: "#FFE3A1", great: "#FFE3A1",
    shadow: "0 18px 48px rgba(80,18,0,0.35)", hl: "0 2px 30px rgba(90,20,0,0.35)", scrim: "rgba(60,12,0,0.34)",
    skyChip: "linear-gradient(165deg, #9A2D0B 0%, #C04A18 100%)", seg: "linear-gradient(165deg, #A8330D 0%, #BB581E 100%)",
    glow: "rgba(255,168,88,0.65)", bg: "#B8421A", scheme: "dark",
  },
};

/** The weather a day with no sky set reads as (spec §3.3: "unset reads as the default theme"). */
export const DEFAULT_WEATHER: Weather = "sunny";

/** Labels used on every screen (text lives in src/strings, `t.common.weather.label`). */
export const WEATHER_LABEL: Record<Weather, string> = t.common.weather.label;
/** The headline word ("The weekend's looking sunny."; `t.common.weather.word`). */
export const WEATHER_WORD: Record<Weather, string> = t.common.weather.word;
/** Fit wording for A · Sky Mode (spec §6.3; `t.common.fit.label`). */
export const FIT_LABEL = t.common.fit.label;

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** CSS for every theme: `[data-weather=x] { --ink: …; … }`. Rendered once in the layout. */
export function themeCss(): string {
  return WEATHERS.map((w) => {
    const theme = THEMES[w];
    const vars = Object.entries(theme)
      .filter(([k]) => k !== "scheme")
      .map(([k, v]) => `--${kebab(k)}:${v}`)
      .join(";");
    return `[data-weather="${w}"]{${vars};color-scheme:${theme.scheme}}`;
  }).join("\n");
}
