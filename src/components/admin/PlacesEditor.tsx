import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { Activity } from "~/content/schema";
import { btnCls, NumberInput, Select, Text } from "./ui";

/**
 * The Places editor (spec §4.3 "Maps (D15)"): the activity's numbered places as a list, next to a real
 * map where each place is a draggable numbered pin. Selecting a row selects its pin and the other way
 * round. Numbers always run 1..n in list order. The longitude and latitude boxes do everything the map
 * does, so the editor works without WebGL or tiles.
 */
type Geo = Activity["geo"];
type Place = Geo["places"][number];

const PlacesMap = lazy(() => import("./PlacesMap"));

const TYPES = [
  { value: "start", label: "Start" },
  { value: "end", label: "Finish" },
  { value: "beach", label: "Beach" },
  { value: "pool", label: "Pool" },
  { value: "lookout", label: "Lookout" },
  { value: "food", label: "Food" },
  { value: "stop", label: "Stop" },
  { value: "paid", label: "Paid attraction" },
] as const satisfies readonly { value: Place["type"]; label: string }[];

const renumber = (ps: Place[]) => ps.map((p, i) => ({ ...p, n: i + 1 }));

/** Keeps the rest of the editor working if the map's code can't load. */
class MapFailed extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">The map couldn't load. Use the longitude and latitude boxes instead.</p> : this.props.children;
  }
}

export default function PlacesEditor({ geo, onChange, err }: { geo: Geo; onChange: (g: Geo) => void; err: (path: string) => string[] | undefined }) {
  const [selected, setSelected] = useState<number | null>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const places = geo.places;
  const sel = selected !== null && selected < places.length ? selected : null;

  const setPlaces = (ps: Place[]) => onChange({ ...geo, places: renumber(ps) });
  const patch = (i: number, p: Partial<Place>) => setPlaces(places.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const move = (i: number, to: number) => {
    const ps = [...places];
    const [p] = ps.splice(i, 1);
    ps.splice(to, 0, p);
    setPlaces(ps);
    if (sel === i) setSelected(to);
    else if (sel === to) setSelected(i);
  };
  const remove = (i: number) => {
    setPlaces(places.filter((_, j) => j !== i));
    setSelected(null);
  };
  const add = () => {
    const near = places[sel ?? places.length - 1];
    const lng = Number.isFinite(near?.lng) ? Math.round((near.lng + 0.0005) * 1e5) / 1e5 : 151.2108;
    const lat = Number.isFinite(near?.lat) ? near.lat : -33.8612;
    setPlaces([...places, { n: 0, name: "New place", type: "stop", note: "", lng, lat }]);
    setSelected(places.length);
  };

  // A pin selected on the map brings its row into view.
  const fromMap = useRef(false);
  useEffect(() => {
    if (fromMap.current && sel !== null) rows.current[sel]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    fromMap.current = false;
  }, [sel]);

  const problems = [
    ...(places.some((p) => p.type === "start") ? [] : ["No place is a Start: the first place is usually where the walk or visit begins."]),
    ...(err("geo.places") ?? []),
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <MapFailed>
          <Suspense fallback={<div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">Loading the map…</div>}>
            <PlacesMap
              geo={geo}
              selected={sel}
              onSelect={(i) => {
                fromMap.current = true;
                setSelected(i);
              }}
              onMove={(i, lng, lat) => patch(i, { lng, lat })}
            />
          </Suspense>
        </MapFailed>
        <p className="mt-2 text-xs text-slate-500">Drag a pin to move its place, or type its longitude and latitude. Lines, toilets and cafés are edited under Map lines and facilities.</p>
      </div>
      <div className="space-y-3">
        <ol className="space-y-3" aria-label="Places">
          {places.map((p, i) => (
            <li
              key={i}
              ref={(el) => void (rows.current[i] = el)}
              className={`rounded-xl border p-3 ${i === sel ? "border-slate-900 ring-2 ring-slate-300" : "border-slate-200"}`}
              onFocus={() => setSelected(i)}
              onClick={() => setSelected(i)}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex size-7 items-center justify-center rounded-full text-sm font-bold ${i === sel ? "bg-amber-300 text-slate-900" : "bg-slate-900 text-white"}`} aria-hidden="true">
                  {p.n}
                </span>
                <span className="mr-auto truncate text-sm font-semibold">{p.name || "Unnamed place"}</span>
                <button type="button" className={btnCls} aria-label={`Move place ${p.n} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ↑
                </button>
                <button type="button" className={btnCls} aria-label={`Move place ${p.n} down`} disabled={i === places.length - 1} onClick={() => move(i, i + 1)}>
                  ↓
                </button>
                <button type="button" className={btnCls} aria-label={`Remove place ${p.n}`} disabled={places.length === 1} onClick={() => remove(i)}>
                  ✕
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                <Text id={`f-pl-name-${i}`} label={`Place ${p.n} name`} value={p.name} onChange={(v) => patch(i, { name: v })} error={err(`geo.places.${i}.name`)} />
                <Select id={`f-pl-type-${i}`} label={`Place ${p.n} type`} value={p.type} options={TYPES} onChange={(v) => patch(i, { type: v })} />
              </div>
              <div className="mt-3">
                <Text id={`f-pl-note-${i}`} label={`Place ${p.n} note`} multiline value={p.note} onChange={(v) => patch(i, { note: v })} placeholder="Calm, sheltered inlet. Good for a snorkel." />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <NumberInput id={`f-pl-lng-${i}`} label={`Place ${p.n} longitude`} step={0.00001} value={p.lng} onChange={(v) => patch(i, { lng: v })} error={err(`geo.places.${i}.lng`)} />
                <NumberInput id={`f-pl-lat-${i}`} label={`Place ${p.n} latitude`} step={0.00001} value={p.lat} onChange={(v) => patch(i, { lat: v })} error={err(`geo.places.${i}.lat`)} />
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className={btnCls} onClick={add}>
          + Add place
        </button>
        {problems.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-red-700">
            {problems.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
