// Builds each seed activity's real-map data (`geo`, spec §4.3) from open sources, for an editor to
// review in the admin: the numbered places (OpenStreetMap Nominatim; places it can't find are placed
// by fitting the old schematic layout to the ones it did), the walking line between nearby places
// (routing.openstreetmap.de), toilets and cafés within 100 m (one Overpass query), and the real trip
// from Central plus the way back (Transport for NSW Trip Planner, choosing the journey whose lines
// match the written route). Everything is cached in .map-data/geo-cache.json; a report of what was
// found, estimated or mismatched goes to .map-data/geo-report.md.
//   node --env-file=.dev.vars scripts/map/build-geo.mjs [--write] [--date=YYYYMMDD [--time=HHMM]] [id …]
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { nextSaturdayLateMorning, ORIGIN_STOPS, publicLine } from "../transport/tfnsw.mjs";

const UA = { "User-Agent": "australia-activities-planner (editor data tool)" };
const SEED = "db/seed/activities";
const CACHE = ".map-data/geo-cache.json";
mkdirSync(".map-data", { recursive: true });
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const save = () => writeFileSync(CACHE, JSON.stringify(cache));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(n * 1e5) / 1e5;
const K = 111320,
  CX = Math.cos((33.9 * Math.PI) / 180);
const metres = (a, b) => Math.hypot((a[0] - b[0]) * K * CX, (a[1] - b[1]) * K);

async function cached(key, f) {
  if (!(key in cache)) {
    cache[key] = await f();
    save();
  }
  return cache[key];
}

// ---- Places ----
async function geocode(q, box) {
  return cached(`nom:${q}:${box.join(",")}`, async () => {
    await sleep(1100); // Nominatim: at most one request a second
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q,
        format: "jsonv2",
        limit: "1",
        countrycodes: "au",
        viewbox: box.join(","),
        bounded: "1",
      });
    const r = await fetch(url, { headers: UA });
    const j = r.ok ? await r.json() : [];
    return j[0] ? [Number(j[0].lon), Number(j[0].lat)] : null;
  });
}

/** Least-squares affine map from schematic (x, y) to (lng, lat), from the places that were found. */
function affine(pairs) {
  // Solve [x y 1] · [a b c]ᵀ = lng and the same for lat (normal equations, 3×3).
  const solve = (t) => {
    const M = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      v = [0, 0, 0];
    for (const [x, y, out] of pairs.map(([s, g]) => [s[0], s[1], g[t]])) {
      const r = [x, y, 1];
      for (let i = 0; i < 3; i++) {
        v[i] += r[i] * out;
        for (let j = 0; j < 3; j++) M[i][j] += r[i] * r[j];
      }
    }
    // Gaussian elimination
    for (let i = 0; i < 3; i++) {
      const p = M[i][i] || 1e-12;
      for (let j = i + 1; j < 3; j++) {
        const f = M[j][i] / p;
        for (let k = i; k < 3; k++) M[j][k] -= f * M[i][k];
        v[j] -= f * v[i];
      }
    }
    const s = [0, 0, 0];
    for (let i = 2; i >= 0; i--)
      s[i] = (v[i] - M[i].slice(i + 1).reduce((a, m, k) => a + m * s[i + 1 + k], 0)) / (M[i][i] || 1e-12);
    return s;
  };
  const [a, b] = [solve(0), solve(1)];
  return ([x, y]) => [a[0] * x + a[1] * y + a[2], b[0] * x + b[1] * y + b[2]];
}

// ---- Walking line ----
async function footRoute(a, b) {
  return cached(`foot:${a.join(",")};${b.join(",")}`, async () => {
    await sleep(600);
    const r = await fetch(
      `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a.join(",")};${b.join(",")}?overview=full&geometries=geojson`,
      { headers: UA },
    );
    const j = r.ok ? await r.json() : null;
    return j?.routes?.[0]?.geometry?.coordinates ?? null;
  });
}
// The router snaps each end to the nearest path, which can be across the water from an island or a
// wharf (a lookout off the track, like Grotto Point, is fine), and a route far longer than the
// straight line goes round a bay or a fence: neither is the walk between the two places.
const length = (l) => l.slice(1).reduce((s, p, i) => s + metres(l[i], p), 0);
const walkable = (seg, a, b) =>
  seg?.length > 1 &&
  metres(seg[0], a) < 500 &&
  metres(seg[seg.length - 1], b) < 500 &&
  length(seg) < 2.5 * metres(a, b) + 300;

