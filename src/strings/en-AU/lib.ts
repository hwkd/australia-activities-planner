import { common } from "./common";

/** Visitor-facing text: lib (see src/strings/en-AU.ts). Text produced by the logic in src/lib, grouped by source file. */
export const lib = {
  dates: {
    /** Monday first (Australian week). Labels use the first three letters for short forms ("Sat 3 Oct"). */
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    /** "Sat 3 Oct" */
    shortLabel: (day: string, date: number, month: string) => `${day} ${date} ${month}`,
    /** "Saturday 3 October" */
    longLabel: (day: string, date: number, month: string) => `${day} ${date} ${month}`,
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    past: "Past",
    thisDay: (day: string) => `This ${day}`,
    nextDay: (day: string) => `Next ${day}`,
    inWeeks: (n: number) => `In ${n} weeks`,
    am: "am",
    pm: "pm",
  },
  holidays: {
    newYearsDay: "New Year's Day",
    newYearsDayHoliday: "New Year's Day holiday",
    australiaDay: "Australia Day",
    goodFriday: "Good Friday",
    easterSaturday: "Easter Saturday",
    easterSunday: "Easter Sunday",
    easterMonday: "Easter Monday",
    anzacDay: "Anzac Day",
    anzacDayHoliday: "Anzac Day holiday",
    kingsBirthday: "King's Birthday",
    labourDay: "Labour Day",
    christmasDay: "Christmas Day",
    boxingDay: "Boxing Day",
    christmasDayHoliday: "Christmas Day holiday",
    boxingDayHoliday: "Boxing Day holiday",
  },
  planDays: {
    /** "2 hrs", "1 hr", "2.5 hrs" */
    duration: (hours: number) => `${hours} ${hours === 1 ? "hr" : "hrs"}`,
    pluralDays: {
      mon: "Mondays",
      tue: "Tuesdays",
      wed: "Wednesdays",
      thu: "Thursdays",
      fri: "Fridays",
      sat: "Saturdays",
      sun: "Sundays",
    },
    /** Joins "Fridays", "Saturdays" and "Sundays" into "Fridays, Saturdays and Sundays". */
    listDays: (first: readonly string[], last: string) => `${first.join(", ")} and ${last}`,
    runsOnlyOn: (name: string, days: string) => `${name} runs on ${days} only.`,
    runsOnlyOnPickAnother: (name: string, days: string) => `${name} runs on ${days} only. Pick another day.`,
    overlapsWith: (name: string) => `Overlaps with ${name}.`,
    overlapsWithCanAdd: (name: string, time: string) => `Overlaps with ${name} (${time}). You can still add it.`,
    timePresets: { morning: "Morning", midday: "Midday", afternoon: "Afternoon", evening: "Evening" },
  },
  cost: {
    presets: { solo: common.groups.solo, date: common.groups.date, friends: common.groups.friends, family: common.groups.family },
    free: "Free",
    eachWay: (price: string) => `${price} each way`,
    adultFareWithFerry: (ferry: string) => `Adult fare from the city, est. Includes ${ferry} ferry, not on Opal`,
    adultOpalFare: "Adult Opal fare from the city, est.",
    /** A trip from the city that's only a walk. */
    noFare: "It's a walk from the city centre: no fare.",
    perCar: (price: string) => `${price} per car`,
    /** Starts the transport line's note (spec §6.6). */
    fromCity: "From the city centre.",
    capApplies: (kind: string, adult: string, child: string | null) =>
      `Opal's ${kind} cap applies: at most $${adult} per adult${child ? ` and $${child} per child` : ""} for the day.`,
    ferryNotCapped: (ferry: string) => `Includes ${ferry} ferry per adult, not on Opal, so it isn't capped.`,
    kidsHalf: "Kids 4–15 pay half. Under-4s ride free.",
    opalFaresFerry: "Opal fares + ferry, return",
    opalFares: "Opal fares, return",
    weekendFaresAssumed: "Weekend fares. Weekday fares can be higher.",
    weekdayFares: "Weekday fares. They can be higher at peak times.",
    holidayFares: (holiday: string) => `Public holiday (${holiday}): weekend fares.`,
    weekendFares: "Weekend fares.",
    entry: "Entry",
    kidsEach: (price: string) => `Kids ${price} each`,
    noTicket: "No ticket needed",
    perPersonShort: (price: string) => `${price} pp`,
    perPerson: (price: string) => `${price} per person`,
  },
  route: {
    direct: "Direct",
    changes: (n: number) => `${n} ${n === 1 ? "change" : "changes"}`,
    /** "35 min", "1 hr", "1 hr 20 min" */
    hoursMins: (h: number, m: number) => `${h} hr${m ? ` ${m} min` : ""}`,
    mins: (m: number) => `${m} min`,
    /** The way-in strip's label for a leg without a line. */
    modeName: { train: "Train", metro: "Metro", "light-rail": "Light rail", bus: "Bus", ferry: "Ferry", walk: "Walk" },
    /** One line on the map, in words ("T4 train", "bus 333", "walk"). */
    lineName: {
      train: (line?: string) => (line ? `${line} train` : "train"),
      metro: (line?: string) => (line ? `${line} metro` : "metro"),
      "light-rail": (line?: string) => (line ? `${line} light rail` : "light rail"),
      bus: (line?: string) => (line ? `bus ${line}` : "bus"),
      ferry: (line?: string) => (line ? `${line} ferry` : "ferry"),
      walk: () => "walk",
    },
    /** "On the map: T4 train, bus 333, walk; way back: bus 372" */
    onTheMap: (trip: string | null, back: string | null) =>
      `On the map: ${[trip, back && `way back: ${back}`].filter(Boolean).join("; ")}`,
    /** The Driving? note's cost: "Parking, 3 hrs: $15–30 per car, est." */
    driveCost: (what: string, price: string) => `${what}: ${price}, est.`,
    cantDrive: "You can't drive to this one.",
  },
  quickDays: {
    /** Monday first. */
    dayShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  discoverQuery: {
    groups: common.groups,
    durations: { any: "Any length", short: "Under 3 hrs", half: "Half day", full: "Full day" },
  },
  events: {
    category: "Event",
    range: (from: string, to: string) => `${from} – ${to}`,
    /** Calendar notes for an event. */
    directions: (url: string) => `Check times and tickets on the official page: ${url}`,
    onOnly: (name: string, dates: string) => `${name} is on ${dates} only.`,
    onOnlyPickAnother: (name: string, dates: string) => `${name} is on ${dates} only. Pick one of those days.`,
  },
  calendarExport: {
    reminders: { none: "None", "30m": "30 min before", "2h": "2 hours before", "1d": "1 day before" },
    direct: "direct",
    /** "By public transport from Central Station, ≈ 35 min, 1 change: … .\nGetting back: …" */
    directions: (total: string, changes: string, steps: string, back: string) =>
      `By public transport from Central Station, ${total}, ${changes}: ${steps}.\nGetting back: ${back}`,
    /** The event's location (spec §6.8), e.g. "Echo Point Lookout, Blue Mountains NSW" (placeOf in lib/calendarExport). */
    place: (where: string) => `${where} NSW`,
    /** What an area that isn't a locality ("City", "Inner City") reads as in a calendar location. */
    city: "Sydney",
    details: (url: string) => `Details: ${url}`,
  },
} as const;
