import type { Weather } from "~/stores/weather";
import type { CardData } from "./content";
import type { DateStr } from "./dates";
import type { Plan } from "./plan";
import { common } from "~/strings/en-AU/common";

/**
 * The live forecast (spec §11.1). A scheduled job fetches Open-Meteo's daily forecast for each area below
 * into D1; the app reads it from `/data/forecast.json` and turns each day into one of the four skies.
 */

export const AREAS = [
  { id: "city", lat: -33.8688, lng: 151.2093 },
  { id: "blue-mountains", lat: -33.7125, lng: 150.3119 },
  { id: "northern-beaches", lat: -33.6773, lng: 151.3029 },
  { id: "royal-np", lat: -34.1, lng: 151.07 },
  // The day trips by train beyond greater Sydney.
  { id: "newcastle", lat: -32.9283, lng: 151.7817 },
  { id: "illawarra", lat: -34.4278, lng: 150.8931 },
] as const;
export type AreaId = (typeof AREAS)[number]["id"];
export const isAreaId = (v: unknown): v is AreaId => AREAS.some((a) => a.id === v);

/**
 * The forecast area closest to a place (plain lat/lng distance is fine at this scale). South of about
 * −34.2 (Coalcliff and the Sea Cliff Bridge onwards) is the Illawarra, though the Royal National Park
 * point is nearer: the same line as the fire districts (`fireDistrict` in alerts.ts).
 */
export function nearestArea(p: { lat: number; lng: number }): AreaId {
  if (p.lat < -34.2) return "illawarra";
  let best: AreaId = "city";
  let bestD = Infinity;
  for (const a of AREAS) {
    const d = (a.lat - p.lat) ** 2 + (a.lng - p.lng) ** 2;
    if (d < bestD) [best, bestD] = [a.id, d];
  }
  return best;
}

export interface DailyValues {
  /** precipitation_probability_max, % */
  rainChance: number;
  /** precipitation_sum, mm */
  rainMm: number;
  /** temperature_2m_max, °C */
  tempMax: number;
  /** cloud_cover_mean, % */
  cloud: number;
}

/** Spec §11.1 mapping, applied in order: rainy, hot, cloudy, sunny. */
export function skyFromDaily(d: DailyValues): Weather {
  if (d.rainChance >= 50 || d.rainMm >= 2) return "rainy";
  if (d.tempMax >= 30) return "hot";
  if (d.cloud >= 70) return "cloudy";
  return "sunny";
}

export interface DayForecast {
  sky: Weather;
  /** Chance of rain, %, for the caption ("Forecast: rainy, 60% chance"). */
  rain: number;
}
export interface ForecastData {
  /** When the job last fetched it (ISO), or null when there's no forecast yet. */
  updatedAt: string | null;
  areas: Partial<Record<AreaId, Record<DateStr, DayForecast>>>;
}
export const NO_FORECAST: ForecastData = { updatedAt: null, areas: {} };

export const OPEN_METEO_DAILY = "precipitation_probability_max,precipitation_sum,temperature_2m_max,cloud_cover_mean";

export function openMeteoUrl(a: { lat: number; lng: number }): string {
  const q = new URLSearchParams({ latitude: String(a.lat), longitude: String(a.lng), daily: OPEN_METEO_DAILY, timezone: "Australia/Sydney", forecast_days: "7" });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** Reads Open-Meteo's daily block into one row per date; days with missing values are skipped. */
export function parseOpenMeteo(json: unknown): (DailyValues & { date: DateStr })[] {
  const d = (json as { daily?: Record<string, unknown[]> })?.daily;
  if (!d || !Array.isArray(d.time)) return [];
  const num = (k: string, i: number) => (typeof d[k]?.[i] === "number" ? (d[k][i] as number) : null);
  const out: (DailyValues & { date: DateStr })[] = [];
  d.time.forEach((date, i) => {
    const v = { rainChance: num("precipitation_probability_max", i), rainMm: num("precipitation_sum", i), tempMax: num("temperature_2m_max", i), cloud: num("cloud_cover_mean", i) };
    if (typeof date !== "string" || Object.values(v).some((x) => x === null)) return;
    out.push({ date: date as DateStr, ...(v as DailyValues) });
  });
  return out;
}

/** "updated 2 h ago" for the caption; the forecast's age matters more than its exact time. */
export function forecastAge(updatedAt: string, now: Date = new Date()): string {
  const s = common.forecast;
  const mins = Math.max(0, Math.round((now.getTime() - new Date(updatedAt).getTime()) / 60000));
  if (mins < 5) return s.updatedJustNow;
  if (mins < 60) return s.updatedMins(mins);
  if (mins < 48 * 60) return s.updatedHours(Math.round(mins / 60));
  return s.updatedDays(Math.round(mins / 1440));
}

/** The forecast for a day in an area, falling back to the city's. */
export const forecastFor = (fc: ForecastData, date: DateStr, area: AreaId = "city"): (DayForecast & { area: AreaId }) | null => {
  const own = fc.areas[area]?.[date];
  if (own) return { ...own, area };
  const city = fc.areas.city?.[date];
  return city ? { ...city, area: "city" } : null;
};

export interface ForecastAlert {
  date: DateStr;
  sky: Weather;
  /** Plans on that day the new sky makes a Skip. */
  count: number;
}

type FitCard = Pick<CardData, "weatherFit" | "forecastArea">;

/**
 * Pre-sets each forecast day's sky (spec §11.1): `skySource: "auto"`, never over a sky the user chose.
 * A day with plans uses the forecast for its first plan's area. Returns the same plan object when
 * nothing changed, plus an alert for each day whose auto sky changed and now makes a plan a Skip.
 * Auto changes don't touch `updatedAt` (that's for the user's own edits).
 */
export function applyForecast(plan: Plan, fc: ForecastData, cards: ReadonlyMap<string, FitCard>, today: DateStr): { plan: Plan; alerts: ForecastAlert[] } {
  const dates = new Set(Object.values(fc.areas).flatMap((byDate) => Object.keys(byDate ?? {})));
  const days = { ...plan.days };
  const alerts: ForecastAlert[] = [];
  let changed = false;
  for (const date of [...dates].sort()) {
    if (date < today) continue;
    const entry = days[date];
    if (entry?.sky && entry.skySource === "manual") continue;
    const first = entry?.items[0];
    const f = forecastFor(fc, date, (first && cards.get(first.id)?.forecastArea) || "city");
    if (!f || (entry?.sky === f.sky && entry.skySource === "auto")) continue;
    if (entry?.sky) {
      const count = entry.items.filter((it) => {
        const c = cards.get(it.id);
        return c && c.weatherFit[f.sky] === 0 && c.weatherFit[entry.sky!] > 0;
      }).length;
      if (count) alerts.push({ date, sky: f.sky, count });
    }
    days[date] = { items: entry?.items ?? [], sky: f.sky, skySource: "auto" };
    changed = true;
  }
  return { plan: changed ? { ...plan, days } : plan, alerts };
}

/** "Use forecast": back to the forecast's sky for a day the user had set by hand. */
export function restoreForecastSky(plan: Plan, date: DateStr, sky: Weather): Plan {
  const entry = plan.days[date] ?? { items: [], skySource: "auto" as const };
  return { ...plan, days: { ...plan.days, [date]: { ...entry, sky, skySource: "auto" } }, updatedAt: new Date().toISOString() };
}
