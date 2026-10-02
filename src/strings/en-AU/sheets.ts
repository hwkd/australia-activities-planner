/**
 * Visitor-facing text: sheets — Add to a day, Add to your calendar and the Undo toast (see src/strings/en-AU.ts).
 * Dates and times arrive already formatted (`shortLabel`, `clockLabel` and friends in src/lib/dates).
 */

const events = (n: number) => `${n} ${n === 1 ? "event" : "events"}`;

export const sheets = {
  /** Shared by both sheets. */
  sheet: {
    close: "Close",
  },

  addToDay: {
    title: "Add to a day",
    /** Title in edit mode (from My plans). */
    editTitle: "Change day or time",
    heading: "When are you going?",
    alreadyPlanned: (dates: string[]) => `Already planned: ${dates.join(", ")}`,
    quickDays: "Quick days",
    /** Accessible name of a quick-day chip. */
    quickDay: (day: string, holiday: string | null, notRunning: boolean, weather: string | null) =>
      `${day}${holiday ? `, ${holiday}` : ""}${notRunning ? ", not running" : ""}${weather ? `, ${weather}` : ""}`,
    /** Shown on a quick-day chip when the activity doesn't run that day. */
    closed: "Closed",
    /** Key under the quick days: each [date, holiday name]. */
    holidays: (days: [date: string, name: string][]) => days.map(([date, name]) => `${date}: ${name}`).join(" · "),
    pickDate: "Pick a date",
    calendarKey: "Struck-through days: not running. Dot: public holiday.",
    time: "Time",
    suggested: "Suggested",
    exactTime: "Exact time",
    suggestedStart: (name: string, time: string) => `Suggested start for ${name}: ${time}`,
    check: "Check",
    timeSpan: (start: string, end: string, nextDay: boolean) => `${start} – ${end}${nextDay ? " (next day)" : ""}`,
    /** e.g. "Great when sunny"; both words come from src/theme/tokens. */
    fitWhen: (fit: string, weather: string) => `${fit} when ${weather}`,
    noSky: (date: string) => `No sky set for ${date} yet`,
    holiday: (name: string) => `Public holiday: ${name}. Expect weekend timetables and busier places.`,
    confirm: {
      notRunning: (date: string) => `Not running on ${date}`,
      alreadyOn: (date: string) => `Already on ${date}`,
      noChange: "No change",
      move: (date: string, time: string) => `Move to ${date}, ${time}`,
      add: (date: string, time: string) => `Add to ${date}, ${time}`,
    },
    /** Undo toast after an edit. */
    movedTime: (time: string) => `Moved to ${time}`,
    movedDay: (date: string, time: string) => `Moved to ${date}, ${time}`,
    done: {
      title: "Added to a day",
      heading: (day: string) => `Added to ${day}`,
      addToCalendar: "Add to my calendar too",
      done: "Done",
      seeInPlans: "See it in My plans",
    },
  },

  export: {
    title: "Add to your calendar",
    targets: {
      apple: { label: "Apple Calendar", note: "Calendar file (.ics)" },
      google: { label: "Google Calendar", note: "Opens Google, one event at a time" },
      outlook: { label: "Outlook", note: "Calendar file (.ics)" },
    },
    whatToAdd: "What to add",
    scopeItem: "This plan",
    scopeAll: "Everything coming up",
    calendar: "Calendar",
    reminder: "Reminder",
    directions: "Include directions",
    directionsNote: "Adds how to get there to each event",
    events,
    preview: (n: number) => `Preview · ${events(n)}`,
    loading: "Loading…",
    empty: "Nothing to add yet. Plan something first.",
    eventTime: (date: string, start: string, end: string) => `${date}, ${start} – ${end}`,
    gettingThere: (text: string) => `Getting there: ${text}`,
    addToGoogle: "Add to Google",
    addToGoogleLabel: (title: string, date: string) =>
      `Add ${title} on ${date} to Google Calendar (opens in a new tab)`,
    footer: {
      google: "Google opens one event at a time and uses your default reminders.",
      apple: "Opens in Calendar on iPhone, iPad and Mac.",
      outlook: "Opens in Outlook on desktop, web and phone.",
      /** `label` is the reminder's label from src/lib/calendarExport, or null for none. */
      reminder: (label: string | null) => `${label ? `Reminder ${label}` : "No reminder"}.`,
      download: "Download calendar file",
      openGoogle: "Open in Google Calendar",
      /** Screen-reader suffix on a link that opens a new tab (leading space intended). */
      newTab: " (opens in a new tab)",
      googleMany: "Add each event to Google Calendar with the buttons above, one tab each.",
    },
    done: {
      google: "Opened in Google Calendar",
      file: "Calendar file ready",
      googleNote: "Save the event in the Google tab that opened.",
      fileNote: (fileName: string, n: number, directions: boolean) =>
        `Open ${fileName} to add ${events(n)} with times, place${directions ? " and directions" : ""}.`,
    },
  },

  undo: {
    undo: "Undo",
  },
} as const;
