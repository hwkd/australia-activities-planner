// Static check for A-AddToDay-Mobile: every template hole resolves in many engine states.
const fs = require("fs");
const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const tpl = src.split("<x-dc>")[1].split("</x-dc>")[0];
const js = src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
global.DCLogic = class { constructor(p) { this.props = p || {}; } setState(o) { Object.assign(this.state, typeof o === "function" ? o(this.state) : o); } };
const C = new Function(js + ";return Component;")();

// Collect holes with their sc-for scope chain.
const holes = []; const stack = [];
const re = /<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="([^"]+)"|<\/sc-for>|\{\{\s*([^}]+?)\s*\}\}|on[A-Z]\w*="\{\{\s*([^}]+?)\s*\}\}"/g;
let m;
while ((m = re.exec(tpl))) {
  if (m[1]) { holes.push({ expr: m[1], scope: stack.slice(), list: true }); stack.push({ alias: m[2], expr: m[1] }); }
  else if (m[0] === "</sc-for>") stack.pop();
  else if (m[4]) holes.push({ expr: m[4], scope: stack.slice(), fn: true });
  else if (m[3]) holes.push({ expr: m[3], scope: stack.slice() });
}
if (stack.length) console.log("UNBALANCED sc-for");
const get = (expr, root, b) => {
  if (/^(true|false|\d+)$/.test(expr)) return true;
  const seg = expr.split("."); let cur = seg[0] in b ? b[seg[0]] : root[seg[0]];
  for (let i = 1; i < seg.length; i++) { if (cur == null) return undefined; cur = cur[seg[i]]; }
  return cur;
};
const bad = new Set(); let checks = 0;
function check(vals, label) {
  for (const h of holes) {
    let binds = [{}];
    for (const s of h.scope) {
      const nb = [];
      for (const b of binds) { const l = get(s.expr, vals, b); if (!Array.isArray(l)) { bad.add(label + ": list " + s.expr); continue; } l.forEach((x) => nb.push(Object.assign({}, b, { [s.alias]: x }))); }
      binds = nb;
    }
    for (const b of binds) {
      const v = get(h.expr, vals, b); checks++;
      if (h.list) { if (!Array.isArray(v)) bad.add(h.expr + " not array @" + label); continue; }
      if (h.fn) { if (typeof v !== "function") bad.add(h.expr + " not fn @" + label); continue; }
      if (v === undefined || v === null || (typeof v === "number" && isNaN(v)) || (typeof v === "string" && /undefined|NaN|\[object/.test(v)) || (typeof v === "object" && !Array.isArray(v)))
        bad.add(h.expr + " = " + String(v) + " @" + label);
    }
  }
}
const ids = JSON.parse(src.match(/data-props='([^']*)'/)[1]).activity.options;
let n = 0; const seen = {};
const run = (c, label) => { const v = c.renderVals(); check(v, label); n++; seen[v.add.open + "/" + v.add.done + "/" + v.exp.open + "/" + v.exp.done] = 1; return v; };

for (const sheet of ["add", "none"]) for (const id of ids) {
  const c = new C({ activity: id, sheet: sheet });
  let v = run(c, id + " init " + sheet);
  if (sheet === "none") { v.add.openSheet(); v = run(c, id + " open"); }
  // every quick day, every slot
  for (let i = 0; i < v.add.quick.length; i++) { c.renderVals().add.quick[i].pick(); run(c, id + " quick" + i); }
  for (let i = 0; i < 5; i++) { c.renderVals().add.slots[i].pick(); run(c, id + " slot" + i); }
  // every month, every enabled date in the mini month
  for (const mth of ["2026-09", "2026-10", "2026-11", "2026-12"]) {
    c.setState({ month: mth }); const vv = run(c, id + " " + mth);
    vv.add.weeks.forEach((w, wi) => w.cells.forEach((cell, ci) => { if (cell.enabled) { c.renderVals().add.weeks[wi].cells[ci].pick(); run(c, id + " pick " + cell.date); } }));
  }
  c.renderVals().prevMonth(); c.renderVals().nextMonth(); c.renderVals().nextMonth(); run(c, id + " nav");
  // a day with a forecast in each sky, a holiday, a clash day, then confirm
  for (const d of ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-07", "2026-10-10"]) {
    c.setState({ add: Object.assign({}, c.state.add, { date: d, done: false }) }); v = run(c, id + " date " + d);
  }
  for (const k of ["sun", "cloud", "rain", "hot"]) { c.setState({ forecast: Object.assign({}, c.state.forecast, { "2026-10-10": k }) }); run(c, id + " sky " + k); }
  v = c.renderVals(); const could = v.add.canAdd; v.add.confirm(); v = run(c, id + " confirmed");
  if (could && !v.add.done) bad.add("confirm did not reach done: " + id);
  if (v.add.done) {
    v.add.toCalendar(); v = run(c, id + " export");
    for (let s = 0; s < v.exp.scopes.length; s++) for (let t = 0; t < 3; t++) for (let r = 0; r < 4; r++) {
      let w = c.renderVals(); w.exp.scopes[s].pick(); w = c.renderVals(); w.exp.targets[t].pick(); w = c.renderVals(); w.exp.reminders[r].pick();
      run(c, id + " exp" + s + t + r); c.renderVals().exp.toggleDirections(); run(c, id + " exp dir" + s + t + r); c.renderVals().exp.toggleDirections();
      c.renderVals().exp.download(); run(c, id + " exp done" + s + t + r);
    }
    c.renderVals().exp.close(); run(c, id + " exp closed");
  }
  c.renderVals().add.openSheet(); run(c, id + " reopen"); c.renderVals().add.close(); run(c, id + " closed");
}
// Every day picked on the main calendar for every month (theme still resolves)
const c = new C({ sheet: "add" });
for (const mth of ["2026-09", "2026-10", "2026-11", "2026-12"]) { c.setState({ month: mth }); const vv = c.renderVals(); vv.weeks.forEach((w) => w.cells.forEach((cell) => { cell.pick(); run(c, "day " + cell.date); })); }
// Empty plan: export with no events
const e = new C({ sheet: "none" }); e.setState({ plan: {} }); e.renderVals().day.toCalendar(); run(e, "export empty"); e.renderVals().exp.targets[1].pick(); run(e, "export empty google");
// Single item for oneGoogle
const g = new C({ sheet: "none" }); g.renderVals().day.items[0].toCalendar(); let gv = g.renderVals(); gv.exp.targets[1].pick(); gv = run(g, "one google"); console.log("oneGoogle:", gv.exp.oneGoogle, "manyGoogle (day scope):", (gv.exp.scopes[1].pick(), g.renderVals().exp.manyGoogle));

console.log("holes:", holes.length, "states:", n, "checks:", checks, "state combos (addOpen/addDone/expOpen/expDone):", Object.keys(seen).join(" "));
console.log("problems:", bad.size); [...bad].slice(0, 30).forEach((x) => console.log("  ", x));
const sample = new C({ activity: "carriageworks", sheet: "add" }).renderVals();
console.log("carriageworks quick:", sample.add.quick.map((q) => q.top + " " + q.num + (q.blocked ? " (closed)" : "") + (q.isHoliday ? " (hol)" : "")).join(", "), "|", sample.add.confirmLabel, "|", sample.add.quickHolidayNote);
