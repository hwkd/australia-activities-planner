import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { baseStyle, hasWebGL, MAX_BOUNDS, setUpMapLibre, SYDNEY_BOUNDS } from "./maplibreSetup";
import { TRANSIT_DASH, TRANSIT_LINE } from "~/theme/map-palette";
import { kindOf, type LegKind, type LegMode } from "~/lib/route";
import { t } from "~/strings/en-AU";

/**
 * The real map (spec §11.2, tracker M17): MapLibre over the self-hosted Sydney Protomaps extract in R2
 * (/map/…). Loaded only when a visitor opens a map, never on first load. Pins are real buttons with a
 * text label, so the map never relies on colour; everything on it is also in the list.
 */
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** Visible on the pin, e.g. "Perfect" or "1". */
  label: string;
  /** The pin's accessible name, e.g. "Bondi to Coogee: Perfect when sunny". */
  name: string;
}

/** One leg of a trip drawn on its real route (activity pages, spec §3.2 item 3), [lng, lat]. */
export interface TransitLeg {
  mode: LegMode;
  coords: readonly (readonly [number, number])[];
  /** Part of the way back: drawn a little lighter. */
  back?: boolean;
}

type Lines = readonly (readonly (readonly [number, number])[])[];
type Facility = { kind: "toilet" | "cafe"; lng: number; lat: number };
const KINDS: LegKind[] = ["walk", "bus", "ferry", "train"];

const fc = <G,>(features: G[]) => ({ type: "FeatureCollection" as const, features });
const lineData = (lines: Lines = []) => fc(lines.map((l) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: l.map((p) => [...p]) } })));
const facilityData = (f: readonly Facility[] = []) => fc(f.map((x) => ({ type: "Feature" as const, properties: { kind: x.kind }, geometry: { type: "Point" as const, coordinates: [x.lng, x.lat] } })));
const transitData = (legs: readonly TransitLeg[] = []) =>
  fc(legs.map((l) => ({ type: "Feature" as const, properties: { kind: kindOf(l.mode), back: !!l.back }, geometry: { type: "LineString" as const, coordinates: l.coords.map((p) => [...p]) } })));

