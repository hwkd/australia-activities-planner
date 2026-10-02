// Static check for A-Calendar-Desktop: tag balance inside <x-dc>, and every {{hole}} resolves in every state.
const fs = require("fs");
const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const body = src.slice(src.indexOf("<x-dc>") + 6, src.indexOf("</x-dc>"));
const js = src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
global.DCLogic = class { constructor(p) { this.props = p || {}; } setState(o) { Object.assign(this.state, o); } };
const C = new Function(js + ";return Component;")();

// ---- 1. Tag balance ----
const VOID = new Set(["link", "meta", "br", "img", "input", "hr", "source"]);
const noStyle = body.replace(/<style>[\s\S]*?<\/style>/, "<style></style>").replace(/<!--[\s\S]*?-->/g, "");
const stack = []; let balErr = [];
for (const m of noStyle.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
  const [, close, tag, , self] = m; const t = tag.toLowerCase();
  if (VOID.has(t) || self) continue;
  if (!close) stack.push(t);
  else { const top = stack.pop(); if (top !== t) { balErr.push("expected </" + top + "> got </" + t + "> at " + noStyle.slice(0, m.index).split("\n").length); break; } }
}
if (stack.length) balErr.push("unclosed: " + stack.join(","));
console.log("tag balance:", balErr.length ? balErr : "OK");

// ---- 2. Collect holes with their loop scopes ----
const holes = []; const scopes = []; const nestWarn = [];
for (const m of noStyle.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)>|([^<]+)/g)) {
  if (m[4] !== undefined) { for (const h of m[4].matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) holes.push({ h: h[1], sc: scopes.slice(), attr: "text" }); continue; }
  const [, close, tag, attrs] = m;
  if ((tag === "sc-for" || tag === "sc-if") && close) { scopes.pop(); continue; }
  for (const a of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) for (const h of a[2].matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    if (tag === "sc-for" && a[1] === "list") continue;
    holes.push({ h: h[1], sc: scopes.slice(), attr: a[1], tag });
  }
  if (tag === "sc-for" && !close) {
    const list = attrs.match(/list="\{\{([^}]+)\}\}"/)[1], as = attrs.match(/as="([^"]+)"/)[1];
    holes.push({ h: list, sc: scopes.slice(), attr: "list" });
    scopes.push({ list, as });
  }
  if (tag === "sc-if" && !close) scopes.push({ cond: attrs.match(/value="\{\{([^}]+)\}\}"/)[1] });
}
// loop holes may only use the innermost loop var or top-level names
for (const x of holes) {
  const head = x.h.split(".")[0], vars = x.sc.filter((s) => s.as).map((s) => s.as);
  if (vars.includes(head) && head !== vars[vars.length - 1]) nestWarn.push(x.h + " (outer loop var inside inner loop)");
}
console.log("holes:", holes.length, "outer-scope refs:", nestWarn.length ? nestWarn : "none");

