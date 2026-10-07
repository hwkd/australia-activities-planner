/** Visitor-facing text: plans (see src/strings/en-AU.ts). */
export const plans = {
  /** The forecast-change banner (spec §11.1). */
  forecastAlert: { label: "Forecast changes" },
  /** The selected day's plans on a map, numbered in time order (spec §11.2). */
  dayMap: {
    show: "Show this day on a map",
    hide: "Hide the map",
    label: (day: string) => `Map of the plans for ${day}`,
    pin: (n: number, name: string, time: string) => `${n}. ${name}, ${time}`,
  },
  /** The /plan page shell: document title, meta description and the loading/no-JS fallbacks. */
  page: {
    title: (site: string) => `My plans · ${site}`,
    description: "Your plans in New South Wales, day by day.",
    loading: "Loading your plans",
    noscript: "My plans are stored on this device and need JavaScript to show.",
  },
  header: {
    /** The eyebrow's state (D16): short, so "NSW · 2 plans coming up" fits beside Today on a phone. */
    city: "NSW",
    heading: "My plans",
    comingUp: (n: number) => `${n} ${n === 1 ? "plan" : "plans"} coming up`,
    today: "Today",
  },
  /** The month grid on My plans, plus the compact month in Add to a day. */
  calendar: {
    prevMonth: "Previous month",
    nextMonth: "Next month",
    /** Column headings, Monday first. */
    weekdays: ["M", "T", "W", "T", "F", "S", "S"],
    /** Parts of a day cell's accessible name, joined with ", ". */
    cell: {
      today: "today",
      plans: (n: number) => `${n} ${n === 1 ? "plan" : "plans"}`,
      noPlans: "no plans",
      needsLook: "needs a look",
      past: "past",
    },
    /** Chips beyond the first two on a desktop day cell. */
    more: (n: number) => `+${n} more`,
    legend: {
      plans: "Plans",
      needsLook: "Needs a look",
      holiday: "Public holiday",
      skySet: "Sky set",
    },
    /** A compact-month day's accessible name. */
    miniDay: (date: string, holiday: string | null, closed: boolean, today: boolean) =>
      `${date}${holiday ? `, ${holiday}` : ""}${closed ? ", closed" : ""}${today ? ", today" : ""}`,
  },
  /** The selected day's panel. */
  day: {
    plans: (n: number) => `${n} ${n === 1 ? "plan" : "plans"}`,
    free: "Free",
    needLook: (n: number) => `${n} ${n === 1 ? "plan needs" : "plans need"} a look`,
    holiday: (name: string) => `Public holiday: ${name}. Expect weekend timetables and busier places.`,
    skyHeading: "Set this day's sky",
    skyNotSet: "Not set",
    skyLegend: (date: string) => `Set the sky for ${date}`,
    skyHintSet: "The sky you set for this day. Tap it again to clear.",
    skyHint: "Set the sky to check each plan's fit",
    addToCalendar: (day: string) => `Add ${day} to my calendar`,
    nothingPlanned: (day: string) => `Nothing planned for ${day}`,
    emptyHint: "Any day works, weekdays included. Pick something and it lands here.",
    findIdeas: "Find ideas for this day",
  },
  /** Each plan on the selected day. */
  timeline: {
    label: (date: string) => `Plans for ${date}`,
    time: (start: string, end: string) => `${start} to ${end}`,
    meta: (area: string, duration: string) => `${area} · ${duration}`,
    fit: (fit: string, weather: string) => `${fit} when ${weather}`,
    noFit: "Set the sky to check the fit",
    earlier: (name: string) => `Start ${name} 30 minutes earlier`,
    later: (name: string) => `Start ${name} 30 minutes later`,
    /** Nudge buttons; "min" follows them. */
    minus30: "−30",
    plus30: "+30",
    min: "min",
    movedTo: (time: string) => `Moved to ${time}`,
    changeDay: (name: string) => `Change day or time for ${name}`,
    addToCalendar: (name: string) => `Add ${name} to my calendar`,
    remove: (name: string, day: string) => `Remove ${name} from ${day}`,
    removed: (name: string) => `Removed ${name}`,
  },
  /** The backup for a plan that doesn't suit the day's sky. */
  planB: {
    heading: "Plan B",
    meta: (area: string, fit: string, weather: string) => `${area} · ${fit} when ${weather}`,
    swapLabel: (name: string, backup: string, time: string) => `Swap ${name} for ${backup}, keeping ${time}`,
    swap: "Swap",
    swapped: (name: string) => `Swapped in ${name}`,
    moveHint: "Consider moving it to another day",
    changeDay: "Change day or time",
  },
  comingUp: {
    heading: "Coming up",
    when: (relative: string) => `· ${relative}`,
    /** Screen-reader suffix: the day's sky. */
    sky: (word: string | undefined) => `, ${word ?? "no sky set"}`,
    needsLook: ", needs a look",
  },
  share: {
    day: "Share this day",
    fortnight: "Share 14 days",
    nothing: "Nothing to share in the next 14 days yet",
    dayTitle: (day: string) => `My plans for ${day}`,
    fortnightTitle: "My plans for the next two weeks",
    /** Appended to the toast when the link had to drop days. */
    trimmed: (n: number) => ` (shared ${n} ${n === 1 ? "day" : "days"} to keep the link short)`,
    shared: (note: string) => `Shared${note}`,
    copied: (note: string) => `Link copied${note}`,
    copyPrompt: "Copy this link",
  },
  /** A plan someone shared by link. */
  shared: {
    eyebrow: "Shared with you",
    heading: (n: number) => `${n} ${n === 1 ? "day" : "days"} of plans`,
    empty: "This link has no plans we can show",
    sky: (word: string) => `· ${word}`,
    save: "Save to my plans",
    clashLabel: "You already have plans on these days",
    clash: (days: string) => `You already have plans on ${days}.`,
    merge: "Merge (keep mine, add theirs)",
    replace: "Replace those days",
    notNow: "Not now",
  },
} as const;
