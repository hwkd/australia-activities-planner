import type { Weather } from "~/stores/weather";
import type { GroupFilter } from "~/lib/ranking";

const weatherLabel = {
  sunny: "Sunny",
  cloudy: "Cloudy",
  rainy: "Rainy",
  hot: "30°+",
} as const satisfies Record<Weather, string>;
const weatherWord = {
  sunny: "sunny",
  cloudy: "cloudy",
  rainy: "rainy",
  hot: "hot",
} as const satisfies Record<Weather, string>;
const fitLabel = ["Skip", "Fine", "Perfect"] as const;
const groups = {
  any: "Anyone",
  date: "Date",
  friends: "Friends",
  family: "Family",
  solo: "Solo",
} as const satisfies Record<GroupFilter, string>;

/** Visitor-facing text: common (see src/strings/en-AU.ts). Words shared across areas. */
export const common = {
  /** The map view (spec §11.2). */
  map: {
    attribution: "© OpenStreetMap contributors · Protomaps",
    unavailable: "The map can't be shown on this device. Everything on it is in the list.",
    list: "List",
    map: "Map",
    viewLegend: "Show results as",
    loading: "Loading the map…",
  },
  /** The live forecast (spec §11.1), on My plans and in Add to a day (not on Discover since D16). */
  forecast: {
    /** "Forecast: rainy, 60% chance of rain · updated 2 h ago" */
    caption: (word: string, rain: number, age: string) => `Forecast: ${word}, ${rain}% chance of rain · ${age}`,
    /** "Forecast for the Blue Mountains: rainy, …" when the day's plans are outside the city. */
    captionFor: (place: string, word: string, rain: number, age: string) => `Forecast for ${place}: ${word}, ${rain}% chance of rain · ${age}`,
    /** When the user has picked a different sky. */
    differs: (word: string, rain: number) => `The forecast says ${word} (${rain}% chance of rain).`,
    use: "Use forecast",
    credit: "Weather data: Open-Meteo",
    updatedJustNow: "updated just now",
    updatedMins: (n: number) => `updated ${n} min ago`,
    updatedHours: (n: number) => `updated ${n} h ago`,
    updatedDays: (n: number) => `updated ${n} ${n === 1 ? "day" : "days"} ago`,
    areas: { city: "Sydney", "blue-mountains": "the Blue Mountains", "northern-beaches": "the Northern Beaches", "royal-np": "Royal National Park" },
    /** My plans banner: "Sunday now looks rainy. 1 activity needs a Plan B." */
    alert: (day: string, word: string, n: number) => `${day} now looks ${word}. ${n} ${n === 1 ? "activity needs" : "activities need"} a Plan B.`,
    dismiss: "Dismiss",
  },
  weather: {
    /** Each sky's label on every screen (Set the sky, fit strips, weather tiles). */
    label: weatherLabel,
    /** Each sky as a lower-case word or adjective in sentences ("If it's looking sunny.", "for a hot day"). */
    word: weatherWord,
  },
  fit: {
    /** Fit wording for A · Sky Mode (spec §6.3), indexed by fit level 0–2. */
    label: fitLabel,
    /** A line under each fit level on the weather tiles, indexed by fit level 0–2. */
    note: ["Save it for another day", "Doable, with caveats", "Ideal conditions"] as const,
    /** "Perfect when sunny". */
    when: (fit: 0 | 1 | 2, w: Weather) => `${fitLabel[fit]} when ${weatherWord[w]}`,
  },
  /** Who's coming: Discover's group filter names. */
  groups,
  /** Set the sky's defaults (Discover); My plans passes its own legend for a day's sky. */
  skyPicker: {
    legend: "Weather",
    heading: "Set the sky",
    note: "Re-ranks the list",
  },
  /** Screen-reader suffix on the My plans tab badge ("3 planned"). */
  planBadge: " planned",
} as const;
