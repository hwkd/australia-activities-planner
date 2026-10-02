import { WEATHERS, type Weather } from "~/stores/weather";
import type { LegKind } from "~/lib/route";

/**
 * Transport colours: the leg badges in Getting there (per weather, on glass) and the trip's lines on
 * the real map (on the light or dark base map). Kinds never differ by colour alone: the badges carry
 * an icon and a label, the timeline rail and the map lines a dash pattern.
 */
const kinds = (s: string): Record<LegKind, string> => {
  const [train, bus, ferry, walk] = s.split(" ");
  return { train, bus, ferry, walk };
};

/** Leg badge colours on glass (Getting there), and the ink used on them. Ported from the A detail artboards (K). */
export const LEG_COLOR: Record<Weather, Record<LegKind | "ink", string>> = {
  sunny: { ...kinds("#FFB067 #8AD8FF #8CE99A #FFFFFF"), ink: "#0A1E5E" },
  cloudy: { ...kinds("#A8420A #0B5E99 #166F36 #364251"), ink: "#FFFFFF" },
  rainy: { ...kinds("#FFA24C #E7A6FF #6EE08E #F1F4FF"), ink: "#0A1330" },
  hot: { ...kinds("#FFB27A #9ED8FF #A3EBB0 #FFF7EC"), ink: "#3A0E02" },
};

/**
 * The leg colours as CSS variables per weather (`--leg-train`, …, `--leg-ink`), so the static Getting
 * there section re-themes with the sky like everything else.
 */
export function legCss(): string {
  return WEATHERS.map((w) => {
    const c = LEG_COLOR[w];
    return `[data-weather="${w}"]{${(Object.keys(c) as (keyof typeof c)[]).map((k) => `--leg-${k}:${c[k]}`).join(";")}}`;
  }).join("\n");
}

/** The timeline rail between legs: solid for trains, dashed by kind otherwise (never colour alone). */
export function legRail(kind: LegKind): string {
  const c = `var(--leg-${kind})`;
  const rg = (stops: string) => `repeating-linear-gradient(180deg, ${stops.replace(/C/g, c)})`;
  if (kind === "train") return c;
  if (kind === "bus") return rg("C 0 7px, transparent 7px 11px");
  if (kind === "ferry") return rg("C 0 10px, transparent 10px 13px, C 13px 15px, transparent 15px 18px");
  return `radial-gradient(circle, ${c} 1.6px, transparent 2px) center top / 4px 6px repeat-y`;
}

/**
 * The trip's lines on the real map, on the light and the dark (rainy) base map. `ground` is the land
 * colour, behind the line samples under the map.
 */
export const TRANSIT_LINE: Record<"light" | "dark", Record<LegKind | "casing" | "ground", string>> = {
  light: { ...kinds("#C24E00 #0A6EA8 #138A3E #3A3F5C"), casing: "#FFFFFF", ground: "#F1EFEA" },
  dark: { ...kinds("#FFA24C #E7A6FF #6EE08E #F1F4FF"), casing: "#0A1330", ground: "#2A2A2E" },
};

/**
 * Dash patterns on the real map, in line widths (MapLibre's `line-dasharray`): trains solid, buses
 * dashed, ferries dash-dot, walks dotted (round caps on zero-length dashes). Matches the rail above.
 */
export const TRANSIT_DASH: Record<LegKind, { dash: number[] | null; width: number }> = {
  train: { dash: null, width: 4.5 },
  bus: { dash: [2, 1.4], width: 4 },
  ferry: { dash: [3.2, 1.2, 0.8, 1.2], width: 4 },
  walk: { dash: [0, 1.8], width: 3.6 },
};