interface Props {
  pins: readonly MapPin[];
  /** A walk's own line(s), [lng, lat] (activity pages, spec §3.2 item 3). Decorative: the page describes it. */
  lines?: Lines;
  /** Toilets and cafés along it. Decorative: the page lists them in its facilities. */
  facilities?: readonly Facility[];
  /**
   * The trip from the city (and the way back), each leg in its mode's colour and dash pattern. Not
   * part of the fitted view: the trip may run off the edge. Decorative: the page names the lines.
   */
  transit?: readonly TransitLeg[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Dark basemap for dark skies (rainy). */
  dark?: boolean;
  /** Accessible name of the map region. */
  label: string;
  /**
   * Small numbered dots instead of 44 px labels, where the stops are close together. Only when a
   * full-size list of the same stops sits next to the map (WCAG 2.5.8's equivalent-control exception).
   */
  compactPins?: boolean;
  height?: number;
}

export default function MapView({ pins, lines, facilities, transit, selected, onSelect, dark = false, label, height = 420, compactPins = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  // The latest overlay data, for the map's load handler (toggles can change before the map has loaded).
  const overlay = useRef({ lines, facilities, transit });
  useEffect(() => {
    overlay.current = { lines, facilities, transit };
  });
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  // No WebGL, no map: the list carries everything. Checked after mount, not while rendering: this
  // component can be server-rendered, where there's never WebGL.
  const [failed, setFailed] = useState(false);
  // Activity maps draw lines and facilities; Discover's and My plans' maps only pins.
  const overlays = !!(lines || facilities || transit);

  useEffect(() => {
    if (!box.current || failed) return;
    if (!hasWebGL()) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    setUpMapLibre();
    try {
      const m = new maplibregl.Map({
        container: box.current,
        style: baseStyle(dark),
        bounds: SYDNEY_BOUNDS,
        maxBounds: MAX_BOUNDS,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
      map.current = m;
      if (overlays) {
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#E8633A";
        const c = TRANSIT_LINE[dark ? "dark" : "light"];
        m.on("load", () => {
          const o = overlay.current;
          // The trip first, under the activity's own walking line and the facilities.
          m.addSource("transit", { type: "geojson", data: transitData(o.transit) });
          m.addLayer({
            id: "transit-casing",
            type: "line",
            source: "transit",
            filter: ["!=", ["get", "kind"], "walk"],
            paint: { "line-color": c.casing, "line-width": 7.5, "line-opacity": ["case", ["get", "back"], 0.55, 0.85] },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          for (const k of KINDS) {
            const d = TRANSIT_DASH[k];
            m.addLayer({
              id: `transit-${k}`,
              type: "line",
              source: "transit",
              filter: ["==", ["get", "kind"], k],
              paint: { "line-color": c[k], "line-width": d.width, "line-opacity": ["case", ["get", "back"], 0.7, 1], ...(d.dash ? { "line-dasharray": d.dash } : {}) },
              layout: { "line-cap": k === "walk" ? "round" : "butt", "line-join": "round" },
            });
          }
          m.addSource("trail", { type: "geojson", data: lineData(o.lines) });
          m.addLayer({ id: "trail-casing", type: "line", source: "trail", paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 }, layout: { "line-cap": "round", "line-join": "round" } });
          m.addLayer({ id: "trail", type: "line", source: "trail", paint: { "line-color": accent, "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } });
          m.addSource("facilities", { type: "geojson", data: facilityData(o.facilities) });
          m.addLayer({
            id: "facilities",
            type: "circle",
            source: "facilities",
            paint: { "circle-radius": 6, "circle-color": ["match", ["get", "kind"], "toilet", "#2B6CB0", "#B7791F"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
          });
        });
      }
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      m.on("error", (e) => {
        if (String(e.error?.message ?? "").includes("WebGL")) setFailed(true);
      });
    } catch {
      queueMicrotask(() => setFailed(true));
    }
    const pinsNow = markers.current;
    return () => {
      pinsNow.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [dark, failed, overlays]);

  // Facilities and the way back are switched on and off (the map's toggles) without rebuilding the map.
  const setData = (id: string, data: unknown) => (map.current?.getSource(id) as { setData?: (d: unknown) => void } | undefined)?.setData?.(data);
  const facKey = (facilities ?? []).map((f) => `${f.kind}${f.lng},${f.lat}`).join("|");
  useEffect(() => {
    setData("facilities", facilityData(facilities));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facKey]);
  const transitKey = (transit ?? []).map((l) => `${l.mode}${l.back ? "b" : ""}${l.coords.length}:${l.coords[0]}`).join("|");
  useEffect(() => {
    setData("transit", transitData(transit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitKey]);

  // Pins: real buttons, rebuilt (and the view fitted to them) only when they actually change.
  const pinKey = pins.map((p) => `${p.id}:${p.lat},${p.lng}:${p.label}:${p.name}`).join("|");
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const mk of markers.current.values()) mk.remove();
    markers.current.clear();
    for (const p of pins) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = compactPins ? "map-pin map-pin--sm" : "map-pin";
      el.textContent = p.label;
      el.setAttribute("aria-label", p.name);
      el.setAttribute("aria-pressed", String(p.id === selected));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(p.id);
      });
      markers.current.set(p.id, new maplibregl.Marker({ element: el, anchor: compactPins ? "center" : "bottom" }).setLngLat([p.lng, p.lat]).addTo(m));
    }
    if (pins.length || lines?.length) {
      const b = new maplibregl.LngLatBounds();
      pins.forEach((p) => b.extend([p.lng, p.lat]));
      lines?.forEach((l) => l.forEach(([lng, lat]) => b.extend([lng, lat])));
      // Room for the zoom buttons (top right) and the attribution (bottom).
      m.fitBounds(b, { padding: compactPins ? { top: 28, right: 52, bottom: 48, left: 28 } : 56, maxZoom: 15, duration: 0 });
    }
    // Pins change with the list; selection is updated below without rebuilding them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, dark]);

  useEffect(() => {
    for (const [id, mk] of markers.current) mk.getElement().setAttribute("aria-pressed", String(id === selected));
    // A place picked in the list that's off the map's view comes into view.
    const m = map.current;
    const p = selected ? markers.current.get(selected)?.getLngLat() : null;
    if (m && p && !m.getBounds().contains(p)) m.easeTo({ center: p, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400 });
  }, [selected, pinKey]);

  if (failed) return <p className="glass m-0 rounded-[22px] p-4 text-[14.5px]">{t.common.map.unavailable}</p>;
  return <div ref={box} role="region" aria-label={label} className="map-view overflow-hidden rounded-[24px]" style={{ height }} />;
}
