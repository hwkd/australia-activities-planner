/** Visitor-facing text: detail, the activity page and its islands (see src/strings/en-AU.ts). */
export const detail = {
  /** Screen-reader suffix on links that open in a new tab (leading space intended). */
  newTab: " (opens in a new tab)",
  hero: {
    pageTitle: (name: string, site: string) => `${name} · ${site}`,
    previewBanner: "Preview of unpublished changes. Only signed-in editors can see this.",
    back: "Back",
    fitLabel: "Fit for your sky",
    /** e.g. "Great when sunny"; `fit` from FIT_LABEL, `weather` from WEATHER_WORD. */
    fitWhen: (fit: string, weather: string) => `${fit} when ${weather}`,
  },
  weather: {
    heading: "Weather check",
    hint: "Tap a sky to try it",
    tilesLabel: "Weather",
    yourSky: "Your sky",
    /** One line per fit level (0 poor, 1 okay, 2 great), under the fit label. */
  },
  map: {
    heading: "Map",
    /** The real map (spec §3.2 item 3, D15). */
    label: (name: string) => `${name}: map of the places, the walk and the trip from the city`,
    pin: (n: number, name: string) => `${n}. ${name}`,
    /** Under the map; `checked` is the long date, or null while the map is generated and not yet checked. */
    source: (source: string, checked: string | null) =>
      `Map © OpenStreetMap contributors. Places and lines: ${source}; ${checked ? `checked ${checked}` : "not yet checked"}.`,
    facilities: "Facilities",
    wayBack: "Way back",
    /** The visible labels of the lines under the map; screen readers get lib.route.onTheMap instead. */
    onTheMap: "On the map:",
    wayBackLines: "Way back:",
    closeStop: "Close place details",
    stopsHeading: "Places on the map",
    start: "Start",
    finish: "Finish",
  },
  gettingThere: {
    heading: "Getting there",
    fromCity: "From the city centre",
    /** Screen-reader text before the way-in strip. */
    wayIn: "Usual way in: ",
    lastStretch: "Last stretch",
    arrive: (place: string) => `Arrive · ${place}`,
    est: "est.",
    /** Screen-reader names of the leg kinds, e.g. before a leg's title ("Train: "). */
    legKind: { train: "Train", metro: "Metro", "light-rail": "Light rail", bus: "Bus", ferry: "Ferry", walk: "Walk" },
    legPrefix: (kind: string) => `${kind}: `,
    gettingBack: "Getting back",
    opal: "Tap on and off with Opal or a contactless card",
    /** Every trip by train, metro or light rail: weekend trackwork changes too often to list per activity. */
    trackwork: "Weekend trackwork sometimes swaps trains for buses.",
    trackworkLink: "Check Transport for NSW travel alerts",
    directions: "Directions from where you are",
    directionsNote: "Live times and your own route, in Google Maps",
    driving: "Driving?",
    /** "≈ 25 min from the city" */
    driveTime: (time: string) => `${time} from the city`,
    rideshare: "Rideshare: ",
  },
  cost: {
    heading: "What it'll cost",
    currency: "Est. AUD",
    group: "Group",
    adults: "Adults",
    kids: "Kids",
    anAdult: "an adult",
    aChild: "a child",
    /** Stepper buttons; `what` is anAdult or aChild. */
    remove: (what: string) => `Remove ${what}`,
    add: (what: string) => `Add ${what}`,
    people: (adults: number, kids: number) =>
      `${adults} ${adults === 1 ? "adult" : "adults"}${kids ? ` + ${kids} ${kids === 1 ? "child" : "kids"}` : ""}`,
    /** Follows the people line when a day is being planned (leading separator intended). */
    faresFor: (day: string) => ` · fares for ${day}`,
    breakdown: "Cost breakdown",
    est: "est.",
    optionalExtras: "Optional extras",
    perPerson: (price: string) => `${price} pp`,
    total: "Total, estimated",
    /** Next to the total: how the transport line was worked out. */
    publicTransport: "Public transport",
    disclaimer: "Estimates for planning only. Fares and prices change; check before you go.",
    pricesChecked: (date: string) => `Prices checked ${date}.`,
    pricesNotChecked: "Prices not yet checked.",
    opalCapsAsOf: (date: string) => `Opal caps as of ${date}.`,
  },
  visit: {
    heading: "Plan your visit",
    bestTime: "Best time",
    hours: "Hours",
    bring: "What to bring",
    facilities: "Facilities",
    access: "Access",
    staySafe: "Stay safe",
  },
  tip: {
    heading: "Newcomer tip",
  },
  /** Accessibility facts (spec §11.6). */
  access: {
    heading: "Access",
    prams: "Prams",
    stepFree: "Step-free",
    toilet: "Accessible toilet",
    level: { yes: "Yes", partial: "Partly", no: "No" },
    toiletLevel: (yes: boolean) => (yes ? "Yes" : "No"),
    /** `date` is the long form, e.g. "1 October 2026". */
    checked: (date: string) => `Checked against official sources on ${date}.`,
    notChecked: "Not yet checked. Ask the venue before you go.",
  },
  /** The label on "Our tip:" sentences: advice no official source confirms. */
  ourTip: {
    label: "Our tip",
    sr: ": our advice, not from an official source.",
    title: "Our advice, not from an official source",
  },
  unconfirmed: {
    heading: "Not yet confirmed",
    hint: "We couldn't confirm these with an official source yet, so check them before you rely on them.",
    /** Before each way to check: "How to check: Opal fares on Transport for NSW". */
    checkPrefix: "How to check: ",
  },
  headsUp: {
    heading: "Heads up",
    /** NSW RFS fire danger (spec §11.2), for outdoor activities. */
    /** `where` names the RFS district: "Greater Sydney", "the Illawarra and Shoalhaven", … */
    fireToday: (where: string, rating: string, ban: boolean) => `Fire danger in ${where} today: ${rating}.${ban ? " Total fire ban today." : ""}`,
    fireTomorrow: (rating: string, ban: boolean) => `Tomorrow: ${rating}.${ban ? " Total fire ban tomorrow." : ""}`,
    fireSource: (time: string) => `From NSW RFS at ${time}`,
    fireUnknown: "Fire danger: check the NSW RFS site before you go.",
    fireLink: "NSW RFS fire danger",
    booking: "Booking required: book ahead on the venue's site.",
    /** `days` is a list such as "Saturdays and Sundays". */
    runsOn: (days: string) => `Runs on ${days} only.`,
    seasonal: (note: string, months: readonly string[]) => `${note} (${months.join(", ")}).`,
  },
  pairings: {
    heading: "Make a day of it",
  },
  addToDay: {
    label: "Add to a day",
    plannedOn: (date: string) => `Planned · ${date}`,
    plannedDays: (n: number) => `Planned · ${n} days`,
    /** Accessible names; they start with the visible label (WCAG 2.5.3). */
    ariaPlanned: (label: string, name: string) => `${label}: add ${name} to another day`,
    ariaAdd: (name: string) => `Add to a day: ${name}`,
    /** Under the facts: "Planned for Sat 3 Oct, Sun 4 Oct and 2 more". */
    plannedFor: (dates: string) => `Planned for ${dates}`,
    andMore: (n: number) => ` and ${n} more`,
  },
} as const;
