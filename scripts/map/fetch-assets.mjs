// Downloads the map's label fonts (glyph PBFs: Latin ranges only) from the Protomaps basemap assets
// into .map-data/fonts, so they can be self-hosted in R2 next to the tiles (spec §11.2).
//   node scripts/map/fetch-assets.mjs
// The tiles (still named sydney.pmtiles) come from: pmtiles extract https://build.protomaps.com/<date>.pmtiles
//   .map-data/sydney.pmtiles --bbox=150.15,-34.75,151.85,-32.85 --maxzoom=14   (about 47 MB: greater Sydney
//   plus the day trips by train, Newcastle to Kiama; build 20261001)
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://protomaps.github.io/basemaps-assets/fonts";
const FONTS = ["Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic"];
const RANGES = ["0-255", "256-511", "8192-8447"]; // Basic Latin + Latin-1, Latin Extended-A/B, punctuation (– · ’)

for (const font of FONTS) {
  mkdirSync(`.map-data/fonts/${font}`, { recursive: true });
  for (const range of RANGES) {
    const res = await fetch(`${BASE}/${encodeURIComponent(font)}/${range}.pbf`);
    if (!res.ok) throw new Error(`${font} ${range}: HTTP ${res.status}`);
    writeFileSync(`.map-data/fonts/${font}/${range}.pbf`, Buffer.from(await res.arrayBuffer()));
  }
  console.log(`${font}: ${RANGES.length} ranges`);
}
