import { lazy, Suspense, useMemo } from "react";
import { $weather } from "~/stores/weather";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { updateTrip } from "~/stores/trip";
import { togglePoi } from "~/lib/detailState";
import { drawnLines, linesInWords, type DrawnLine, type Geo, type LegKind } from "~/lib/route";
import { useTrip } from "~/components/detail/useTrip";
import MapBoundary from "~/components/map/MapBoundary";
import type { MapPin, TransitLeg } from "~/components/map/MapView";
import { TRANSIT_DASH, TRANSIT_LINE } from "~/theme/map-palette";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

// The real map (MapLibre) loads only when this card is on screen (`client:visible`), never with the
// first paint on a phone, and isn't in the offline cache (spec §3.2 item 3, §11.2).
const MapView = lazy(() => import("~/components/map/MapView"));

interface Props {
  name: string;
  geo: Geo;
  /** Whether the map tiles are uploaded (spec §11.2); without them the list carries everything. */
  mapView: boolean;
  /** The long form of `geo.checked`, e.g. "2 October 2026", formatted on the server. */
  checked: string | null;
}

const Switch = ({ on }: { on: boolean }) => (
  <span
    aria-hidden="true"
    className="relative h-[18px] w-[30px] rounded-full"
    style={{ boxShadow: `inset 0 0 0 1.5px ${on ? "var(--sel-ink)" : "var(--ink)"}`, background: on ? "var(--sel-ink)" : "transparent" }}
  >
    <span
      className="absolute top-[3px] left-[3px] h-3 w-3 rounded-full transition-transform duration-300"
      style={{ background: on ? "var(--sel)" : "var(--ink)", transform: on ? "translateX(12px)" : "none" }}
    />
  </span>
);

/** A short sample of a line in its colour and dash pattern, on a chip of the base map's colour, next to its name. */
function Swatch({ kind, dark }: { kind: LegKind; dark: boolean }) {
  const d = TRANSIT_DASH[kind];
  const w = 3;
  const c = TRANSIT_LINE[dark ? "dark" : "light"];
  return (
    <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true" className="shrink-0">
      <rect width="30" height="14" rx="7" fill={c.ground} />
      <path
        d="M6 7h18"
        stroke={c[kind]}
        strokeWidth={w}
        strokeLinecap={kind === "walk" ? "round" : "butt"}
        strokeDasharray={d.dash ? d.dash.map((x) => Math.max(x * w, kind === "walk" ? 0.01 : 0)).join(" ") : undefined}
      />
    </svg>
  );
}

const Drawn = ({ lines, dark }: { lines: DrawnLine[]; dark: boolean }) =>
  lines.map((l) => (
    <span key={l.label} className="inline-flex items-center gap-1.5">
      <Swatch kind={l.kind} dark={dark} />
      {l.label}
    </span>
  ));

/**
 * The map card (spec §3.2 item 3, D15): the real map with the activity's numbered places, its walking
 * line, facilities and the trip from the city on its real route (the way back on request); the lines
 * in words; the source; the selected place's note; and the numbered list, the full-size and
 * accessible equivalent of the pins (AC 19). Without the map, the list carries everything.
 */
