// One-off content conversion (2 Oct 2026): Getting there simplified (D14) and the real map replaces
// the schematic. Rewrites each seed activity in db/seed/activities:
//   routes.pt     ← the old trip from Central (without map line ids), plus `back: { text }`
//   routes.drive  ← a Driving? note: the time from the city, parking per car, tips (no legs)
//   routes.ride   ← one sentence, only where the old content had a rideshare tip or warning
//   map           → removed; `geo` (from scripts/map/build-geo.mjs --write) is the map now
// Run after build-geo:   node scripts/db/convert-d14-geo.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const SEED = "db/seed/activities";
let n = 0;
for (const f of readdirSync(SEED).filter((x) => x.endsWith(".json"))) {
  const a = JSON.parse(readFileSync(`${SEED}/${f}`, "utf8"));
  if (!a.geo?.places) throw new Error(`${a.id}: no geo.places yet; run scripts/map/build-geo.mjs --write first`);
  const r = a.routes;
  if (r.pt.central) {
    const c = r.pt.central;
    const pt = { total: c.total, changes: c.changes, fare: c.fare };
    if (c.nonOpal) pt.nonOpal = c.nonOpal;
    if (c.nonOpalChild) pt.nonOpalChild = c.nonOpalChild;
    pt.legs = c.legs.filter((l) => l.mode !== "car");
    pt.back = { text: r.pt.back.text };
    const un = r.unavailable ?? {};
    // The canvas (Version 36) rule: a rideshare tip where the content had one, else a "not practical" warning.
    const ride = r.ride?.notes?.length ? r.ride.notes.join(" ") : r.drive && un.ride ? un.ride.replace(/^Rideshare isn't practical for this trip: /, "Not practical: ") : undefined;
    a.routes = {
      dest: r.dest,
      pt,
      drive: r.drive ? { total: r.drive.total.central, perCar: r.drive.perCar, perCarLabel: r.drive.perCarLabel.replace(/, est\.$/, ""), notes: r.drive.notes } : null,
      ...(ride ? { ride } : {}),
      ...(un.drive ? { unavailable: { drive: un.drive } } : {}),
    };
  }
  delete a.map;
  delete a.geo.points;
  writeFileSync(`${SEED}/${f}`, JSON.stringify(a, null, 2) + "\n");
  n++;
}
console.log(`Converted ${n} activities.`);
