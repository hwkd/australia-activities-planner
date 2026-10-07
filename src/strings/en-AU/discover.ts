import type { DurationFilter } from "~/lib/ranking";

const freeOnly = "Free only";
const durations = {
  any: "Any length",
  short: "Under 3 hrs",
  half: "Half day",
  full: "Full day",
} as const satisfies Record<DurationFilter, string>;

/** Visitor-facing text: discover (see src/strings/en-AU.ts). */
export const discover = {
  /** Document title on Discover. */
  pageTitle: (site: string) => `${site} · What to do in New South Wales for the weather`,
  /** Discover's header: the state switch and "Thu 1 Oct", then "If it's looking sunny." (D16: no place, so it never claims the weather). */
  header: {
    headline1: "If it's",
    headline2: "looking",
    /** The headline's weather word, with its full stop. */
    headlineWord: (word: string) => `${word}.`,
    intro: "Tap the sky you're expecting. The list re-ranks around it.",
  },
  /** The state switch in Discover's header and its picker (D16, spec §3.1, canvas A1 · State switch). */
  stateSwitch: {
    /** After the state's name, for screen readers: "New South Wales: change state". */
    change: ": change state",
    title: "Where are you exploring?",
    intro: "Pick a state. We're starting with New South Wales and adding more over time.",
    close: "Close",
    /** Under the live state's name: n = published activities. */
    liveNote: (n: number) => `${n} ${n === 1 ? "day" : "days"} out so far, from Sydney's beaches to the Blue Mountains`,
    othersHeading: "Other states and territories",
    /** Screen-reader name of a state that isn't here yet. */
    notYetLabel: (name: string) => `${name}, not here yet`,
    notYetTitle: (name: string) => `${name} isn't here yet.`,
    notYetBody: "We're starting with New South Wales and adding more over time.",
  },
  /** Accessible name of the results column. */
  resultsLabel: "Ideas",
  resultsTitle: (n: number, word: string) => `${n} ${n === 1 ? "idea" : "ideas"} for a ${word} day`,
  /** Under the results title: how many ideas the sky pushed out of the list. */
  hiddenNote: (n: number) => `${n} more ${n === 1 ? "is" : "are"} better saved for another day`,
  rankedResults: "Ranked results",
  /** The map view's accessible name. */
  mapLabel: (n: number, word: string) => `Map of ${n} ${n === 1 ? "idea" : "ideas"} for a ${word} day`,
  empty: {
    title: "Nothing fits those filters yet.",
    body: `Try another group or turn off ${freeOnly}.`,
    reset: "Reset filters",
  },
  filters: {
    groupLegend: "Who's coming",
    lengthLegend: "Length and price",
    /** The visible label over the duration chips on desktop. */
    lengthLabel: "How long",
    /** Desktop: the label of the row that holds Free only. */
    priceLabel: "Price",
    freeOnly,
    durations,
    accessLegend: "Access",
    pram: "Pram-friendly",
    stepFree: "Step-free",
  },
  /** A result card. */
  card: {
    /** "Beach · Bondi". */
    kicker: (category: string, area: string) => `${category} · ${area}`,
    /** Screen-reader text after the fit chip ("Perfect when sunny"). */
    fitWhen: (word: string) => ` when ${word}`,
    fitStrip: "Fit for each sky",
    /** Screen-reader text before each sky's fit in the strip ("Rainy: Fine"). */
    fitSky: (label: string) => `${label}: `,
    costPrefix: "Cost: ",
    add: "Add",
    /** The wider button on desktop's two-column grid. */
    addLong: "Add to a day",
    addLabel: (name: string) => `Add ${name} to a day`,
    /** When the idea is already on a plan from today onwards. */
    plannedOn: (day: string) => `Planned · ${day}`,
    plannedDays: (n: number) => `Planned · ${n} days`,
  },
  /** On soon: curated events in the next 14 days (spec §11.4). */
  onSoon: {
    heading: "On soon",
    addLabel: (name: string) => `Add ${name} to a day`,
    venue: (venue: string, area: string) => `${venue} · ${area}`,
    seeActivity: "About the place",
  },
  /** A tag on seasonal activities that are in season (spec §11.4). */
  seasonal: "Seasonal",
  /** Surprise me (spec §11.5). */
  surprise: {
    button: "Surprise me",
    eyebrow: "Surprise pick",
    /** When nothing rated Perfect for this sky was left to pick. */
    fallback: (word: string) => `Nothing's perfect for a ${word} day right now, so here's one that's fine.`,
    none: "Everything that suits this sky is already in your plans.",
    add: "Add to a day",
    another: "Another one",
    close: "Close the surprise pick",
  },
} as const;