export default function RouteMap({ name, geo, mapView, checked }: Props) {
  const weather = useHydratedStore($weather, "sunny");
  const dark = weather === "rainy";
  const trip = useTrip();
  const sel = geo.places.find((p) => p.n === trip.poi) ?? null;
  const hasBack = !!geo.back?.legs.length;
  const showBack = hasBack && trip.showBack;
  const hasFacilities = !!geo.facilities?.length;
  const words = linesInWords(geo, showBack);
  const tog = (on: boolean) => ({ background: on ? "var(--sel)" : "var(--glass)", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" });

  const pins = useMemo<MapPin[]>(() => geo.places.map((p) => ({ id: String(p.n), lat: p.lat, lng: p.lng, label: String(p.n), name: t.detail.map.pin(p.n, p.name) })), [geo.places]);
  const transit = useMemo<TransitLeg[]>(
    () => [...(geo.trip?.legs ?? []), ...(showBack ? geo.back!.legs.map((l) => ({ ...l, back: true })) : [])],
    [geo.trip, geo.back, showBack],
  );
  const drawn = drawnLines(geo, showBack);
  const unavailable = <p className="glass m-0 rounded-[18px] p-4 text-[14.5px]">{t.common.map.unavailable}</p>;

  return (
    <>
      {(hasFacilities || hasBack) && (
        <div className="hs -mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5">
          {hasFacilities && (
            <button
              type="button"
              aria-pressed={trip.showFacilities}
              onClick={() => updateTrip((s) => ({ ...s, showFacilities: !s.showFacilities }))}
              className="press inline-flex h-11 shrink-0 items-center gap-[9px] rounded-full border pr-[15px] pl-[11px] text-sm font-semibold"
              style={tog(trip.showFacilities)}
            >
              <Switch on={trip.showFacilities} />
              {t.detail.map.facilities}
            </button>
          )}
          {hasBack && (
            <button
              type="button"
              aria-pressed={trip.showBack}
              onClick={() => updateTrip((s) => ({ ...s, showBack: !s.showBack }))}
              className="press inline-flex h-11 shrink-0 items-center gap-[9px] rounded-full border pr-[15px] pl-[11px] text-sm font-semibold"
              style={tog(trip.showBack)}
            >
              <Switch on={trip.showBack} />
              {t.detail.map.wayBack}
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        {mapView ? (
          <MapBoundary fallback={unavailable}>
            <Suspense fallback={<div className="rounded-[24px]" style={{ height: 340, background: "var(--soft)" }} />}>
              <MapView
                pins={pins}
                lines={geo.trail ?? []}
                facilities={trip.showFacilities ? (geo.facilities ?? []) : []}
                transit={transit}
                selected={trip.poi === null ? null : String(trip.poi)}
                onSelect={(id) => updateTrip((s) => togglePoi(s, Number(id)))}
                dark={dark}
                label={t.detail.map.label(name)}
                height={340}
                compactPins
              />
            </Suspense>
          </MapBoundary>
        ) : (
          unavailable
        )}
      </div>

      {words && drawn && (
        <p className="m-0 mt-2.5 px-1 text-[13px] leading-[1.45] font-semibold" data-lines>
          <span className="sr-only">{words}</span>
          <span aria-hidden="true" className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span style={{ color: "var(--mute)" }}>{t.detail.map.onTheMap}</span>
            <Drawn lines={drawn.trip} dark={dark} />
            {drawn.back.length > 0 && <span style={{ color: "var(--mute)" }}>{t.detail.map.wayBackLines}</span>}
            <Drawn lines={drawn.back} dark={dark} />
          </span>
        </p>
      )}
      <p className="m-0 mt-1.5 px-1 text-[12px] leading-[1.4]" style={{ color: "var(--mute)" }}>
        {t.detail.map.source(geo.source, checked)}
      </p>

      <div aria-live="polite">
        {sel && (
          <div className="card-in mt-3 flex items-start gap-3 rounded-[20px] py-3.5 pr-1.5 pl-3.5" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-base font-extrabold" style={{ background: "var(--accent)", color: "var(--sel-ink)" }}>
              {sel.n}
            </span>
            <span className="min-w-0 flex-1 pt-[3px]">
              <span className="w90 block text-[19px] leading-[1.15] font-bold tracking-[-0.015em]">{sel.name}</span>
              <span className="mt-1 block text-sm leading-[1.45]" style={{ color: "var(--mute)" }}>
                {sel.note}
              </span>
            </span>
            <button
              type="button"
              aria-label={t.detail.map.closeStop}
              onClick={() => updateTrip((s) => ({ ...s, poi: null }))}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
      </div>

      <h3 className="sr-only">{t.detail.map.stopsHeading}</h3>
      <ol className="m-0 mt-3 grid list-none grid-cols-2 gap-1.5 p-0">
        {geo.places.map((q) => {
          const on = trip.poi === q.n;
          const tag = q.type === "start" ? t.detail.map.start : q.type === "end" ? t.detail.map.finish : null;
          return (
            <li key={q.n}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => updateTrip((s) => togglePoi(s, q.n))}
                className="press flex min-h-[50px] w-full items-center gap-[9px] rounded-2xl border px-2 py-[7px] text-left"
                style={{ background: on ? "var(--sel)" : "var(--soft)", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" }}
              >
                <span
                  className="flex h-[26px] w-[26px] shrink-0 items-center justify-center text-[13px] font-extrabold"
                  style={{ borderRadius: tag ? 8 : "50%", background: on ? "var(--sel-ink)" : "var(--sel)", color: on ? "var(--sel)" : "var(--sel-ink)" }}
                >
                  {q.n}
                </span>
                <span className="min-w-0 text-[13.5px] leading-[1.2] font-semibold">
                  {q.name}
                  {tag && <span className="mt-0.5 block text-[10.5px] font-bold tracking-[0.12em] uppercase">{tag}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
