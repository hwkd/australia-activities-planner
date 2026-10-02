import "./storage";
import { persistentAtom } from "@nanostores/persistent";
import { $weather, weatherFromLink, type Weather } from "./weather";
import { $plan } from "./plan";
import { todayInSydney, type DateStr } from "~/lib/dates";
import { applyForecast, forecastFor, NO_FORECAST, type ForecastAlert, type ForecastData } from "~/lib/forecast";
import type { PlanCard } from "~/lib/planDays";

const json = <T>(fallback: T) => ({
  encode: JSON.stringify,
  decode: (s: string): T => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  },
});

/**
 * The live forecast (spec §11.1), kept on the device so it still shows, with its age, when offline.
 * Refreshed from /data/forecast.json once per page load.
 */
export const $forecast = persistentAtom<ForecastData>("swf.forecast", NO_FORECAST, json(NO_FORECAST));

/** Days whose forecast changed and now make a plan a Skip; shown on My plans until dismissed. */
export const $forecastAlerts = persistentAtom<ForecastAlert[]>("swf.forecastAlerts", [], json<ForecastAlert[]>([]));

/** The day the user last picked Discover's sky by hand; that day the forecast doesn't change it. */
export const $skyPickedOn = persistentAtom<string>("swf.skyPickedOn", "");

let loading: Promise<void> | null = null;
export function loadForecast(): Promise<void> {
  loading ??= fetch("/data/forecast.json")
    .then((r) => (r.ok ? (r.json() as Promise<ForecastData>) : null))
    .then((d) => {
      if (d?.updatedAt && d.areas) $forecast.set(d);
    })
    .catch(() => {
      /* offline: keep the last forecast */
    });
  return loading;
}

/** The user picks a sky (Set the sky, weather tiles): it stays for the rest of the day. */
export function chooseWeather(w: Weather) {
  $weather.set(w);
  $skyPickedOn.set(todayInSydney());
}

/**
 * Discover's default sky is today's forecast for the city, unless the user picked one today or the
 * link carries a sky (`?w=`, e.g. from a day in My plans).
 */
export function applyForecastWeather(today: DateStr = todayInSydney()) {
  if ($skyPickedOn.get() === today || weatherFromLink) return;
  const f = forecastFor($forecast.get(), today);
  if (f && $weather.get() !== f.sky) $weather.set(f.sky);
}

/** Pre-sets forecast days in the plan (auto skies) and records alerts for changed days. */
export function applyForecastToPlan(cards: readonly PlanCard[], today: DateStr = todayInSydney()) {
  if (!cards.length) return;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const { plan, alerts } = applyForecast($plan.get(), $forecast.get(), byId, today);
  if (plan !== $plan.get()) $plan.set(plan);
  const keep = $forecastAlerts.get().filter((a) => a.date >= today && !alerts.some((n) => n.date === a.date));
  if (alerts.length || keep.length !== $forecastAlerts.get().length) $forecastAlerts.set([...keep, ...alerts]);
}

export const dismissForecastAlerts = () => $forecastAlerts.set([]);