/** Douglas–Peucker, ~3 m tolerance, so lines stay small in the activity record. */
function simplify(pts, tol = 0.00003) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0,
    max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
    const d = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
    if (d > max) [max, idx] = [d, i];
  }
  return max > tol ? [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)] : [a, b];
}

// ---- Trips (Transport for NSW) ----
const MODE = { 1: "train", 2: "metro", 4: "light-rail", 5: "bus", 7: "bus", 9: "ferry", 11: "bus" };
const legsOf = (j) =>
  j.legs.map((l) => {
    const mode = MODE[l.transportation?.product?.class] ?? "walk";
    const line = mode === "walk" ? undefined : publicLine(l.transportation);
    return {
      mode,
      ...(line ? { line } : {}),
      coords: simplify(
        (l.coords ?? []).map(([lat, lng]) => [lng, lat]),
        0.0001,
      ).map(([x, y]) => [round(x), round(y)]),
    };
  });
const lineNames = (legs) => legs.filter((l) => l.line).map((l) => String(l.line).toUpperCase());

async function trip(from, to, want) {
  const date = process.argv.find((x) => x.startsWith("--date="))?.slice(7);
  const time = process.argv.find((x) => x.startsWith("--time="))?.slice(7);
  const key = `tp:${typeof from === "string" ? from : from.join(",")}>${typeof to === "string" ? to : to.join(",")}${date ? `@${date}` : ""}${time ? `T${time}` : ""}`;
  const json = await cached(key, async () => {
    await sleep(300);
    // The coming Saturday (the Trip Planner only plans ahead), or --date=YYYYMMDD to skip a weekend of
    // trackwork, and --time=HHMM (with --date) for a line whose direct trains run every second hour.
    const date = process.argv.find((x) => x.startsWith("--date="))?.slice(7);
    const time = process.argv.find((x) => x.startsWith("--time="))?.slice(7) ?? "1030";
    const when = date ? { itdDate: date, itdTime: time } : nextSaturdayLateMorning();
    const q = new URLSearchParams({
      outputFormat: "rapidJSON",
      coordOutputFormat: "EPSG:4326",
      depArrMacro: "dep",
      itdDate: when.itdDate,
      itdTime: when.itdTime,
      type_origin: typeof from === "string" ? "any" : "coord",
      name_origin: typeof from === "string" ? from : `${from[0]}:${from[1]}:EPSG:4326`,
      type_destination: typeof to === "string" ? "any" : "coord",
      name_destination: typeof to === "string" ? to : `${to[0]}:${to[1]}:EPSG:4326`,
      calcNumberOfTrips: "4",
      TfNSWTR: "true",
      version: "10.2.1.42",
    });
    const r = await fetch(`https://api.transport.nsw.gov.au/v1/tp/trip?${q}`, {
      headers: { Authorization: `apikey ${process.env.TFNSW_API_KEY}` },
    });
    return r.ok ? await r.json() : null;
  });
  // A failed or empty answer isn't cached, so the next run asks again.
  if (!json?.journeys?.length) {
    delete cache[key];
    save(); // cached() already wrote it to disk
  }
  const journeys = (json?.journeys ?? []).map(legsOf).filter((ls) => ls.some((l) => l.coords.length > 1));
  if (!journeys.length) return null;
  // The journey whose lines best match the written route.
  const score = (ls) => {
    const got = lineNames(ls);
    // Extra rides count against a journey too: "SCO › SCO" (a change at Thirroul) isn't the written
    // direct "SCO".
    return want.filter((w) => got.includes(w)).length * 2 - got.filter((g) => !want.includes(g)).length - Math.max(0, got.length - want.length);
  };
  const best = journeys.reduce((a, b) => (score(b) > score(a) ? b : a));
  return { legs: best, matched: score(best) === want.length * 2 && lineNames(best).length === want.length };
}

