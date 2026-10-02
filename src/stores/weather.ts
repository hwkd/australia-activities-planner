import "./storage";
import { persistentAtom } from "@nanostores/persistent";
import { isBackForward } from "./navigation";

export const WEATHERS = ["sunny", "cloudy", "rainy", "hot"] as const;
export type Weather = (typeof WEATHERS)[number];
export const isWeather = (v: unknown): v is Weather => WEATHERS.includes(v as Weather);

/** The sky the user is browsing Discover and activity pages with (spec §3.1). */
export const $weather = persistentAtom<Weather>("swf.weather", "sunny", {
  encode: (v) => v,
  decode: (v) => (isWeather(v) ? v : "sunny")
});

/** Whether this page was opened with a sky in its link (read before Discover rewrites the URL). */
export let weatherFromLink = false;

// A weather in the URL (`?w=rainy`, from a shared or bookmarked Discover link) wins over the saved
// one, matching the theme-before-paint script in the layout, except after Back/Forward.
if (typeof location !== "undefined" && !isBackForward()) {
  try {
    const w = new URLSearchParams(location.search).get("w");
    weatherFromLink = isWeather(w);
    if (isWeather(w) && w !== $weather.get()) $weather.set(w);
  } catch {
    /* no query */
  }
}

/** Pages whose theme follows $weather call this once (My plans themes by the selected day instead). */
export function bindThemeToWeather(): () => void {
  return $weather.subscribe((w) => {
    document.documentElement.dataset.weather = w;
  });
}
