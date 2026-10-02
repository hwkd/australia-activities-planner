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
  pageTitle: (site: string) => `${site} · What to do in Sydney for the weather`,
  /** Discover's header: "Sydney · Thu 1 Oct", then "Sydney's looking sunny." */
  header: {
    city: "Sydney",
    headline1: "Sydney's",
    headline2: "looking",
    /** The headline's weather word, with its full stop. */
    headlineWord: (word: string) => `${word}.`,
    intro: "Tap a sky. Sydney re-ranks around it.",
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
  /** The desktop Coming up rail. */
  comingUp: {
    eyebrow: "Your plans",
    title: "Coming up",
    emptyTitle: "Nothing planned yet",
    emptyBody: "Tap Add on any idea to put it on a day. Any day works, weekdays included.",
    openPlans: "Open My plans",
    /** "3 activities. Each day reads its own forecast." */
    count: (n: number) => `${n} ${n === 1 ? "activity" : "activities"}. Each day reads its own forecast.`,
    share: "Share",
    /** Beside Share once the link is out. */
    shareDone: "Link copied: send it to your group",
    shareSent: "Shared with your group",
    /** A day's heading links to it in My plans. */
    openDay: (label: string, date: string) => `${label}, ${date}: open in My plans`,
    /** Under a day's heading, after its date. */
    skyLine: {
      auto: (word: string) => `${word} forecast`,
      manual: (word: string) => `${word}, your pick`,
      none: "Sky not set",
    },
    /** On a plan that doesn't suit the day's sky. */
    notGreat: {
      sunny: "Not ideal in full sun.",
      cloudy: "Not ideal under heavy cloud.",
      rainy: "Not great in the rain.",
      hot: "Not great in the heat.",
    },
    planBMeta: (area: string, duration: string) => `${area} · ${duration}`,
    swapIn: "Swap it in",
  },
} as const;
