const all = require("./content-all.json");
let errs = [];
const E = (id, m) => errs.push(id + ": " + m);
const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
for (const a of all) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.suggestedStart || "")) E(a.id, "suggestedStart missing or not HH:MM");
  const ids = new Set(a.map.lines.map(l => l.id));
  if (ids.size !== a.map.lines.length) E(a.id, "dup line ids");
  for (const o of ["central","quay","parra"]) {
    const r = a.routes.pt[o]; if (!r) { E(a.id, "no pt " + o); continue; }
    if (!r.legs.length) E(a.id, "empty legs " + o);
    (r.lines||[]).forEach(l => ids.has(l) || E(a.id, "pt " + o + " bad line " + l));
    if (!(r.fare[0] <= r.fare[1])) E(a.id, "fare order");
  }
  (a.routes.pt.back.lines||[]).forEach(l => ids.has(l) || E(a.id, "back bad line " + l));
  for (const m of ["drive","ride"]) {
    const r = a.routes[m];
    if (!r) { if (!(a.routes.unavailable && a.routes.unavailable[m])) E(a.id, m + " null without reason"); continue; }
    (r.lines||[]).forEach(l => ids.has(l) || E(a.id, m + " bad line " + l));
    for (const o of ["central","quay","parra"]) if (!r.total[o]) E(a.id, m + " total " + o);
  }
  const chk = (x, y, what) => { if (x < 0 || x > 400 || y < 0 || y > 300) E(a.id, what + " out of box " + x + "," + y); };
  a.map.pois.forEach((p, i) => { chk(p.x, p.y, "poi"); if (p.n !== i + 1) E(a.id, "poi numbering"); });
  a.map.stops.forEach(s => chk(s.x, s.y, "stop")); a.map.fac.forEach(s => chk(s.x, s.y, "fac"));
  a.map.labels.forEach(s => chk(s.x, s.y, "label")); a.map.lines.forEach(l => chk(l.lx, l.ly, "line label " + l.id));
  [a.map.trail, ...a.map.lines.map(l => l.d)].forEach(d => { const n = nums(d); for (let i = 0; i + 1 < n.length; i += 2) chk(n[i], n[i+1], "path"); });
  if (!a.map.pois.some(p => p.type === "start")) E(a.id, "no start poi");
  a.pairings.forEach(p => (p.activityId && all.some(x => x.id === p.activityId)) || E(a.id, "pairing points nowhere: " + p.name));
  // cost formula, 2 adults 1 kid
  const people = 3, cars = 1;
  const ent = a.costs.entry.map((v, i) => v * 2 + (a.costs.entryChild ? a.costs.entryChild[i] : v));
  const pt = a.routes.pt.central.fare.map(v => v * 2.5 * 2);
  const ex = a.costs.extras.filter(e => e.on).reduce((s, e) => [s[0] + e.per[0] * people, s[1] + e.per[1] * people], [0, 0]);
  console.log(a.id.padEnd(15), a.routes.pt.central.total.padEnd(16), a.routes.pt.quay.total.padEnd(16), a.routes.pt.parra.total.padEnd(16), "day PT 2A+1K: $" + (ent[0] + pt[0] + ex[0]) + "–" + (ent[1] + pt[1] + ex[1]));
}
console.log(errs.length ? "ERRORS\n" + errs.join("\n") : "OK, no errors");
