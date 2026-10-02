// Exports golden fixtures from the prototype engines (design/prototype-logic/engines) so the
// TypeScript in src/lib can be checked against the behaviour that was exercised on the canvas.
// Run: node scripts/fixtures/export-prototype.mjs   (writes tests/fixtures/*.json)
import { readFileSync, writeFileSync } from "node:fs";

globalThis.DCLogic = class { constructor(p) { this.props = p || {}; } setState(o) { Object.assign(this.state, o); } };
const load = (f) => new Function(readFileSync(`design/prototype-logic/engines/${f}`, "utf8") + ";return Component;")();
const toSpec = { sun: "sunny", cloud: "cloudy", rain: "rainy", hot: "hot" };
const W = ["sun", "cloud", "rain", "hot"];

// ---- Ranking (spec §6.1) with an empty plan ----
const Discover = load("discover-engine.js");
const d = new Discover({});
const ranking = [];
for (const w of W) for (const who of ["any", "date", "friends", "family", "solo"]) for (const dur of ["any", "short", "half", "full"]) for (const freeOnly of [false, true]) {
  d.setState({ weather: w, who, dur, freeOnly, sat: [], sun: [] });
  const v = d.renderVals();
  ranking.push({ weather: toSpec[w], group: who, duration: dur, freeOnly, ids: v.cards.map((c) => c.id), hidden: Number(v.hiddenCount ?? 0) });
}

// ---- Plan B (spec §6.2) for a single planned item whose fit is 0 ----
const planB = [];
for (const a of d.acts) for (let wi = 0; wi < 4; wi++) {
  if (a.w[wi] !== 0) continue;
  d.setState({ sat: [a.id], sun: [], satW: W[wi], sunW: "sun" });
  const it = d.renderVals().days[0].items[0];
  const backup = it.hasBackup ? d.acts.find((x) => x.name === it.backup.name).id : null;
  planB.push({ id: a.id, weather: toSpec[W[wi]], backup });
}

// ---- Routes and cost (spec §3.2, §6.6) at the weekend cap ----
const Detail = load("detail-engine.js");
const presets = { solo: [1, 0], date: [2, 0], friends: [4, 0], family: [2, 2] };
const cost = [];
for (const id of Object.keys(new Detail({}).ACTS)) {
  const c = new Detail({ activity: id });
  for (const origin of ["central", "quay", "parra"]) for (const mode of ["pt", "drive", "ride"]) for (const [preset, [adults, kids]] of Object.entries(presets)) {
    c.setState({ origin, mode, preset, adults, kids, extras: {} });
    const v = c.renderVals();
    cost.push({
      id, origin, mode, adults, kids,
      available: v.route.available, total: v.route.total, changes: v.route.changes, costLabel: v.route.costLabel,
      lines: v.cost.lines.map((l) => ({ label: l.label, value: l.value })), sum: v.cost.total, perPerson: v.cost.perPerson
    });
  }
}

writeFileSync("tests/fixtures/ranking.json", JSON.stringify(ranking));
writeFileSync("tests/fixtures/planb.json", JSON.stringify(planB, null, 1));
writeFileSync("tests/fixtures/cost.json", JSON.stringify(cost));
console.log(`ranking ${ranking.length}, planB ${planB.length}, cost ${cost.length}`);
