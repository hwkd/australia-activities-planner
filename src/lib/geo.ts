import type { Activity } from "~/content/schema";

type Geo = Activity["geo"];
export type MapLeg = NonNullable<Geo["trip"]>["legs"][number];
export const MAP_LEG_MODES = ["walk", "train", "bus", "ferry", "metro", "light-rail"] as const satisfies readonly MapLeg["mode"][];

type Json = Record<string, unknown>;
type LngLat = [number, number];

/** Calls `line` for every LineString part and `point` for every Point in pasted GeoJSON (a Feature, FeatureCollection or bare geometry). */
function walk(input: unknown, line: (coords: LngLat[], props: Json) => void, point: (p: LngLat, props: Json) => void) {
  const pt = (c: unknown): LngLat | null => (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number" ? [round(c[0]), round(c[1])] : null);
  const ln = (cs: unknown, props: Json) => {
    const pts = Array.isArray(cs) ? cs.map(pt).filter((p): p is LngLat => !!p) : [];
    if (pts.length >= 2) line(pts, props);
  };
  const visit = (g: Json | null | undefined, props: Json = {}) => {
    if (!g || typeof g !== "object") return;
    switch (g.type) {
      case "FeatureCollection":
        for (const f of (g.features as unknown[]) ?? []) visit(f as Json);
        break;
      case "Feature":
        visit(g.geometry as Json, (g.properties as Json) ?? {});
        break;
      case "GeometryCollection":
        for (const x of (g.geometries as unknown[]) ?? []) visit(x as Json, props);
        break;
      case "LineString":
        ln(g.coordinates, props);
        break;
      case "MultiLineString":
        for (const l of (g.coordinates as unknown[]) ?? []) ln(l, props);
        break;
      case "Point": {
        const p = pt(g.coordinates);
        if (p) point(p, props);
      }
    }
  };
  visit(input as Json);
}

/**
 * Reads pasted GeoJSON into the walking line and facilities of an activity's `geo` (spec §4.3, D15):
 * LineStrings and MultiLineStrings become the trail; Points tagged toilet/cafe (OSM's `amenity` =
 * toilets / cafe, or a `kind` property) become facilities. Everything else is ignored. The numbered
 * places are edited in the admin's Places editor, never pasted.
 */
export function geoFromGeoJson(input: unknown): Pick<Geo, "trail" | "facilities"> {
  const trail: LngLat[][] = [];
  const facilities: NonNullable<Geo["facilities"]> = [];
  walk(
    input,
    (coords) => trail.push(coords),
    (p, props) => {
      const kind = props.kind === "toilet" || props.amenity === "toilets" ? "toilet" : props.kind === "cafe" || props.amenity === "cafe" ? "cafe" : null;
      if (kind) facilities.push({ kind, lng: p[0], lat: p[1] });
    }
  );
  return { ...(trail.length ? { trail } : {}), ...(facilities.length ? { facilities } : {}) };
}

/**
 * Reads pasted GeoJSON into the legs of the trip from Central or the way back: one leg per line, in
 * order. A `mode` property (walk, train, bus, ferry, metro, light-rail) and a `line` property (e.g.
 * "T4", "333") are kept when present; otherwise the leg is a walk, for the editor to set.
 */
export function legsFromGeoJson(input: unknown): MapLeg[] {
  const legs: MapLeg[] = [];
  walk(
    input,
    (coords, props) => {
      const mode = MAP_LEG_MODES.find((m) => m === props.mode) ?? "walk";
      const line = typeof props.line === "string" && props.line.trim() ? props.line.trim() : undefined;
      legs.push({ mode, ...(line ? { line } : {}), coords });
    },
    () => {}
  );
  return legs;
}

/** 6 decimal places (about 10 cm) is plenty, and keeps the activity record small. */
const round = (n: number) => Math.round(n * 1e6) / 1e6;
