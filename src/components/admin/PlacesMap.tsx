import { useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import type { Activity } from "~/content/schema";
import { baseStyle, hasWebGL, MAX_BOUNDS, setUpMapLibre, SYDNEY_BOUNDS } from "~/components/map/maplibreSetup";

/**
 * The admin's real map for the Places editor (spec §4.3 "Maps (D15)", §4.5): each numbered place is a
 * draggable pin; the walking line, toilets and cafés, the trip from Central and the way back are drawn
 * read-only. Lazily loaded (MapLibre is large). Without WebGL it says so, and the number inputs next to
 * it still do everything.
 */
type Geo = Activity["geo"];
interface Props {
  geo: Geo;
  selected: number | null;
  onSelect: (i: number) => void;
  onMove: (i: number, lng: number, lat: number) => void;
}

/** Mode colours, matching the visitor map's legend in spirit: walks grey, each mode its own colour. */
const MODE_COLOUR: ExpressionSpecification = ["match", ["get", "mode"], "train", "#F6891F", "bus", "#00B5EF", "ferry", "#5AB031", "metro", "#168388", "light-rail", "#E4022D", "#64748b"];
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
const pinCls = "flex h-8 min-w-8 cursor-grab items-center justify-center rounded-full border-2 px-1.5 text-sm font-bold shadow-md active:cursor-grabbing";
const pinOff = "border-white bg-slate-900 text-white";
const pinOn = "border-slate-900 bg-amber-300 text-slate-900 ring-4 ring-amber-300/50";

type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: "LineString"; coordinates: number[][] } | { type: "Point"; coordinates: number[] } };
type Fc = { type: "FeatureCollection"; features: Feature[] };
const lines = (ls: readonly (readonly [number, number])[][] | undefined, props: Record<string, unknown> = {}): Feature[] =>
  (ls ?? []).map((l) => ({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: l.map((p) => [...p]) } }));
const legs = (g: Geo["trip"]): Feature[] => (g?.legs ?? []).flatMap((l) => lines([l.coords], { mode: l.mode }));
const data = (geo: Geo): Record<string, Fc> => ({
  trail: { type: "FeatureCollection", features: lines(geo.trail) },
  trip: { type: "FeatureCollection", features: legs(geo.trip) },
  back: { type: "FeatureCollection", features: legs(geo.back) },
  facilities: { type: "FeatureCollection", features: (geo.facilities ?? []).map((f) => ({ type: "Feature", properties: { kind: f.kind }, geometry: { type: "Point", coordinates: [f.lng, f.lat] } })) },
});

