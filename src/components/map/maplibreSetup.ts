import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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

/** The whole Sydney extract, and how far a visitor can pan. */
export const SYDNEY_BOUNDS: [number, number, number, number] = [150.15, -34.25, 151.4, -33.5];
export const MAX_BOUNDS: [number, number, number, number] = [149.9, -34.45, 151.65, -33.3];

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
