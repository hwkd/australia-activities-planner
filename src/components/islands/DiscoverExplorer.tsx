import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { $weather } from "~/stores/weather";
import { $filters } from "~/stores/filters";
import { $plan, initPlan } from "~/stores/plan";
import { $planningDate, $sheet } from "~/stores/ui";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { useToday } from "~/stores/useToday";
import { DEFAULT_FILTER_STATE, discoverQuery, type FilterState } from "~/lib/discoverQuery";
import { rank } from "~/lib/ranking";
import { pickSurprise } from "~/lib/surprise";
import { datesPlanned, emptyPlan, plannedIdsFrom, type Plan } from "~/lib/plan";
import { parts, shortLabel } from "~/lib/dates";
import { track } from "~/lib/analytics";
import type { CardData } from "~/lib/content";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";
import ActivityCard from "~/components/discover/ActivityCard";
import SurprisePick from "~/components/discover/SurprisePick";
import OnSoon from "~/components/discover/OnSoon";
import type { MapPin } from "~/components/map/MapView";

// The map (MapLibre, ~230 KB) loads only when a visitor switches to it (spec §11.2).
import MapBoundary from "~/components/map/MapBoundary";
const MapView = lazy(() => import("~/components/map/MapView"));
import { onSoon, type EventCard } from "~/lib/events";

const EMPTY_PLAN: Plan = emptyPlan();

/** Keeps `?w=…&g=…` in step with the stores, without adding history entries (spec §3.1, AC 2). */
function syncUrl() {
  const q = discoverQuery($weather.get(), $filters.get(), $planningDate.get());
  if (location.search !== q) history.replaceState(history.state, "", location.pathname + q + location.hash);
}

/**
 * Discover's ranked results (`client:load`; the filters are the DiscoverFilters island). Reads the weather set by SetTheSky, the
 * filters, and the plan (for "Planned" labels and ranking); gets the activity list as a compact
 * card index.
 */
