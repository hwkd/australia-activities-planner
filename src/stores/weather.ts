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

/**
 * Puts a sky's theme on the page (spec §3.5): the colours switch at once and only the sky scene
 * fades (SkyScene.astro). No element runs its own colour transition: hundreds of those made phones
 * drop frames, and halfway through they left text the same grey as the sky. (A whole-page View
 * Transition was tried and dropped: Chromium and Safari send every tap to <html> while one runs.)
 */
export function applyTheme(w: Weather): void {
  const root = document.documentElement;
  const old = root.dataset.weather;
  if (old === w) return;
  root.dataset.weather = w;
  settleTheme(root);
  if (old) keepMovingWhileFading(old);
}

/** Each sky layer's current fade-out, so a stale one ending can't stop a newer one. */
const fadingOut = new WeakMap<HTMLElement, Animation>();

/**
 * The sky being faded out keeps its loops running until its own fade ends (`leaving` in
 * SkyScene.astro) instead of freezing mid-fall. Per layer, so several can fade out at once, and tied
 * to that fade's Animation (not to any transition event on the layer: a fade-in reversed by a quick
 * second switch also reports a cancel), so it can't drift from the fade's length. Call after the fade
 * has started.
 */
function keepMovingWhileFading(sky: string): void {
  const layer = document.querySelector<HTMLElement>(`.scene .sky-${sky}`);
  if (!layer) return;
  const fade = layer.getAnimations().find((a) => a instanceof CSSTransition && a.transitionProperty === "opacity");
  if (!fade) return; // no fade (reduced motion)
  fadingOut.set(layer, fade);
  layer.classList.add("leaving");
  const end = () => {
    if (fadingOut.get(layer) !== fade) return;
    fadingOut.delete(layer);
    layer.classList.remove("leaving");
  };
  fade.finished.then(end, end);
}

/**
 * Computes the new theme colours under `el`, whose `data-weather` just changed, with the colour
 * transitions of `.press`, `.cell` and `.dday` held off (`theme-switching` in global.css). Call it
 * before the browser renders: right after the change, or from a layout effect.
 */
export function settleTheme(el: HTMLElement): void {
  el.classList.add("theme-switching");
  void el.offsetWidth; // style for everything under `el` (WebKit and Firefox compute it lazily)
  el.classList.remove("theme-switching");
}

/** Pages whose theme follows $weather call this once (My plans themes by the selected day instead). */
export function bindThemeToWeather(): () => void {
  return $weather.subscribe(applyTheme);
}