// ---- Facilities (one Overpass query for the whole region) ----
async function amenities() {
  // A few tiles, each retried, so one busy moment at the public Overpass server doesn't sink the run.
  const tiles = [
    [-34.25, 150.15, -33.875, 150.775],
    [-34.25, 150.775, -33.875, 151.4],
    [-33.875, 150.15, -33.5, 150.775],
    [-33.875, 150.775, -33.5, 151.4],
    // The day trips by train beyond greater Sydney: Newcastle, and the Illawarra coast to Kiama.
    [-33.0, 151.65, -32.85, 151.85],
    [-34.75, 150.75, -34.25, 151.1],
  ];
  const out = [];
  for (const t of tiles) {
    const got = await cached(`overpass:amenities:${t.join(",")}`, async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const q = `[out:json][timeout:120];node["amenity"~"^(toilets|cafe)$"](${t.join(",")});out;`;
        const r = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: q }),
        });
        const text = await r.text();
        if (r.ok && text.trimStart().startsWith("{"))
          return JSON.parse(text).elements.map((e) => [
            e.tags.amenity === "toilets" ? "toilet" : "cafe",
            round(e.lon),
            round(e.lat),
          ]);
        console.warn(`Overpass busy (${r.status}); retrying in ${15 * (attempt + 1)} s`);
        await sleep(15000 * (attempt + 1));
      }
      return null; // not cached as data: the next run tries again
    });
    if (got) out.push(...got);
    else {
      delete cache[`overpass:amenities:${t.join(",")}`];
      save();
    }
  }
  return out;
}

const distToLine = (p, line) => {
  let d = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i],
      b = line[i + 1];
    const A = [(p[0] - a[0]) * K * CX, (p[1] - a[1]) * K],
      B = [(b[0] - a[0]) * K * CX, (b[1] - a[1]) * K];
    const L = B[0] ** 2 + B[1] ** 2,
      t = L ? Math.max(0, Math.min(1, (A[0] * B[0] + A[1] * B[1]) / L)) : 0;
    d = Math.min(d, Math.hypot(A[0] - t * B[0], A[1] - t * B[1]));
  }
  return d;
};

