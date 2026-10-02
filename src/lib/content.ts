import type { Activity } from "~/content/schema";
import { nearestArea, type AreaId } from "./forecast";

/** The compact fields Discover's island needs for ranking and cards (implementation-plan.md §3.3). */
export interface CardData {
  id: string;
  status: Activity["status"];
  name: string;
  area: string;
  category: Activity["category"];
  categoryLabel: string;
  blurb: string;
  weatherFit: Activity["weatherFit"];
  goodFor: Activity["goodFor"];
  duration: Activity["duration"];
  cost: Activity["cost"];
  days?: Activity["days"];
  seasonal?: Activity["seasonal"];
  suggestedStart: string;
  /** Pram and step-free access for the Discover filters (spec §11.6); missing = not yet checked. */
  access?: { prams: AccessLevel; stepFree: AccessLevel };
  /** The forecast area nearest the activity (spec §11.1); cards published before M16 lack it (city). */
  forecastArea?: AreaId;
  /** For pins on the map view (spec §11.2); cards published before M17 lack it. */
  location?: { lat: number; lng: number };
}
export type AccessLevel = NonNullable<Activity["access"]>["prams"];

export function toCard(a: Activity): CardData {
  const { id, status, name, area, category, categoryLabel, blurb, weatherFit, goodFor, duration, cost, days, seasonal, suggestedStart } = a;
  const access = a.access && { prams: a.access.prams, stepFree: a.access.stepFree };
  return { id, status, name, area, category, categoryLabel, blurb, weatherFit, goodFor, duration, cost, days, seasonal, suggestedStart, access, forecastArea: nearestArea(a.location), location: a.location };
}