const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const problems = new Set();
const evalAll = (vals, label) => {
  for (const x of holes) {
    if (/^(true|false|\d+)$/.test(x.h)) continue;
    const walk = (ctx, i) => {
      if (i === x.sc.length) {
        const head = x.h.split(".")[0];
        const v = head in ctx ? get(ctx, x.h) : get(vals, x.h);
        const bad = v === undefined || v === null || (typeof v === "number" && isNaN(v)) || (typeof v === "string" && /undefined|NaN|\[object/.test(v));
        if (bad) problems.add(label + ": " + x.h + " = " + v);
        else if (x.attr === "list" && !Array.isArray(v)) problems.add(label + ": list " + x.h + " not array");
        else if (/^on[A-Z]/.test(x.attr) && typeof v !== "function") problems.add(label + ": " + x.h + " handler is " + typeof v);
        else if ((x.attr === "disabled" || (x.tag === "sc-if" && x.attr === "value")) && typeof v !== "boolean") problems.add(label + ": " + x.h + " (" + x.attr + ") is " + typeof v);
        else if (x.attr !== "list" && !/^on[A-Z]/.test(x.attr) && !(x.tag === "sc-if") && x.attr !== "disabled" && typeof v === "object") problems.add(label + ": " + x.h + " is object");
        else if (typeof v === "function" && !/^on[A-Z]/.test(x.attr)) problems.add(label + ": " + x.h + " is function in " + x.attr);
        return;
      }
      const s = x.sc[i];
      if (s.cond) { const ch = s.cond.split(".")[0]; const cv = ch in ctx ? get(ctx, s.cond) : get(vals, s.cond); if (cv) walk(ctx, i + 1); return; }
      const head = s.list.split(".")[0];
      const list = head in ctx ? get(ctx, s.list) : get(vals, s.list);
      if (!Array.isArray(list)) { problems.add(label + ": scope list " + s.list + " not array"); return; }
      list.forEach((it) => walk(Object.assign({}, ctx, { [s.as]: it }), i + 1));
    };
    walk({}, 0);
  }
};

// ---- 3. States ----
let n = 0;
const run = (props, label, fn) => { const c = new C(props); if (fn) fn(c); evalAll(c.renderVals(), label); n++; return c; };
for (const sheet of ["none", "add"]) run({ activity: "manly", sheet }, "init-" + sheet);
// every month, every day picked, with each page weather
const c = new C({});
for (const m of ["2026-09", "2026-10", "2026-11", "2026-12"]) {
  c.setState({ month: m });
  for (const w of c.renderVals().weeks) for (const cell of w.cells) {
    cell.pick(); let v = c.renderVals(); evalAll(v, "pick " + cell.date); n++;
    c.setState({ month: m });
  }
  for (const k of ["sun", "cloud", "rain", "hot"]) { c.setState({ selected: m + "-15", forecast: Object.assign({}, c.state.forecast, { [m + "-15"]: k }) }); evalAll(c.renderVals(), m + " sky " + k); n++; }
}
// forecasts on every planned day in each weather, plus Plan B swap / shifts
for (const k of ["sun", "cloud", "rain", "hot"]) {
  const d = new C({}); const fc = {}; Object.keys(d.state.plan).forEach((x) => (fc[x] = k));
  d.setState({ forecast: fc });
  for (const day of Object.keys(d.state.plan)) {
    d.setState({ selected: day, month: day.slice(0, 7) }); let v = d.renderVals(); evalAll(v, k + " " + day); n++;
    v.day.skies.forEach((s) => { s.pick(); evalAll(d.renderVals(), "sky set " + day); n++; });
    d.setState({ forecast: fc });
    v = d.renderVals();
    for (const it of v.day.items) { if (it.hasBackup) { it.backup.swap(); evalAll(d.renderVals(), "swap " + day); n++; } }
    v = d.renderVals(); if (v.day.items[0]) { v.day.items[0].earlier(); v.day.items[0].later(); evalAll(d.renderVals(), "shift " + day); n++; }
  }
}
// export: each scope x target x reminder x directions, done states
const e = new C({});
e.renderVals().day.items[0].toCalendar();
for (const sc of ["item", "day", "all"]) for (const t of ["apple", "google", "outlook"]) for (const r of ["none", "30m", "2h", "1d"]) for (const dir of [true, false]) for (const done of [false, true]) {
  e.setState({ exp: { scope: sc, target: t, remind: r, directions: dir, done } }); evalAll(e.renderVals(), "exp " + [sc, t, r, dir, done].join("/")); n++;
}
const ev = e.renderVals(); ev.exp.toggleDirections(); ev.exp.download(); evalAll(e.renderVals(), "exp handlers"); e.renderVals().exp.close(); evalAll(e.renderVals(), "exp closed"); n++;
// export of an empty day
const em = new C({}); em.setState({ selected: "2026-10-02" }); em.renderVals().day.toCalendar(); evalAll(em.renderVals(), "exp empty day"); n++;
for (const t of ["apple", "google"]) { em.setState({ exp: Object.assign({}, em.state.exp, { target: t }) }); evalAll(em.renderVals(), "exp empty " + t); n++; }
// add sheet with several activities, every date and slot, confirm + done + to calendar
for (const id of ["manly", "carriageworks", "opera-tour", "three-sisters", "chinatown", "bondi-coogee"]) {
  const a = new C({ activity: id, sheet: "add" });
  let v = a.renderVals(); evalAll(v, "add " + id); n++;
  for (const q of v.add.quick) { q.pick(); evalAll(a.renderVals(), "add quick " + id + q.date); n++; }
  for (const w of a.renderVals().add.weeks) for (const cell of w.cells) { if (!cell.disabled) { cell.pick(); evalAll(a.renderVals(), "add date " + id + cell.date); n++; } }
  for (const s of a.renderVals().add.slots) { s.pick(); evalAll(a.renderVals(), "add slot " + id + s.key); n++; }
  a.setState({ add: Object.assign({}, a.state.add, { date: "2026-10-03" }) }); a.renderVals().add.confirm(); v = a.renderVals(); evalAll(v, "add done " + id); n++;
  if (v.add.done) { v.add.toCalendar(); evalAll(a.renderVals(), "add->exp " + id); n++; }
  a.setState({ sheet: "add", add: Object.assign({}, a.state.add, { date: "2026-10-10", done: false }) }); a.renderVals().add.confirm(); evalAll(a.renderVals(), "add sat10 " + id); a.renderVals().add.close(); evalAll(a.renderVals(), "add closed " + id); n++;
}
// all plans removed
const r = new C({}); for (const d of Object.keys(r.state.plan)) { r.setState({ selected: d }); let v = r.renderVals(); while (v.day.items.length) { v.day.items[0].remove(); v = r.renderVals(); } }
evalAll(r.renderVals(), "all removed"); n++;
console.log("states:", n, "problems:", problems.size, [...problems].slice(0, 12));