// ---- Main ----
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = readdirSync(SEED).filter(
  (f) => f.endsWith(".json") && (!only.length || only.includes(f.replace(".json", ""))),
);
const all = await amenities();
const report = [
  "# Real-map data report",
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} by scripts/map/build-geo.mjs. Positions marked *estimated* were placed by fitting the old schematic layout and need an editor to place them; every activity's \`geo.checked\` is null until an editor reviews it.`,
  "",
];
for (const f of files) {
  const a = JSON.parse(readFileSync(`${SEED}/${f}`, "utf8"));
  const pois = a.map?.pois ?? a.geo?.places ?? [];
  const dest = [a.routes.dest.lng, a.routes.dest.lat],
    loc = [a.location.lng, a.location.lat];
  const box = [
    Math.min(dest[0], loc[0]) - 0.15,
    Math.max(dest[1], loc[1]) + 0.15,
    Math.max(dest[0], loc[0]) + 0.15,
    Math.min(dest[1], loc[1]) - 0.15,
  ];
  const found = [];
  // Positions already placed (in `geo.places`, or the Bondi to Coogee prototype's `geo.points`) are kept
  // as they are: a far start, like Circular Quay for a ferry trip, is right, not an outlier.
  const placed = pois.map((p) => p.lng !== undefined || (a.geo?.points ?? []).some((q) => q.n === p.n));
  const known = new Map((a.geo?.points ?? []).map((p) => [p.n, [p.lng, p.lat]]));
  // A kept position that isn't where the geocoder puts the place was estimated or placed by hand: the
  // report lists it for an editor to check.
  const toCheck = [];
  for (const p of pois) {
    const gc = known.has(p.n)
      ? null
      : ((await geocode(`${p.name}, ${a.area}, NSW`, box)) ?? (await geocode(`${p.name}, NSW`, box)));
    const g = p.lng !== undefined ? [p.lng, p.lat] : (known.get(p.n) ?? gc);
    if (p.lng !== undefined && !known.has(p.n) && !(gc && metres(gc, g) < 25)) toCheck.push(p.n);
    found.push(g);
  }
  // Estimate the rest from the schematic layout (x, y) when there are enough found places. A found
  // place far (over 1.5 km) from where the others' layout puts it is a wrong match: drop it and refit.
  // First, any found place much farther from the group's median than the others is a wrong match.
  {
    const idx = pois.map((_, i) => i).filter((i) => found[i]);
    if (idx.length >= 3) {
      const med = [0, 1].map((k) => idx.map((i) => found[i][k]).sort((x, y) => x - y)[Math.floor(idx.length / 2)]);
      const ds = idx.map((i) => metres(found[i], med));
      const typical = [...ds].sort((x, y) => x - y)[Math.floor(ds.length / 2)];
      idx.forEach((i, k) => {
        if (ds[k] > 3 * typical + 1000 && !placed[i]) found[i] = null;
      });
    }
  }
  let fit = null;
  for (;;) {
    const idx = pois.map((_, i) => i).filter((i) => found[i] && pois[i].x !== undefined);
    if (idx.length < 3) break;
    fit = affine(idx.map((i) => [[pois[i].x, pois[i].y], found[i]]));
    if (idx.length < 4) break;
    const worst = idx
      .filter((i) => !placed[i])
      .map((i) => [i, metres(fit([pois[i].x, pois[i].y]), found[i])])
      .sort((x, y) => y[1] - x[1])[0];
    if (!worst || worst[1] < 1500) break;
    found[worst[0]] = null;
  }
  const estimated = [];
  const places = pois.map((p, i) => {
    let g = found[i];
    if (!g) {
      g = fit && p.x !== undefined ? fit([p.x, p.y]) : p.type === "start" ? dest : loc;
      // A fit from a few nearly-in-line places can throw an estimate far away: keep it near the others.
      const near = found.filter(Boolean).sort((x, y) => metres(x, g) - metres(y, g))[0];
      if (near && metres(near, g) > 3000) g = near;
      estimated.push(p.n);
    }
    return { n: p.n, name: p.name, type: p.type, note: p.note, lng: round(g[0]), lat: round(g[1]) };
  });
  // Trips.
  const pt = a.routes.pt.central ?? a.routes.pt;
  const want = (pt.legs ?? []).filter((l) => l.line).map((l) => String(l.line).toUpperCase());
  const out = await trip(ORIGIN_STOPS.central.id, dest, want);
  // Where the written route rides on from the start (the bus from Blacktown Station, the ferry from
  // Cronulla), the walk begins where the ride ends; the trip draws the ride.
  const ride = out?.legs.filter((l) => l.mode !== "walk").at(-1);
  const writtenRide = (pt.legs ?? []).filter((l) => l.mode !== "walk" && l.mode !== "car").at(-1);
  const start = [places[0].lng, places[0].lat];
  const ridesOn =
    places[0].type === "start" &&
    ride &&
    writtenRide?.mode === ride.mode &&
    metres(ride.coords[0], start) < 300 &&
    metres(ride.coords.at(-1), start) > 1000;
  // Walking line between consecutive places that are close enough to walk (ferries and long rides break it).
  const trail = [];
  let cur = [];
  for (let i = 0; i < places.length - 1; i++) {
    const A = [places[i].lng, places[i].lat],
      B = [places[i + 1].lng, places[i + 1].lat];
    const seg = metres(A, B) < 3000 && !(i === 0 && ridesOn) ? await footRoute(A, B) : null;
    if (walkable(seg, A, B)) cur.push(...(cur.length ? seg.slice(1) : seg));
    else if (cur.length) {
      trail.push(cur);
      cur = [];
    }
  }
  if (cur.length) trail.push(cur);
  const trailLines = trail
    .map((l) => simplify(l).map(([x, y]) => [round(x), round(y)]))
    .filter((l) => l.length > 1 && length(l) > 30);
  // Toilets and cafés within 100 m of the line or the places; toilets first, at most 12.
  const near = all
    .filter(
      ([, x, y]) =>
        places.some((p) => metres([x, y], [p.lng, p.lat]) < 100) || trailLines.some((l) => distToLine([x, y], l) < 100),
    )
    .sort((p, q) => (p[0] === "toilet" ? 0 : 1) - (q[0] === "toilet" ? 0 : 1));
  const facilities = [];
  for (const [kind, lng, lat] of near)
    if (facilities.length < 12 && facilities.every((g) => g.kind !== kind || metres([g.lng, g.lat], [lng, lat]) > 60))
      facilities.push({ kind, lng, lat });
  const end = places.find((p) => p.type === "end") ?? places[places.length - 1];
  const backText = a.routes.pt.back?.text ?? "";
  // Lines named in the text: "bus 374", "buses 324 or 325", "route 21", "T4", "F2", and intercity lines
  // by name; a bare number is a time ("≈ 15 min").
  const NUM = "[A-Z]?\\d{2,3}[A-Z]?";
  const LINE_NAMES = { "south coast line": "SCO", "central coast & newcastle line": "CCN", "blue mountains line": "BMT", "southern highlands line": "SHL" };
  const backWant = [
    ...[...backText.matchAll(new RegExp(`\\b(?:bus(?:es)?|routes?) (${NUM}(?:(?:, | or | and )${NUM})*)`, "gi"))].flatMap((m) => m[1].split(/, | or | and /i)),
    ...[...backText.matchAll(/\b([TFML]\d)\b/g)].map((m) => m[1]),
    ...Object.entries(LINE_NAMES).filter(([name]) => backText.toLowerCase().includes(name)).map(([, code]) => code),
  ].map((x) => x.toUpperCase());
  // One-way activities (the old content's `back.lines`, or a way back already drawn).
  const oneWay = (a.routes.pt.back?.lines ?? []).length > 0 || !!a.geo?.back;
  const back = oneWay ? await trip([end.lng, end.lat], ORIGIN_STOPS.central.id, backWant) : null;
  a.geo = {
    places,
    ...(trailLines.length ? { trail: trailLines } : {}),
    ...(facilities.length ? { facilities } : {}),
    ...(out ? { trip: { legs: out.legs } } : {}),
    ...(back ? { back: { legs: back.legs } } : {}),
    source: "OpenStreetMap contributors (ODbL), Transport for NSW (CC BY 4.0)",
    checked: null,
  };
  report.push(
    `## ${a.name} (\`${a.id}\`)`,
    "",
    `- Places: ${places.length - estimated.length - toCheck.length} found, ${estimated.length ? `**${estimated.length} estimated** (${estimated.map((n) => `#${n}`).join(", ")})` : "none estimated"}${toCheck.length ? `, **${toCheck.length} estimated or placed by hand** (${toCheck.map((n) => `#${n}`).join(", ")})` : ""}.`,
    `- Walking line: ${trailLines.length ? `${trailLines.length} part(s)` : "none"}; toilets and cafés: ${facilities.length}.`,
    `- Trip from Central: ${out ? `${lineNames(out.legs).join(" › ") || "walk"}${out.matched ? "" : ` (**written route says ${want.join(" › ") || "walk"}**)`}` : "**not found**"}.`,
    oneWay
      ? `- Way back: ${back ? `${lineNames(back.legs).join(" › ") || "walk"}${back.matched ? "" : ` (**text mentions ${backWant.join(", ") || "no line"}**)`}` : "**not found**"}.`
      : "- Way back: not one-way.",
    "",
  );
  if (process.argv.includes("--write")) writeFileSync(`${SEED}/${f}`, JSON.stringify(a, null, 2) + "\n");
  console.log(
    `${a.id}: ${places.length} places (${estimated.length + toCheck.length} to check), trail ${trailLines.length}, fac ${facilities.length}, trip ${out ? (out.matched ? "match" : "differs") : "none"}${oneWay ? `, back ${back ? (back.matched ? "match" : "differs") : "none"}` : ""}`,
  );
}
// A run for some activities replaces just their sections of the report.
const REPORT = ".map-data/geo-report.md";
if (only.length && existsSync(REPORT)) {
  const sections = new Map();
  for (const part of readFileSync(REPORT, "utf8")
    .split(/\n(?=## )/)
    .slice(1))
    sections.set(part.match(/\(`([^`]+)`\)/)?.[1], part.trimEnd() + "\n");
  for (const part of report
    .join("\n")
    .split(/\n(?=## )/)
    .slice(1))
    sections.set(part.match(/\(`([^`]+)`\)/)?.[1], part.trimEnd() + "\n");
  writeFileSync(
    REPORT,
    [report.slice(0, 3).join("\n") + "\n", ...[...sections.keys()].sort().map((k) => sections.get(k))].join("\n"),
  );
} else writeFileSync(REPORT, report.join("\n"));
console.log("Report: .map-data/geo-report.md");