export default function PlacesMap({ geo, selected, onSelect, onMove }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [noTiles, setNoTiles] = useState(false);
  // The latest callbacks, for marker listeners created once per pin.
  const cb = useRef({ onSelect, onMove });
  useEffect(() => {
    cb.current = { onSelect, onMove };
  });

  const fit = () => {
    const m = map.current;
    if (!m) return;
    const pts: [number, number][] = [...geo.places.map((p) => [p.lng, p.lat] as [number, number]), ...(geo.trail ?? []).flat()];
    if (!pts.length) return;
    const b = pts.reduce((acc, p) => acc.extend(p), new (setUpMapLibre().LngLatBounds)(pts[0], pts[0]));
    m.fitBounds(b, { padding: 48, maxZoom: 16, duration: 0 });
  };

  useEffect(() => {
    if (!box.current) return;
    if (!hasWebGL()) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    const maplibregl = setUpMapLibre();
    let m: MlMap;
    try {
      m = new maplibregl.Map({ container: box.current, style: baseStyle(false), bounds: SYDNEY_BOUNDS, maxBounds: MAX_BOUNDS, attributionControl: { compact: true } });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("error", (e) => {
      const msg = String(e.error?.message ?? "");
      if (msg.includes("WebGL")) setFailed(true);
      else if ((e as { sourceId?: string }).sourceId === "protomaps" || /pmtiles|sydney\.pmtiles/i.test(msg)) setNoTiles(true);
    });
    m.on("load", () => {
      const d = data(geo);
      for (const [id, fc] of Object.entries(d)) m.addSource(id, { type: "geojson", data: fc });
      const round = { "line-cap": "round", "line-join": "round" } as const;
      m.addLayer({ id: "back", type: "line", source: "back", layout: round, paint: { "line-color": MODE_COLOUR, "line-width": 3, "line-opacity": 0.55, "line-dasharray": [1, 1.5] } });
      m.addLayer({ id: "trip", type: "line", source: "trip", layout: round, paint: { "line-color": MODE_COLOUR, "line-width": 4, "line-opacity": 0.85 } });
      m.addLayer({ id: "trail-casing", type: "line", source: "trail", layout: round, paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 } });
      m.addLayer({ id: "trail", type: "line", source: "trail", layout: round, paint: { "line-color": "#E8633A", "line-width": 4 } });
      m.addLayer({
        id: "facilities",
        type: "circle",
        source: "facilities",
        paint: { "circle-radius": 5, "circle-color": ["match", ["get", "kind"], "toilet", "#2B6CB0", "#B7791F"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
      });
      setLoaded(true);
    });
    return () => {
      for (const mk of markers.current) mk.remove();
      markers.current = [];
      m.remove();
      map.current = null;
    };
    // The map is built once; its data is kept up to date below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lines and facilities, whenever they change (e.g. after pasting GeoJSON).
  const lineKey = JSON.stringify([geo.trail, geo.trip, geo.back, geo.facilities]);
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    for (const [id, fc] of Object.entries(data(geo))) (m.getSource(id) as GeoJSONSource | undefined)?.setData(fc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey, loaded]);

  // Pins: rebuilt when places are added, removed or reordered; otherwise moved and relabelled in place.
  const count = geo.places.length;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const maplibregl = setUpMapLibre();
    for (const mk of markers.current) mk.remove();
    markers.current = geo.places.map((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      let dragged = false;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!dragged) cb.current.onSelect(i);
        dragged = false;
      });
      const mk = new maplibregl.Marker({ element: el, draggable: true, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(m);
      mk.on("dragstart", () => {
        dragged = true;
        cb.current.onSelect(i);
      });
      mk.on("dragend", () => {
        const { lng, lat } = mk.getLngLat();
        cb.current.onMove(i, round5(lng), round5(lat));
        // A click can follow the drag's pointerup; let it through on the next real click.
        setTimeout(() => (dragged = false), 0);
      });
      return mk;
    });
    fit();
    // Only the number of places decides when pins are rebuilt and the view refitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, loaded]);

  useEffect(() => {
    geo.places.forEach((p, i) => {
      const mk = markers.current[i];
      if (!mk) return;
      const ll = mk.getLngLat();
      if (Number.isFinite(p.lng) && Number.isFinite(p.lat) && (ll.lng !== p.lng || ll.lat !== p.lat)) mk.setLngLat([p.lng, p.lat]);
      const el = mk.getElement();
      el.textContent = String(p.n);
      // Toggle only our classes: MapLibre keeps its own (positioning) classes on the element.
      el.classList.add(...pinCls.split(" "));
      el.classList.remove(...(i === selected ? pinOff : pinOn).split(" "));
      el.classList.add(...(i === selected ? pinOn : pinOff).split(" "));
      el.style.zIndex = i === selected ? "2" : "";
      el.setAttribute("aria-label", `Place ${p.n}: ${p.name || "unnamed"} (drag to move)`);
      el.setAttribute("aria-pressed", String(i === selected));
    });
  });

  // A place selected in the list is brought into view if it's off the map.
  useEffect(() => {
    const m = map.current;
    const p = selected === null ? null : geo.places[selected];
    if (!m || !p || !Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    if (!m.getBounds().contains([p.lng, p.lat])) m.panTo([p.lng, p.lat]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (failed) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        The map can't be shown in this browser (it needs WebGL). Use the longitude and latitude boxes instead.
      </p>
    );
  }
  return (
    <div>
      <div ref={box} role="region" aria-label="Places map (drag the numbered pins)" className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <button type="button" className="font-semibold underline" onClick={fit}>
          Fit to places
        </button>
        <span>
          <span className="mr-1 inline-block h-1 w-4 rounded bg-[#E8633A] align-middle" />
          Walking line
        </span>
        <span>
          <span className="mr-1 inline-block h-1 w-4 rounded bg-[#F6891F] align-middle" />
          Trip from Central (train orange, bus blue, ferry green, metro teal, light rail red, walk grey)
        </span>
        <span>Way back: faint dashes</span>
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-full bg-[#2B6CB0] align-middle" />
          Toilets
        </span>
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-full bg-[#B7791F] align-middle" />
          Cafés
        </span>
      </div>
      {noTiles && <p className="mt-1 text-xs text-amber-800">The street map tiles aren't available here, so pins and lines are drawn on a blank background.</p>}
    </div>
  );
}
