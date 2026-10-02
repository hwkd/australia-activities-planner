// Fetches a walk's line and nearby toilets / cafés from OpenStreetMap (Overpass API) as GeoJSON, to
// paste into an activity's "Street map data" in the admin (spec §11.2). An editor checks it against
// the official map before publishing. OSM data is © OpenStreetMap contributors (ODbL).
//   node scripts/map/osm-trail.mjs --name "Bondi to Coogee"     (a walking route by name, Sydney area)
//   node scripts/map/osm-trail.mjs --relation 123456   |   --way 123456
import { writeFileSync } from "node:fs";

const arg = (k) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const SYDNEY = "-34.25,150.15,-33.5,151.4"; // south, west, north, east
const name = arg("--name"), relation = arg("--relation"), way = arg("--way");
const target = relation
  ? `relation(${Number(relation)})->.r; way(r.r)->.w;`
  : way
    ? `way(${Number(way)})->.w;`
    : name
      ? `relation["route"~"^(hiking|foot|walking)$"]["name"~"${name.replace(/["\\]/g, "")}",i](${SYDNEY})->.r; way(r.r)->.w;`
      : null;
if (!target) {
  console.error('Usage: node scripts/map/osm-trail.mjs --name "<route name>" | --relation <id> | --way <id>');
  process.exit(1);
}
const query = `[out:json][timeout:60]; ${target} (.w; node(around.w:150)["amenity"~"^(toilets|cafe)$"];); out geom;`;
const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "sydney-weekend-finder (editor tool)" },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) throw new Error(`Overpass: HTTP ${res.status}`);
const { elements } = await res.json();
const features = [];
for (const e of elements) {
  if (e.type === "way" && e.geometry?.length > 1)
    features.push({ type: "Feature", properties: { osm: `way/${e.id}`, name: e.tags?.name }, geometry: { type: "LineString", coordinates: e.geometry.map((p) => [p.lon, p.lat]) } });
  if (e.type === "node") features.push({ type: "Feature", properties: { osm: `node/${e.id}`, amenity: e.tags?.amenity }, geometry: { type: "Point", coordinates: [e.lon, e.lat] } });
}
const out = JSON.stringify({ type: "FeatureCollection", features });
const file = `.map-data/osm-${(name ?? relation ?? way).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.geojson`;
writeFileSync(file, out);
console.log(`${features.filter((f) => f.geometry.type === "LineString").length} line(s), ${features.filter((f) => f.geometry.type === "Point").length} toilets/cafés → ${file}`);
console.log("Check it against the official map, then paste the file's contents into the admin (Street map data).");
