// Transport for NSW Trip Planner client (tracker M9a.1). Needs TFNSW_API_KEY (Open Data Hub, free).
// Request and response shapes follow the Trip Planner API docs (rapidJSON); verify against the first
// live run before trusting the job (not yet run: no key in this project).
const BASE = "https://api.transport.nsw.gov.au/v1/tp";

/** Origins as Trip Planner stop IDs. Verify these on the first run (stop finder). */
export const ORIGIN_STOPS = {
  central: { id: "200060", label: "Central Station" },
  quay: { id: "200020", label: "Circular Quay" },
  parra: { id: "215020", label: "Parramatta" },
};

/** Trip Planner product classes → our leg modes. */
const MODE_BY_CLASS = { 1: "train", 2: "metro", 4: "light-rail", 5: "bus", 7: "bus", 9: "ferry", 11: "bus", 99: "walk", 100: "walk" };

/**
 * The line name riders see, or undefined. Private services (product "Private ferry and fast ferry
 * services", e.g. the Cronulla–Bundeena ferry) carry an internal code like "BUNC" that isn't on any
 * sign or timetable, so they get no line name; the written route names them in words instead.
 */
export function publicLine(transportation) {
  if (/^Private/i.test(transportation?.product?.name ?? "")) return undefined;
  return transportation?.disassembledName ?? transportation?.number;
}

/** The next Saturday at 10:30 (spec §4.3: routes are generated for a Saturday late-morning departure). */
export function nextSaturdayLateMorning(now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7));
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  return { itdDate: ymd, itdTime: "1030" };
}

export async function planTrip(originStopId, dest, when, key = process.env.TFNSW_API_KEY) {
  if (!key) throw new Error("TFNSW_API_KEY is not set: the transport job can't call the Trip Planner.");
  const q = new URLSearchParams({
    outputFormat: "rapidJSON",
    coordOutputFormat: "EPSG:4326",
    depArrMacro: "dep",
    itdDate: when.itdDate,
    itdTime: when.itdTime,
    type_origin: "any",
    name_origin: originStopId,
    type_destination: "coord",
    name_destination: `${dest.lng}:${dest.lat}:EPSG:4326`,
    calcNumberOfTrips: "3",
    TfNSWTR: "true",
    version: "10.2.1.42",
  });
  const res = await fetch(`${BASE}/trip?${q}`, { headers: { Authorization: `apikey ${key}` } });
  if (!res.ok) throw new Error(`Trip Planner ${res.status} ${res.statusText}`);
  return res.json();
}

/** The first journey, normalised to the drift check's shape. */
export function normaliseJourney(json) {
  const j = json?.journeys?.[0];
  if (!j) return null;
  const legs = j.legs.map((l) => {
    const cls = l.transportation?.product?.class;
    const mode = MODE_BY_CLASS[cls] ?? "walk";
    return {
      mode,
      line: mode === "walk" ? undefined : publicLine(l.transportation),
      mins: Math.round((l.duration ?? 0) / 60),
      from: l.origin?.name,
      to: l.destination?.name,
    };
  });
  return { legs, totalMins: legs.reduce((t, l) => t + l.mins, 0) };
}
