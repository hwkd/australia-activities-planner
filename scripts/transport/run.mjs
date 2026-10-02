// The weekly transport job (tracker M9a, narrowed by D14): for every published activity, ask the Trip
// Planner for a Saturday late-morning journey from Central, compare its lines with the written trip
// (routes.pt.legs) and the trip drawn on the map (geo.trip), and write a report for a PR. It never
// edits content or maps; editors apply changes in the admin (spec §4.3).
// Run: TFNSW_API_KEY=… node scripts/transport/run.mjs [--remote | --seed]
//   (default) the local D1 · --remote the production D1 (needs CLOUDFLARE_API_TOKEN, read access is
//   enough) · --seed the seed files in db/seed/activities (no database needed)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { d1Query } from "../db/wrangler.ts";
import { compareTrip, driftReport } from "../../src/lib/transportDrift.ts";
import { ORIGIN_STOPS, nextSaturdayLateMorning, normaliseJourney, planTrip } from "./tfnsw.mjs";

function publishedActivities() {
  if (process.argv.includes("--seed"))
    return readdirSync("db/seed/activities")
      .filter((x) => x.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(`db/seed/activities/${f}`, "utf8")));
  const rows = d1Query("SELECT published_json FROM activities WHERE published_json IS NOT NULL ORDER BY id", process.argv.includes("--remote"));
  return rows.map((r) => JSON.parse(r.published_json));
}

const when = nextSaturdayLateMorning();
const results = [];
const raw = {};
const central = ORIGIN_STOPS.central;
for (const a of publishedActivities()) {
  try {
    const json = await planTrip(central.id, a.routes.dest, when);
    const journey = normaliseJourney(json);
    raw[a.id] = journey;
    if (journey) results.push(compareTrip(a.id, a.routes.pt, journey, a.geo?.trip));
    else results.push({ activityId: a.id, routeChanged: true, mapFlag: false, notes: ["The Trip Planner found no journey."] });
  } catch (e) {
    if (String(e.message).includes("TFNSW_API_KEY")) throw e;
    results.push({ activityId: a.id, routeChanged: false, mapFlag: false, notes: [`Couldn't check: ${e.message}`] });
  }
  await new Promise((r) => setTimeout(r, 250)); // stay well inside the API's rate limit
}
mkdirSync("data/transport", { recursive: true });
writeFileSync("data/transport/latest.json", JSON.stringify({ when, journeys: raw }, null, 1) + "\n");
writeFileSync("transport-report.md", driftReport(results, `${when.itdDate} ${when.itdTime}`));
console.log(`Checked ${results.length} trips from Central; ${results.filter((r) => r.routeChanged || r.mapFlag).length} need a look.`);
