import { describe, expect, it } from "vitest";
import { geoFromGeoJson, legsFromGeoJson } from "./geo";

describe("pasted GeoJSON for the street map", () => {
  it("takes lines as the trail and OSM toilets / cafés as facilities", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { highway: "footway" }, geometry: { type: "LineString", coordinates: [[151.2743, -33.8908], [151.2771, -33.8949123456]] } },
        { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: [[[151.25, -33.9], [151.26, -33.91]], [[1, 2]]] } },
        { type: "Feature", properties: { amenity: "toilets" }, geometry: { type: "Point", coordinates: [151.27, -33.89] } },
        { type: "Feature", properties: { kind: "cafe" }, geometry: { type: "Point", coordinates: [151.26, -33.9] } },
        { type: "Feature", properties: { amenity: "bench" }, geometry: { type: "Point", coordinates: [151.26, -33.9] } },
      ],
    };
    expect(geoFromGeoJson(fc)).toEqual({
      trail: [
        [[151.2743, -33.8908], [151.2771, -33.894912]],
        [[151.25, -33.9], [151.26, -33.91]],
      ],
      facilities: [
        { kind: "toilet", lng: 151.27, lat: -33.89 },
        { kind: "cafe", lng: 151.26, lat: -33.9 },
      ],
    });
  });
  it("ignores anything it can't use", () => {
    expect(geoFromGeoJson({ type: "Polygon", coordinates: [] })).toEqual({});
    expect(geoFromGeoJson("nope")).toEqual({});
  });
});

describe("pasted GeoJSON for the trip from Central and the way back", () => {
  it("makes one leg per line, keeping mode and line properties", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { mode: "train", line: "T4" }, geometry: { type: "LineString", coordinates: [[151.2069, -33.8853], [151.2, -33.89]] } },
        { type: "Feature", properties: { mode: "boat" }, geometry: { type: "MultiLineString", coordinates: [[[151.2, -33.89], [151.21, -33.9]]] } },
        { type: "Feature", properties: { amenity: "toilets" }, geometry: { type: "Point", coordinates: [151.27, -33.89] } },
      ],
    };
    expect(legsFromGeoJson(fc)).toEqual([
      { mode: "train", line: "T4", coords: [[151.2069, -33.8853], [151.2, -33.89]] },
      { mode: "walk", coords: [[151.2, -33.89], [151.21, -33.9]] },
    ]);
    expect(legsFromGeoJson({ type: "Point", coordinates: [151, -33.9] })).toEqual([]);
  });
});
