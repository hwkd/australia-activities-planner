import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
// MapLibre's stylesheet comes with the map code, not with every page: as a plain import it became a
// render-blocking <link> on every page (83 KB, about 11 KB compressed), delaying Discover's first
// paint on phones even though most visits never open a map. This module waits for it, so a lazily
// loaded map (behind its Suspense fallback) is never drawn unstyled.
import cssUrl from "maplibre-gl/dist/maplibre-gl.css?url";
// MapLibre's web worker, bundled by Vite so it loads in dev and in builds (MapLibre's own default
// resolves it next to its module, which Vite's dependency bundling breaks). Imported as the worker's
// own entry: a side-effect import of it from a file of ours is dropped in builds, because maplibre-gl
// declares its dist files free of side effects, which left an empty worker and no tiles.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { t } from "~/strings/en-AU";

/**
 * Shared MapLibre setup (spec §11.2) for every map in the app and the admin: the bundled worker, the
 * PMTiles protocol over our own tiles (/map/…), and the base style themed light or dark. Imported only
 * by lazily loaded map components, so it's never in a page's first load.
 */
function loadStylesheet(href: string): Promise<void> {
  const existing = document.querySelector<HTMLLinkElement>("link[data-maplibre-css]");
  if (existing) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.maplibreCss = "";
    // A failed stylesheet still lets the map show (unstyled controls), rather than never loading.
    link.onload = link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}
if (typeof document !== "undefined") await loadStylesheet(cssUrl);

let ready = false;
export function setUpMapLibre(): typeof maplibregl {
  if (!ready) {
    maplibregl.setWorkerUrl(workerUrl);
    maplibregl.addProtocol("pmtiles", new Protocol().tile);
    ready = true;
  }
  return maplibregl;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Where the map opens (greater Sydney), and how far a visitor can pan: the tiles reach from Newcastle
 * to Kiama, for the day trips by train (scripts/map/fetch-assets.mjs).
 */
export const SYDNEY_BOUNDS: [number, number, number, number] = [150.15, -34.25, 151.4, -33.5];
export const MAX_BOUNDS: [number, number, number, number] = [149.9, -34.95, 152.1, -32.65];
/**
 * How far the pin maps (Discover, a day in My plans) can pan. MapLibre zooms in until the view fits
 * inside maxBounds, so the tight box above would stop a map from showing Newcastle and Kiama together;
 * past the tiles the map is just background.
 */
export const PIN_MAX_BOUNDS: [number, number, number, number] = [144, -40, 158, -27];

/** The base map style over our tiles; POI icons are left out (they'd need a sprite sheet). */
export function baseStyle(dark: boolean): StyleSpecification {
  const origin = location.origin;
  return {
    version: 8,
    glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
    sources: { protomaps: { type: "vector", url: `pmtiles://${origin}/map/sydney.pmtiles`, attribution: t.common.map.attribution } },
    layers: layers("protomaps", namedFlavor(dark ? "dark" : "light"), { lang: "en" }).filter((l) => !l.id.startsWith("pois")),
  };
}
