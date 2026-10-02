// Puts the map files from .map-data/ into the R2 bucket bound as MAP (spec §11.2): the local one by
// default (honours SWF_STATE, like the db scripts), or the real one with --remote.
//   npx tsx scripts/map/upload.ts [--remote]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const BUCKET = "sydney-weekend-finder-map";
const remote = process.argv.includes("--remote");
const where = remote ? ["--remote"] : ["--local", ...(process.env.SWF_STATE ? ["--persist-to", process.env.SWF_STATE] : [])];

function put(key: string, file: string, type: string) {
  execFileSync("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", type, ...where], { stdio: ["ignore", "ignore", "inherit"] });
}

if (!existsSync(".map-data/sydney.pmtiles")) {
  console.log("No .map-data/sydney.pmtiles: the map view stays off (see scripts/map/fetch-assets.mjs).");
  process.exit(0);
}
put("sydney.pmtiles", ".map-data/sydney.pmtiles", "application/vnd.pmtiles");
// Font stacks are stored with underscores for spaces (the /map route maps them back).
for (const font of readdirSync(".map-data/fonts")) for (const f of readdirSync(`.map-data/fonts/${font}`)) put(`fonts/${font.replace(/ /g, "_")}/${f}`, `.map-data/fonts/${font}/${f}`, "application/x-protobuf");
console.log(`Map files uploaded to ${remote ? "the real" : "the local"} ${BUCKET} bucket.`);
