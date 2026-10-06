/**
 * Visitor-facing text: layout — the page shell, tab bar, footer, error pages and the privacy page (see
 * src/strings/en-AU.ts). The product name is `SITE_NAME` in src/site.ts; titles take it as `site`.
 */
export const layout = {
  meta: {
    /** Default meta description. */
    description: "Find something good to do in Sydney for the weather and the people you're with.",
  },

  /** Shown on preview sites while some activities are drafts (spec §4.3). */
  draftBanner: (count: number) =>
    `Draft content: ${count} activities aren't verified yet. Fares, prices and times are estimates.`,

  tabs: {
    /** Accessible name of the tab bar's nav landmark. */
    label: "Main",
    discover: "Discover",
    plans: "My plans",
  },

  footer: {
    privacy: "Privacy",
    estimates: "Fares, prices and times are estimates; check before you go.",
    credits:
      "Public holidays from the NSW Public Holidays Act 2010. Transit routes and fares will come from Transport for NSW Open Data (CC BY 4.0). Font: Mona Sans by GitHub (SIL Open Font License).",
  },

  notFound: {
    title: (site: string) => `Page not found · ${site}`,
    eyebrow: "Sydney",
    heading: "We couldn't find that page",
    body: "It may have moved, or the link was cut short.",
    back: "Back to Discover",
  },

  error: {
    title: (site: string) => `Couldn't load right now · ${site}`,
    eyebrow: "Sydney",
    heading: "Couldn't load right now",
    body: "Something went wrong on our side. Your plans are saved on this device and are safe.",
    retry: "Try again",
    plans: "My plans",
  },

  privacy: {
    title: (site: string) => `Privacy · ${site}`,
    description: "What this app stores, sends and doesn't.",
    back: "← Discover",
    heading: "Privacy",
    sections: [
      {
        heading: "No accounts",
        body: "You don't sign in, and we don't collect your name, email or location.",
      },
      {
        heading: "Your plans stay on your device",
        body: "Plans, the sky you pick and your filters are saved in this browser's storage. Your plans never leave your device unless you share them; which sky and filters get picked is counted anonymously (see Analytics). Clearing your browser's site data removes what's saved.",
      },
      {
        heading: "Share links",
        body: "A share link contains the plans you chose to share: dates, start times, activities and the sky for each day. Nothing else. Anyone with the link can see those plans.",
      },
      {
        heading: "Calendar files",
        body: '"Add to my calendar" makes the file in your browser. Google Calendar links open Google\'s own page; what you save there is between you and Google.',
      },
      {
        heading: "Analytics",
        body: 'We use Cloudflare Web Analytics, which counts page views and how quickly pages load, without cookies. The app also counts a few anonymous events on our own server (for example "a plan was added" or "the Rainy sky was picked"), and the analytics data keeps only the event: never your IP address or anything that identifies you.',
      },
      {
        heading: "Security check",
        body: "Cloudflare, which hosts and protects this site, may set a cookie (cf_clearance) after a quick automatic check that you're not a bot. It's used for that check, not to track you.",
      },
      {
        heading: "Error reports",
        body: "If error reporting is on, crashes are sent to Sentry with the page address (no query string) and browser details, so we can fix them. No plans or personal data are included.",
      },
      {
        heading: "Estimates",
        body: "Fares, prices, times and opening hours are estimates for planning. Check with the venue and transport operator before you go.",
      },
    ],
  },
} as const;