export default function DiscoverExplorer({
  cards,
  events = [],
  mapView = false,
}: {
  cards: CardData[];
  events?: EventCard[];
  mapView?: boolean;
}) {
  // A sky change re-themes the page at once (applyTheme) and the list follows a frame or two later:
  // re-ranking and moving the cards was most of the work on a tap, and held back the new sky on phones.
  const liveWeather = useHydratedStore($weather, "sunny");
  const weather = useDeferredValue(liveWeather);
  const filters = useHydratedStore($filters, DEFAULT_FILTER_STATE);
  const plan = useHydratedStore($plan, EMPTY_PLAN);
  const planningDay = useHydratedStore($planningDate, null);
  const today = useToday();

  useEffect(() => initPlan(cards), [cards]);
  useEffect(() => {
    syncUrl();
    const offs = [$weather.listen(syncUrl), $filters.listen(syncUrl), $planningDate.listen(syncUrl)];
    return () => offs.forEach((off) => off());
  }, []);

  const month = planningDay ? parts(planningDay)[1] : today ? parts(today)[1] : undefined;
  const { shown, hidden } = useMemo(
    () => rank(cards, { weather, ...filters }, { planned: today ? plannedIdsFrom(plan, today) : undefined, month }),
    [cards, weather, filters, plan, today, month],
  );

  // Surprise me (spec §11.5): the current pick, the picks so far (for "not the last three"), and a
  // counter that replays the reveal on Another one.
  const [surprise, setSurprise] = useState<{ id: string | null; fallback: boolean; turn: number } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const surprisePick = () => {
    // Always for the sky on screen, even in the frame or two before the list catches up with it.
    const planned = today ? plannedIdsFrom(plan, today) : undefined;
    const list = liveWeather === weather ? shown : rank(cards, { weather: liveWeather, ...filters }, { planned, month }).shown;
    const pick = pickSurprise(list, liveWeather, { planned, recent });
    setSurprise((prev) => ({ id: pick?.card.id ?? null, fallback: !!pick?.fallback, turn: (prev?.turn ?? 0) + 1 }));
    if (pick) setRecent((r) => [...r, pick.card.id].slice(-10));
    track({ name: "surprise_pick", props: { fallback: pick?.fallback ? "yes" : "no" } });
  };
  // A pick that no longer fits the filters or the sky disappears with it.
  const surpriseCard = surprise?.id ? (shown.find((c) => c.id === surprise.id) ?? null) : null;
  const showSurprise = surprise && (surprise.id === null || surpriseCard);

  const plannedLabel = (id: string) => {
    if (!today) return null;
    const dates = datesPlanned(plan, id, today);
    if (!dates.length) return null;
    return dates.length === 1
      ? t.discover.card.plannedOn(shortLabel(dates[0]))
      : t.discover.card.plannedDays(dates.length);
  };

  const change = (next: FilterState, changed: { filter: string; value: string }) => {
    $filters.set(next);
    track({ name: "filter_change", props: changed });
  };
  const add = useCallback(
    (activityId: string) =>
      $sheet.set({ kind: "add", activityId, source: "card", ...(planningDay ? { date: planningDay } : {}) }),
    [planningDay],
  );

  // On soon (spec §11.4): events in the next 14 days for the chosen group.
  const soon = today
    ? onSoon(events, today).filter((e) => filters.group === "any" || e.goodFor.includes(filters.group))
    : [];

  // List / Map (spec §11.2): the map shows the same ranked results as labelled pins.
  const [view, setView] = useState<"list" | "map">("list");
  const [pinned, setPinned] = useState<string | null>(null);
  const pins = useMemo<MapPin[]>(
    () =>
      shown.flatMap((c) =>
        c.location
          ? [
              {
                id: c.id,
                lat: c.location.lat,
                lng: c.location.lng,
                label: t.common.fit.label[c.weatherFit[weather]],
                name: `${c.name}: ${t.common.fit.when(c.weatherFit[weather], weather)}`,
              },
            ]
          : [],
      ),
    [shown, weather],
  );
  const pinnedIndex = shown.findIndex((c) => c.id === pinned);

  const n = shown.length;
  const word = t.common.weather.word[weather];

  return (
    <>
      {soon.length > 0 && <OnSoon events={soon} weather={weather} plannedLabel={plannedLabel} onAdd={add} />}
      <div className="results-head mx-1 mt-8 lg:first:mt-0">
        <h2
          className="w90 m-0 text-[27px] leading-[1.05] font-bold tracking-[-0.025em] lg:text-[32px]"
          style={{ textShadow: "var(--hl)" }}
          aria-live="polite"
        >
          {t.discover.resultsTitle(n, word)}
        </h2>
        {hidden > 0 && (
          <p
            className="m-0 mt-2 flex items-start gap-[7px] text-[13px] leading-[1.4] lg:text-[13.5px]"
            style={{ color: "var(--sky-mute)" }}
          >
            <Icon name="hidden" className="mt-0.5 shrink-0" />
            {t.discover.hiddenNote(hidden)}
          </p>
        )}
      </div>

      {/* Surprise me on the left, List / Map on the right (both A · Sky Mode artboards). */}
      {n > 0 && (
        <div className="mx-1 mt-3.5 flex items-center justify-between gap-2.5 lg:mt-4 lg:gap-3">
          <button
            type="button"
            onClick={surprisePick}
            className="press glass inline-flex h-11 items-center gap-[7px] rounded-full pr-4 pl-[13px] text-[14px] font-bold lg:pr-[18px] lg:pl-3.5"
            style={{ color: "var(--ink)" }}
          >
            <Icon name="spark" size={17} />
            {t.discover.surprise.button}
          </button>
          {mapView && (
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">{t.common.map.viewLegend}</legend>
              <div className="glass grid grid-cols-2 gap-1 rounded-full p-1">
                {(["list", "map"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className="press h-11 rounded-full border-0 px-4 text-[14px] font-bold lg:px-[18px]"
                    style={{
                      background: view === v ? "var(--sel)" : "transparent",
                      color: view === v ? "var(--sel-ink)" : "var(--ink)",
                    }}
                  >
                    {t.common.map[v]}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {showSurprise && (
        <div className="mt-3.5">
          <SurprisePick
            card={surpriseCard}
            fallback={surprise.fallback}
            weather={weather}
            turn={surprise.turn}
            onAdd={add}
            onAnother={surprisePick}
            onClose={() => setSurprise(null)}
          />
        </div>
      )}

      <div className="mt-3.5">
        {mapView && view === "map" && n > 0 ? (
          <div className="grid gap-3">
            <MapBoundary
              fallback={<p className="glass m-0 rounded-[22px] p-4 text-[14.5px]">{t.common.map.unavailable}</p>}
            >
              <Suspense fallback={<p className="glass m-0 rounded-[24px] p-4 text-[14.5px]">{t.common.map.loading}</p>}>
                <MapView
                  pins={pins}
                  selected={pinned}
                  onSelect={setPinned}
                  dark={weather === "rainy"}
                  label={t.discover.mapLabel(n, word)}
                />
              </Suspense>
            </MapBoundary>
            {pinnedIndex >= 0 && (
              <ActivityCard
                card={shown[pinnedIndex]}
                index={pinnedIndex}
                weather={weather}
                planned={plannedLabel(shown[pinnedIndex].id)}
                onAdd={add}
              />
            )}
          </div>
        ) : n === 0 ? (
          <div className="glass card-in rounded-[26px] p-[22px]">
            <p className="w90 m-0 text-[22px] font-bold tracking-[-0.02em]">{t.discover.empty.title}</p>
            <p className="m-0 mt-1.5 text-sm leading-[1.45]" style={{ color: "var(--mute)" }}>
              {t.discover.empty.body}
            </p>
            <button
              type="button"
              onClick={() => change(DEFAULT_FILTER_STATE, { filter: "reset", value: "all" })}
              className="press mt-3.5 h-11 rounded-[14px] border-0 px-[18px] font-bold"
              style={{ background: "var(--sel)", color: "var(--sel-ink)" }}
            >
              {t.discover.empty.reset}
            </button>
          </div>
        ) : (
          // One list for every sky and filter: cards keep their element and just reorder, and only
          // ones newly shown play the entrance (rebuilding all of them made phones drop frames).
          <ol className="rc-list m-0 list-none p-0" aria-label={t.discover.rankedResults}>
            {shown.map((c, i) => (
              <li key={c.id}>
                <ActivityCard card={c} index={i} weather={weather} planned={plannedLabel(c.id)} onAdd={add} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
