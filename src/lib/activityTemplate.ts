import type { Activity } from "~/content/schema";

/** "Bondi to Coogee" → "bondi-to-coogee" (activity ids are kebab-case and never change). */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    // Cutting at 60 can end on a hyphen, which isn't a valid id: trim again.
    .replace(/-+$/, "");

/** Where a new activity's map starts: Circular Quay, so the admin's map has somewhere to be. */
const QUAY = { lat: -33.8612, lng: 151.2108 };

/**
 * A new, schema-valid activity for the admin's "New activity" (tracker M11). Every value is a
 * placeholder to replace; it starts as a draft, so it can't go live on the production site unchecked.
 */
export function newActivity(id: string, name: string): Activity {
  return {
    id,
    status: "draft",
    name,
    city: "sydney",
    area: "Area",
    category: "landmark",
    categoryLabel: "Landmark",
    blurb: "One line about why it's worth going.",
    weatherFit: { sunny: 2, cloudy: 1, rainy: 0, hot: 1 },
    weatherNote: "How the weather changes the visit.",
    goodFor: ["friends"],
    duration: { label: "1–2 hrs", minHours: 1, maxHours: 2 },
    cost: "Free",
    gettingThere: "How to get there by public transport, in one or two sentences.",
    newcomerTip: "Something a newcomer wouldn't know.",
    location: { ...QUAY },
    suggestedStart: "10:00",
    facts: [
      { k: "Time", v: "1–2 hrs" },
      { k: "Distance", v: "–" },
      { k: "Effort", v: "Easy" },
      { k: "Entry", v: "Free" },
    ],
    routes: {
      dest: { ...QUAY, label: name },
      pt: {
        total: "≈ 30 min",
        changes: 0,
        fare: [4, 6],
        legs: [{ mode: "walk", title: "Walk to the stop", mins: 10 }],
        back: { text: "The same way back." },
      },
      drive: null,
      unavailable: { drive: "Not checked yet." },
    },
    geo: {
      places: [{ n: 1, name, type: "start", note: "", ...QUAY }],
      source: "To be added",
      checked: null,
    },
    costs: { entry: [0, 0], extras: [], pricesChecked: null },
    visit: { bestTime: "", hours: "", bring: [], facilities: [], access: "", safety: [] },
    pairings: [],
    lastVerified: null,
  };
}
