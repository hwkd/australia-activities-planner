import type { EventItem } from "~/content/eventSchema";
import type { CardData } from "./content";
import { addDays, shortLabel, type DateStr } from "./dates";
import { placeOf, type ExportInfo } from "./calendarExport";
import { nearestArea } from "./forecast";
import { lib } from "~/strings/en-AU/lib";

/**
 * Events (spec §11.4) as cards that plan like activities: same fit, groups, duration and start time,
 * plus the dates they're on (Add to a day offers only those) and the official link.
 */
export interface EventCard extends Omit<CardData, "status" | "days" | "seasonal" | "access"> {
  kind: "event";
  dates: { from: DateStr; to: DateStr };
  link: { label: string; url: string };
  venue: string;
  activityId?: string;
}

export function toEventCard(e: EventItem): EventCard {
  return {
    kind: "event",
    id: e.id,
    name: e.name,
    area: e.area,
    category: "event",
    categoryLabel: lib.events.category,
    blurb: e.blurb,
    weatherFit: e.weatherFit,
    goodFor: e.goodFor,
    duration: e.duration,
    cost: e.cost,
    suggestedStart: e.suggestedStart,
    dates: { from: e.start as DateStr, to: e.end as DateStr },
    link: e.link,
    venue: e.venue.name,
    ...(e.activityId ? { activityId: e.activityId } : {}),
    forecastArea: nearestArea(e.venue),
    location: { lat: e.venue.lat, lng: e.venue.lng },
  };
}

/** What calendar export needs: the venue as the place, the official page as the link. */
export const eventExportInfo = (e: EventItem): ExportInfo => ({
  id: e.id,
  name: e.name,
  duration: e.duration,
  place: placeOf(e.venue.name, e.area),
  geo: { lat: e.venue.lat, lng: e.venue.lng },
  directions: lib.events.directions(e.link.url),
  url: e.link.url,
});

/** "Sat 3 Oct" or "Sat 3 Oct – Mon 5 Oct". */
export const datesLabel = (from: DateStr, to: DateStr) => (from === to ? shortLabel(from) : lib.events.range(shortLabel(from), shortLabel(to)));

/** On soon (spec §11.4): events on at some point in the next 14 days, soonest first. */
export const onSoon = <T extends Pick<EventCard, "dates" | "name">>(events: readonly T[], today: DateStr, days = 14): T[] =>
  events
    .filter((e) => e.dates.to >= today && e.dates.from <= addDays(today, days))
    .sort((a, b) => a.dates.from.localeCompare(b.dates.from) || a.name.localeCompare(b.name, "en-AU"));
