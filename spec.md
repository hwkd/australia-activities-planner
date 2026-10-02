# Spec: Australia Activities Planner (Sydney first)

> **2 October 2026: the real map replaces the schematic** (decision D15). Activity pages show each activity's places, walking line, facilities and the real route of the trip from Central on a real map (§3.2 item 3, §4.3, §11.2).

> **2 October 2026: Getting there is simplified** (decision D14). Each activity has one public transport trip from the city centre (Central Station), with the last stretch to the door and a short "Driving?" note. There's no origin picker, no Transport / Drive / Rideshare switch and no weekly fare calculation; the trip from the visitor's own street opens in Google Maps (§3.2 item 4, §4.3, §6.6).

> **2 October 2026: the product is now called Australia Activities Planner** (decision D9). It launches with Sydney only; more cities are Phase 3 (spec §12.5). Older notes may use the earlier working name, Sydney Weekend Finder.

> **1 October 2026: planning works on any day, not just weekends.** Plans are made per date with a start time, viewed in a calendar ("My plans"), and can be added to Apple Calendar, Google Calendar or Outlook. The product was later renamed Australia Activities Planner (open question 9, resolved).
>
> **1 October 2026: content lives in Cloudflare D1 and is edited in a custom admin (`/admin`).** Public pages are rendered on demand from D1 instead of being generated at build time, and Decap CMS was dropped (§4.5, §8).

Status: Phase 1 (MVP) built and tested locally; going live waits on owner steps (TRACKER.md M11.11) and verified content (§5). Phases 2 and 3 are outlined below and adapted to D1 · Related: [intent.md](intent.md), [PLAN.md](PLAN.md), [implementation-plan.md](implementation-plan.md), [TRACKER.md](TRACKER.md), [design/directions.md](design/directions.md), [prototype canvas](https://claude.ai/artifact/3DefgcrPvBH4JCFK3qrYJX)

---

## 1. Summary

A mobile-first web app (PWA) for newcomers to Sydney. Users choose the weather and who they're going with, get a ranked list of activities, look at an activity's details, and plan it for any day and time. My plans shows a calendar of what's planned, flags activities that don't suit that day's sky, offers a one-tap Plan B, and adds plans to the user's own calendar. The whole interface changes its look to match the weather. Plans are stored on the device and shared by URL. Visitors have no accounts in the MVP. The content team signs in to a private admin to write, check and publish activities (§4.5).

## 2. Glossary

| Term | Meaning |
|---|---|
| **Weather** | One of `sunny`, `cloudy`, `rainy`, `hot` (a max temperature of 30°C or more). |
| **Fit** | How well an activity suits a weather: `2` Great, `1` OK, `0` Skip. |
| **Group** | Who's going: `date`, `friends`, `family`, `solo`. "Anyone" in the UI means no group filter. |
| **Day** | A calendar date in Sydney time, YYYY-MM-DD (§6.4). Any day can be planned: weekdays, weekends and public holidays. |
| **Plan** | For each day: the planned activities with start times, and the sky set for that day (§4.4). |
| **Plan B** | A suggested swap for a planned activity whose fit for that day's sky is `0`. |
| **Theme** | The weather-reactive look of the UI (§3.5): background scene, colours and motion for the current weather. |

## 3. Screens

The layout is designed for a phone width of 360–430 px and must work up to desktop.
- **Phone:** two bottom tabs, **Discover** and **My plans**. The tab bar is hidden on Activity detail.
- **Desktop (≥ 1024 px):** My plans and activity pages have a top bar with Discover and My plans. Discover has no top bar (A · Sky Mode — Desktop): the left side (product name, headline, Set the sky, filters in a card), the results as tiles (two columns at 1440 px, more on wider screens, one column of cards below about 1180 px) and a **Coming up** rail: Open My plans, Share, and the next planned days, each in its own sky with its sky picker, its plans (remove, with Undo) and a Plan B where one doesn't suit the sky. Tablets (768–1023 px) keep the phone layout with the results as tiles. Activity detail opens as a full page over Discover, with **Back to results** and **Add to a day** in its top bar. My plans is its own page (§3.3).

### 3.1 Discover (`/`)

**Header:** the eyebrow "Sydney · {today, e.g. Thu 1 Oct}" and a headline that includes the current weather word (e.g. "Sydney's looking rainy."). The weather here is the sky the user is browsing for; each planned day keeps its own sky (§3.3).

**Filters**, all single-select and applied instantly:

| Control | Options | Default |
|---|---|---|
| Weather selector, "Set the sky" (4) | Sunny, Cloudy, Rainy, Hot 30°+ | Sunny (Phase 2: the forecast) |
| Group chips | Anyone, Date, Friends, Family, Solo | Anyone |
| "Free only" toggle | on / off | off |
| Duration chips | Any, Under 3 hrs, Half day, Full day | Any |

**Set the sky** (the weather selector):
- A small heading, "Set the sky", with "Re-ranks the list" on the right, above a strip of **four equal segments** in one rounded panel.
- Each segment is a real button (`aria-pressed`) with a line icon and its label. The icons are monoline and take the text colour, so they stay legible on every sky. Hot uses a thermometer, not a sun.
- The selected segment fills with a small version of its own sky and gets a light inner ring; its label turns bold. That is the only selection cue.
- Segment height is 68 px on phone and 72 px on desktop; the panel has 5 px inner padding and matching corner radii.
- Choosing a segment re-themes the app (§3.5) and re-ranks the list at once.
- Design reference: the "Set the sky" comparison artboard; Variant 2 (sky strip) was chosen on 1 Oct 2026.

Filters are kept in the URL query string (`?w=rainy&g=family&free=1&d=half`) so a view can be shared and survives the back button. The last-used filters are also saved to localStorage and restored when the app opens with no query string.

**Results:**
- The title is "{n} ideas for a {weather-adjective} day".
- The subtitle appears when anything is hidden: "{h} more are better saved for another day".
- Result list: activity cards, ranked as described in §6.1.
- Empty state: "Nothing fits those filters yet. Try another group or turn off Free only." with a **Reset filters** button.

**Activity card:**
- Category eyebrow, plus a fit pill for the current weather in the direction's wording (§6.3): "Perfect when rainy" or "Fine when rainy" in A · Sky Mode.
- The name, which is the link that opens the detail screen. The whole card is clickable except the quick-add buttons.
- A one-line blurb, then the area, duration label and cost tier.
- A strip with the fit for all four weathers (icon + label, e.g. Perfect/Fine/Skip), with the current weather outlined.
- **Add button** (real button, accessible name e.g. "Add Bondi to Coogee Coastal Walk to a day"). It opens the **Add to a day** sheet (§3.3) over Discover; the user stays on Discover afterwards. A short confirmation animation plays (§3.5).
- "Planned · Sat 3 Oct" (or "Planned · 2 days") if it's in the plan from today onwards.

### 3.2 Activity detail (`/a/[id]`)

The detail page answers four questions a newcomer has before committing: **Is it good today? Where exactly is it? How do we get there and back? What will it cost us?**

- **Layout:**
  - Phone: a single scrolling page with a sticky **Add to a day** footer.
  - Desktop: three columns, each of which scrolls independently. Info is on the left, the map in the centre, and getting there plus cost on the right.
- **Design reference:** the "Activity detail" artboards on the prototype canvas, one pair per direction (A, B and the v1 baseline). In each prototype, tapping a card opens this page; it shares the prototype's weather and plans. The A artboards use Add to a day and My plans (canvas Version 33) and the simplified Getting there (Version 36, D14); B and the v1 baseline still show the old weekend buttons and the origin and mode pickers.

**Sections, in order:**

1. **Hero**
   - A back control that returns to the previous screen (results or My plans) with its scroll position.
   - The category, name, area, and the fit callout for the current weather ("Perfect when sunny" + meter + note).
   - A **facts strip** with 4 key facts, e.g. Time · Distance (one way / loop) · Effort · Entry.
   - "Planned · Sat 3 Oct" (or "Planned · 2 days") if it's in the plan from today onwards.
2. **Weather check**
   - Four weather tiles showing each weather's rating.
   - Tapping a tile switches the app's weather, exactly like Set the sky: the page re-themes, the fit callout updates, and Back returns to a list re-ranked for that weather. One weather for the whole app is simpler than a preview that silently differs from the list.
   - Then `weatherNote`.
3. **Map:** a real map (MapLibre over our own OpenStreetMap tiles, §11.2) of the activity's `geo` (§4.3). There is no schematic map (D15, 2 Oct 2026).
   - **Layers:**
     - the base map, themed light or dark to match the sky
     - the activity's own walking line (e.g. the 6 km coastal path)
     - the trip from the city centre, drawn on its real route: each train, bus or ferry leg in its mode's colour **and** dash pattern, walks dotted
     - numbered points of interest (start, finish, beaches, pools, lookouts, paid attractions) as small numbered pins
     - facilities (toilets, cafés), as toggled.
   - **Toggles:** Facilities, and **Way back** (draws the return route for one-way trips).
   - **POIs:** a numbered list of real buttons below the map mirrors the pins. Selecting one (in the list or on the map) highlights both and shows a note, e.g. "Calm, sheltered inlet. Good for a snorkel."
   - **Lines in words:** a short line under the map names what's drawn (e.g. "On the map: T4 train, bus 333, walk; way back: bus 372"), so the map never relies on colour or sight alone.
   - **Credit:** "© OpenStreetMap contributors" on the map, and the source of the places and lines under it.
   - **When the map can't show** (no WebGL, offline before the tiles were cached, or no tiles uploaded): the numbered list, notes and the Google Maps directions link still work, with "The map can't be shown on this device. Everything on it is in the list."
   - The map's code loads when the map scrolls into view, never with the first paint on a phone.
4. **Getting there**
   - Public transport only, from one reference point: the city centre (Central Station). There's no origin picker and no travel-mode switch (D14).
   - **Summary:** "From the city centre", the total time, changes ("Direct", "1 change"), and the adult fare ("$4–6 each way, est.", "Adult Opal fare from the city, est.").
   - **Way in:** a one-line strip of the lines ridden, without the walks (e.g. **T4 › 333**, **City Circle › F1**). Hidden when the trip is a walk only.
   - **Last stretch:** the legs from the last train, bus or ferry to the door, each with a mode icon, line badge, instruction, optional detail and minutes (e.g. "Bus to Bondi Beach → Walk to the start at the south end"). This is the part map apps explain worst.
   - **Getting back:** always shown for one-way trips, e.g. "From Coogee, bus 372 goes back to Central…".
   - A reminder to tap on and off with Opal or a contactless card.
   - **Directions from where you are:** a link that opens Google Maps with public transport directions to `dest`, for live times and the visitor's own route (opens in a new tab).
   - **Driving?** a short note, not a mode: the drive time from the city, the parking (or toll, or park entry) cost per car with "est.", and the parking tips. An activity you can't drive to says why instead (e.g. "You can't drive to Cockatoo Island: it's car-free and only reached by ferry."). A **Rideshare** line appears only when the content has one, as a tip ("Ride up, walk down through the zoo, and take the ferry home") or a warning ("Not practical: it's a long, expensive ride").
5. **What it'll cost**, an estimate calculator (§6.6):
   - **Group presets** (Solo, Date, Friends, Family), defaulting to the Discover group filter, plus **adult and child steppers**.
   - **Breakdown:** transport (public transport from the city centre, return), entry, and **optional extras** toggles (e.g. lunch, pool entry, snorkel hire). Parking stays in the Driving? note.
   - A **total** and **per person** figure, with a clear "Estimates for planning only…" disclaimer and the date prices were last checked.
6. **Plan your visit:** best time to go, hours, what to bring (chips), facilities, accessibility, and safety notes.
7. **Newcomer tip:** `newcomerTip`, shown in a highlighted card.
8. **Heads up:** booking required (`bookingRequired`, e.g. the Opera House tour), which days it runs (`days`, e.g. Carriageworks is Saturday only), and seasonal notes, if any apply. Links, if the activity has any.
9. **Make a day of it:** 2–3 nearby pairings, with why and how far.
   - Every pairing points to another activity in the list (`activityId`, §5), and tapping it opens that activity's page, scrolled to the top.
   - The group size carries over. The selected map point, extras and Way back reset.
   - Back still returns to the screen the user came from, not the previous activity.
   - Openable pairings show an arrow. A pairing without an `activityId` is shown as plain text (none in the current content).
10. **Add to a day:** a sticky footer button on phone and a top-bar button on desktop. It opens the **Add to a day** sheet (§3.3). If the activity is already planned, the button reads "Planned · Sat 3 Oct" and the sheet also lists those dates. An activity can be planned on several days, but only once per day.

**Not yet confirmed:** the Map, Getting there (with Driving?), What it'll cost, Plan your visit and Access sections each end with a dashed **Not yet confirmed** note listing the activity's `unconfirmed` entries for that section (§4.1), with "We couldn't confirm these with an official source. Check before you rely on them." Nothing shows when there are none.

**Motion:**
- When an activity page opens, the last-stretch legs slide in, staggered.
- The map fits the activity's places and walking line; the trip from the city may run off the edge (zoom out to follow it).
- Reduced motion shows everything instantly.

### 3.3 My plans (`/plan`)

Design reference: the "A · Plan any day" artboards (My plans calendar on phone and desktop, Add to a day).

**Calendar:**
- Month view, weeks starting on Monday, from the current month to 6 months ahead; ‹ › month buttons and a **Today** button.
- Each day is a button (≥ 44 px) whose accessible name says the date, any public holiday, how many plans, the sky if set, and "needs a look" when a plan has a warning.
- A day shows: its number, a ring for today, plan dots (up to 3; desktop shows up to 2 plan chips with time and name, then "+N more"), a small sky badge when a sky is set, a flag for a public holiday, and a warning mark. Weekend columns are subtly emphasised. Past days are dimmed and read-only.
- Selecting a day crossfades the page to that day's sky (unset reads as the default theme).

**Selected day** (below the month on phone, in a side panel on desktop):
- "This Saturday" style relative label, the full date, the public-holiday note if any ("Public holiday: Labour Day. Expect weekend timetables and busier places.").
- **Set this day's sky:** a compact four-segment version of Set the sky (§3.1).
- **Timeline** of the day's plans, ordered by start time (§6.7). Each plan shows start–end time, name, area and duration, a fit meter and label for the day's sky ("Set the sky to check the fit" if none), and:
  - a warning row when it overlaps another plan, or is planned on a day it doesn't run ("Carriageworks Farmers Market runs on Saturdays only.")
  - **Plan B** with **Swap** when its fit is `0` (§6.2); swap keeps the start time
  - controls: 30 min earlier, 30 min later, **Change day or time** (opens the Add to a day sheet in edit mode), **Add to my calendar** (this plan only), remove (with Undo, §6.7).
- **Add {Sat 3 Oct} to my calendar** for the whole day.
- Empty day: "Nothing planned for {Sat 3 Oct}" with **Find ideas for this day**, which opens Discover with that day's sky applied and remembers the date for the next Add.
- **Coming up:** the next planned days from today (up to 5), each selecting that day.
- **Share:** shares a day or the next 14 days (§6.5) with the Web Share API, falling back to copying the link with a "Link copied" toast.

**Add to a day sheet** (from a card, the activity page, or a plan in edit mode):
- **Quick days:** Today, Tomorrow, the next Saturday and Sunday, and the next public holiday within 14 days. Each chip shows the weekday and date, and the sky if one is set.
- **Pick a date:** a mini month; past days are disabled; days the activity doesn't run (`days`, §4.1) are struck through, say "Closed", and can't be confirmed.
- **Time:** Suggested (the activity's `suggestedStart`), Morning 9am, Midday 12pm, Afternoon 2pm, Evening 6pm, or an exact time. The resulting time span is shown ("8:30am – 11am").
- **Check:** the fit for that day's sky, plus warnings for overlaps (non-blocking) and closed days (blocking).
- **Confirm:** "Add to Sat 3 Oct, 8:30am". After adding: **Add to my calendar too**, **Done**, and **See it in My plans**.

**Add to your calendar** (sheet on phone, dialog on desktop), see §6.8:
- **What:** this plan, this day, or everything coming up.
- **Calendar app:** Apple Calendar or Outlook (a downloadable `.ics` file), or Google Calendar (opens Google's "add event" page, one event per link, and says so).
- **Reminder** (file only): none, 30 min, 2 hours or 1 day before. **Include directions** adds the getting-there text to the notes.
- A **preview** of each event (title, date and time, place, first line of directions) before adding, then a done state.

### 3.4 Shared plan (`/plan?s=…`)

Opening a share URL shows those days read-only, with **Save to my plans**.
- If the recipient already has plans on any of those days, they choose **Merge** (adds items that aren't already on that day, keeping their times) or **Replace those days**.
- An invalid or unknown activity ID, an invalid date or time, or a date before today is dropped without an error.
- Old weekend links (v1, §6.5) still open and are converted.

### 3.5 Visual design and motion (weather-reactive UI)

The interface *is* the forecast: the selected weather changes the whole look of the app, not just the list. Two variants of this concept are on the prototype canvas (see [design/directions.md](design/directions.md)):
- **A · Sky Mode:** full-bleed animated skies with frosted-glass panels. **This is the one being built** (open question 1; tracker D1).
- **B · Harbour Window:** an illustrated harbour scene over solid, weather-tinted surfaces.

The requirements below apply whichever variant ships.

- **One theme per weather.** Each weather defines:
  - background scene
  - surface
  - text and muted text
  - accent
  - fit-pill colours
  - border and shadow tokens.
  Tokens live in one theme map, `themes[weather]`, and components read them. No component hard-codes a per-weather colour.
- **Theme changes follow state.**
  - Changing the Discover weather re-themes Discover and the detail screen.
  - My plans follows the selected day's sky; the Add to a day sheet follows the sky of the date being picked.
- **Transition:** the switch between themes crossfades or morphs over 600–1,200 ms, using only `opacity`, `transform` and colour transitions. It must never block input, and the list re-ranks immediately.
- **Signature moments** (and only these carry expressive motion):
  1. Changing the weather: the scene changes and the headline weather word animates in.
  2. Adding to a day: a confirmation animation plays in the Add to a day sheet and on the card.
  3. Plan B appears: the banner animates in.
  4. Screen entrances: cards stagger in.
- **Ambient loops** (clouds, rain, glints) are subtle, sparse, and use only `transform` and `opacity`. Rain density stays moderate. Loops pause when the tab is hidden.
- **Reduced motion:** with `prefers-reduced-motion: reduce`:
  - ambient loops stop
  - theme changes become instant or very short fades
  - entrances don't animate.
  Nothing depends on motion to be understood.
- **Contrast in every theme:** every text style meets WCAG AA (4.5:1 body, 3:1 for 24px and larger) in all four themes, including text over scenes and translucent panels. The theme map is covered by an automated contrast test.
- **Performance:** a theme switch keeps 60 fps on a mid-range phone (e.g. a 3-year-old Android). Scenes are CSS/SVG, not video, and add no more than 40 KB (gzipped) to the first load.
- **No photos required:** the design must look finished without activity photos. Photos, when added, sit in defined slots.
- **Type stays put.** The weather changes the scene, colours, surfaces and shadows, never the typography: font, size, width, weight and letter spacing are the same in every weather, so text doesn't reflow or shift when the sky changes. (A weather-driven font width was tried on A and removed on 1 Oct 2026.)
- **Fonts per direction:** A · Sky Mode uses Mona Sans for display and text, at fixed widths; B · Harbour Window uses Unbounded and Onest. The evaluation behind A's choice is in [design/directions.md](design/directions.md).

## 4. Data model

### 4.1 Activity

The source of truth is the `activities` table in Cloudflare D1, edited in the content admin (`/admin`). Every save and publish is validated with the Zod schema; nothing invalid can be saved or published. Each activity has a draft and a published copy, and every change is kept as a revision.

```ts
type Weather = "sunny" | "cloudy" | "rainy" | "hot";
type Fit = 0 | 1 | 2;
type Group = "date" | "friends" | "family" | "solo";
type Cost = "Free" | "$" | "$$" | "$$$";   // $ < ~$20pp, $$ < ~$60pp, $$$ ≥ ~$60pp

interface Activity {
  id: string;                         // kebab-case, unique, stable (used in URLs)
  name: string;
  city: "sydney";                     // Phase 3: more cities (§12.5)
  area: string;
  category: Category;                 // see 4.2
  blurb: string;                      // ≤ 90 chars, shown on cards
  weatherFit: Record<Weather, Fit>;
  weatherNote: string;                // ≤ 160 chars, explains the ratings
  goodFor: Group[];                   // ≥ 1
  duration: { label: string; minHours: number; maxHours: number };
  cost: Cost;
  gettingThere: string;               // public-transport first, ≤ 240 chars
  newcomerTip: string;                // ≤ 240 chars
  safetyNotes?: string[];
  bookingRequired?: boolean;
  days?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];   // weekdays it runs; omit = every day
  suggestedStart: string;             // HH:MM Sydney time, the default start in Add to a day
  seasonal?: { months: number[]; note: string };   // 1–12
  location: { lat: number; lng: number };
  links?: { label: string; url: string }[];
  photo?: { src: string; alt: string; credit: string };
  access?: AccessInfo;                // Phase 2 (§11.6)
  status: "draft" | "verified";       // draft = written but not yet checked against official sources
  lastVerified: string | null;        // YYYY-MM-DD; null while status is "draft"
  unconfirmed?: {                     // details no official source could confirm when it was checked
    section: "map" | "gettingThere" | "driving" | "cost" | "visit" | "access";
    note: string;                     // one plain sentence, ≤ 200 chars, e.g. "Parking prices in The Rocks."
  }[];
}
```

An activity can be `verified` with `unconfirmed` entries: the field keeps the best estimate, and the activity page shows each note as **Not yet confirmed** in its section (§3.2) until someone confirms it and the entry is removed. Phase 3 contributions (§12, M21) are the intended way for visitors to supply the missing facts.

### 4.2 Categories

`coastal-walk`, `bushwalk`, `beach`, `swimming`, `ferry`, `lookout`, `landmark`, `museum`, `gallery`, `market`, `food`, `neighbourhood`, `wildlife`, `garden`, `history`, `water-sport`, `event`

### 4.3 Getting there, map, cost and visit data

Each activity gains these fields: `facts: { k: string; v: string }[]` (the four quick facts under the hero), `routes: GettingThere`, `geo: ActivityMap`, `costs: CostInfo`, `visit: VisitInfo` and `pairings: Pairing[]`. They're part of the same activity record in D1 and are validated with the same Zod schema.

```ts
type LegMode = "walk" | "train" | "bus" | "ferry" | "metro" | "light-rail";
type Money = [min: number, max: number];              // AUD, estimates

interface Leg { mode: LegMode; line?: string; title: string; detail?: string; mins: number }

interface GettingThere {
  dest: { lat: number; lng: number; label: string };  // where directions point (e.g. the start of a walk)
  pt: {                                               // public transport from the city centre (Central Station)
    total: string; changes: number;
    fare: Money;                                       // adult Opal, each way
    nonOpal?: Money; nonOpalChild?: Money;             // legs not on Opal (e.g. private ferries), each way
    legs: Leg[];                                       // the whole trip; the way-in strip and the last stretch are derived from it
    back: { text: string };                            // how to get home (required for one-way trips)
  };
  drive: { total: string /* from the city centre */; perCar: Money; perCarLabel: string; notes: string[] } | null;   // the Driving? note
  ride?: string;                                       // optional rideshare tip or warning, one sentence
  unavailable?: { drive?: string };                    // required when drive is null: why you can't drive there
}

type LngLat = [lng: number, lat: number];
interface MapLeg { mode: "walk" | "train" | "bus" | "ferry" | "metro" | "light-rail"; line?: string; coords: LngLat[] }

interface ActivityMap {                                // the real map (§3.2 item 3)
  places: { n: number; name: string; type: "start" | "end" | "beach" | "pool" | "lookout" | "food" | "stop" | "paid"; note: string; lng: number; lat: number }[];
  trail?: LngLat[][];                                  // the activity's own walking line(s)
  facilities?: { kind: "toilet" | "cafe"; lng: number; lat: number }[];
  trip?: { legs: MapLeg[] };                           // the trip from Central, on its real route
  back?: { legs: MapLeg[] };                           // the way back (one-way trips)
  source: string;                                      // where it came from, e.g. "OpenStreetMap contributors (ODbL), Transport for NSW (CC BY 4.0)"
  checked: string | null;                              // YYYY-MM-DD when an editor checked it; null while generated
}

interface CostInfo {
  entry: Money;                                        // per person; [0,0] = free
  entryChild?: Money;
  extras: { id: string; label: string; per: Money; on: boolean /* default */ }[];
  pricesChecked: string | null;                        // YYYY-MM-DD; null while status is "draft"
}

interface VisitInfo {
  bestTime: string; hours: string; bring: string[]; facilities: string[]; access: string; safety: string[];
}

interface Pairing { name: string; why: string; dist: string; activityId: string }   // must name an activity in the list (§5)
```

- **Derived, not stored:** the way-in strip is the trip's train, bus and ferry legs (line badge, or the mode name when there's no line). The last stretch runs from the last of those legs to the end; a walk-only trip shows its walk.
- **Fares:** one adult Opal fare per activity, for the trip from Central, entered by the editor and checked against the Transport for NSW trip planner during review. There's no fare calculator: on Friday to Sunday and public holidays the daily cap (§6.6) limits most day trips, so the estimate rarely depends on the exact fare.
- **Checking the trip (optional):** a weekly GitHub Action can ask the Transport for NSW Trip Planner API for each published activity's trip from Central (29 calls at 29 activities) and open a pull request flagging changed lines, changes or times, and any map that shows lines or stops the trip no longer uses. It never edits content. It's an editor aid for Sydney, not a launch requirement; other cities' trips are checked by hand.
- **Non-Opal legs:** private services such as the Cronulla–Bundeena ferry don't take Opal and aren't capped. Their fares live in a small hand-kept operator table and are stored as `nonOpal` / `nonOpalChild`.
- **Driving and rideshare:** hand-kept text, checked during review: the drive time from the city, the parking (or toll, or park entry) cost per car and tips, and an optional rideshare sentence. There's no open parking-price data and no public rideshare price API, so neither is computed, and rideshare is never priced.
- **Not Google:** Google's Routes and Places terms don't allow storing their results in our own content, so they are not used for any of the above. The **Directions from where you are** link only opens Google Maps; nothing comes back. See `feasibility.md`.
- **Why one trip from the city (D14):** routes from three starting points meant three trips per activity to check (87 at 29 activities; the first live check flagged 75 for review), a fare calculator per fare system, and a trip planner per state, and only NSW offers a hosted one. A trip from the city plus the last stretch is written once per activity, works in any city, and covers what newcomers can't get from a map app. The door-to-door trip is Google Maps' job.
- **Maps (D15):** each activity's map is real-world data, not a drawing. A script (`scripts/map/build-geo.mjs`) proposes it from open data: places found by name in OpenStreetMap (or, where a name can't be found, estimated and marked for the editor), the walking line routed between nearby places, toilets and cafés within 100 m, and the trip from Central and the way back from the Transport for NSW Trip Planner (the journey whose lines match the written route). In the admin, editors drag the numbered pins on a real map, rename them and edit notes, paste replacement lines as GeoJSON, and set `checked`. Walking lines inside national parks should come from NSW National Parks data (CC BY 4.0) where it differs.
- **Content rule:** the trip is written for a Saturday late-morning departure from Central and checked in the Transport for NSW trip planner. A person also checks entry prices, hours and parking against the venue's own site before `lastVerified` and `pricesChecked` are set.
- **Draft content:** all 29 Sydney activities (seeded from `db/seed/activities/`) are currently `status: "draft"`. Times, fares, prices, route numbers and opening hours are estimates. Production (`CONTENT_MODE=published`) refuses to publish a draft, so the live site only ever shows verified activities. Preview environments (`CONTENT_MODE=preview`) can publish drafts and show a "draft content" banner.

### 4.4 Plan (client state)

```ts
interface PlannedItem { id: string; start: string }   // start = HH:MM, Sydney wall-clock time

interface Plan {
  v: 2;
  days: Record<string, {                // key = date, YYYY-MM-DD in Sydney time
    sky?: Weather;                      // the sky the user set for that day
    skySource: "manual" | "auto";
    items: PlannedItem[];               // shown sorted by start (§6.7); one entry per activity per day
  }>;
  updatedAt: string;
}
```

- A planned item lasts `plannedHours` = the midpoint of `minHours` and `maxHours` rounded to the nearest half hour, or `minHours` when `maxHours` is 6 or more (full-day activities).
- Stored in localStorage under `swf.plan.v2`. Every read and write is wrapped in try/catch, and the app still works, holding the plan in memory only, if storage isn't available. `skySource` is always `"manual"` in the MVP; Phase 2 uses `"auto"` (§11.1).
- **Past days** stay visible read-only for 30 days, then are pruned. (This replaces the old "Last weekend" history.)
- **Migration from v1** (`swf.plan.v1`, weekend plans): v1's `sat` items go on the `weekendOf` date and `sun` items on the day after; each item gets its activity's `suggestedStart`, moved to start after the previous item ends if they'd overlap; the forecast becomes `sky`. v1 is deleted only after v2 is written successfully.

### 4.5 Content storage and the admin

**Storage (Cloudflare D1):**
- `activities`: one row per activity with the **draft** (what editors work on) and the **published** copy (what visitors see), plus small derived copies for cards and calendar export, a `version` number, and who changed or published it and when.
- `revisions`: every create, save, publish, unpublish, restore and import, with the full activity and who did it.
- `users`, `sessions`, `invites` and `login_attempts` for the admin. These are content-team accounts only; visitors never have one in Phases 1–2.
- Schema changes are SQL migrations in `db/migrations/`. `db/seed/activities/*.json` only seeds a fresh database (local development, tests and the first deploy).

**Public site:** Discover, activity pages, My plans and the export data are rendered on each request from the **published** copies. Unpublished activities return the 404 page. A pairing links only to a published activity and otherwise shows as plain text. Signed-in editors can add `?preview` to an activity page to see its draft.

**Admin (`/admin`):**
- **Accounts:** email and password (at least 12 characters), with **owner** and **editor** roles. Owners invite people by one-time link (valid 7 days), issue reset links (valid 1 day), change roles and disable accounts; the last owner can't be removed. There is no self-sign-up and no email sending: links are passed on by hand. The first owner is created from the command line.
- **Activities:** a list with search and filters (status, published state, category), **New activity** (blank or a copy of another), and a structured editor for every field in §4.1 and §4.3, including a map editor. Fields are checked as the editor types.
- **Save, preview, publish:** Save keeps the draft; the public site doesn't change. Publish makes the saved draft live at once. Unpublish takes it off the site. History lists every revision; **Restore as draft** brings one back.
- **Checks:** nothing that fails the schema can be saved. Cross-activity problems (a pairing to an unknown activity, a route that uses a line the map doesn't have) are shown as warnings on save and block publishing. Production refuses to publish a draft. An activity can't change its `id`, and can only be deleted (owner) when it's unpublished and nothing pairs with it.
- **Two editors:** if someone else saved the same activity first, the save is refused with "Someone else changed this activity" and the editor reloads (optimistic locking on `version`).
- **Security:** passwords are hashed (PBKDF2-SHA256, 100,000 iterations); sessions are random tokens stored hashed, in an HttpOnly, SameSite=Strict cookie (Secure over HTTPS) that lasts 7 days; sign-in pauses after 5 failures per email or 20 per IP address in 15 minutes; every change checks the request's Origin; admin pages are never cached, can't be framed, and have a strict Content Security Policy.

## 5. Content requirements

- **Launch set:** at least 40 Sydney activities. At least 10 must have `rainy: 2`, at least 10 must be `Free`, and every group must have at least 12 activities with fit ≥ 1 in every weather.
- **Ratings rubric:**
  - **Great (2):** the weather makes the activity better, or doesn't affect it at all (indoors).
  - **OK (1):** it still works, but with a real downside (exposure, crowds, reduced views), and `weatherNote` must say what that is.
  - **Skip (0):** unsafe, miserable, or pointless in that weather (slippery clifftops, fogged-out lookouts, a beach in the rain).
- **Review:** each activity is checked against official sources (Transport for NSW, NSW National Parks, the venue's own website) before `lastVerified` is set. An activity not checked in the last 6 months is flagged "Needs re-checking" in the admin's activity list.
- **Voice:** second person, plain English, short sentences, Australian spelling. Use no slang without explaining it.
- **Pairings:** every "Make a day of it" pairing names an activity that is in the list and carries its `activityId`; the admin won't publish an activity with a pairing that points nowhere (§4.5). A place worth pairing that isn't an activity yet gets added as one (this is how Clovelly, Coogee, North Head, Cronulla, Carriageworks, Parramatta and Leura joined).
- **Days and booking:** activities that run only on certain days set `days`, and those that need a ticket booked ahead set `bookingRequired`, so the detail page's Heads up section can show them.
- **Current status:** 29 Sydney activities, all `status: "draft"` (§4.3); the launch target above is 40. Gaps against the mix: 6 activities rate `rainy: 2` (need 10), and solo has 10 activities fit for rain (need 12).

## 6. Logic

### 6.1 Ranking (Discover)

1. **Filter:** keep an activity if all of these hold:
   - the group is Anyone, or `goodFor` includes the group
   - Free only is off, or `cost === "Free"`
   - the duration filter matches (Under 3 hrs: `maxHours ≤ 3`; Half day: `minHours ≤ 5 && maxHours ≥ 2`; Full day: `maxHours ≥ 5`)
   - if `seasonal` is set, the current month (or the month of the day being planned, when Discover was opened from a day in My plans) is in `seasonal.months`
   - `days` doesn't filter Discover; it's enforced when choosing a day (§3.3)
2. **Hide:** activities with `weatherFit[w] === 0`. Show how many were hidden.
3. **Sort:** by `weatherFit[w]` (high to low), then activities not planned from today onwards first, then `name` (A–Z).

Ranking must be deterministic. The same inputs always give the same order.

### 6.2 Plan B

For a planned item `x` on day `d` whose fit for `d.sky` is `0`:

1. The candidate pool is every activity with `weatherFit[sky] === 2` that runs on `d` (`days`), isn't planned on any day from today onwards, and hasn't already been suggested as a Plan B elsewhere. Items are processed in date order, then by start time.
2. Keep only candidates that share at least one `goodFor` group with `x`.
3. Score each candidate:
   - +3 if the `area` is the same
   - +2 if both are indoor or both are outdoor (an activity with `weatherFit.rainy === 2` counts as indoor)
   - +1 if the durations overlap
   - +1 if `cost` is the same or lower
4. Pick the highest score. Ties go to the alphabetically first `name`.
5. If nothing is left, show "Consider moving it to another day" with **Change day or time**.

Plan B suggestions are recalculated whenever the plan or a day's sky changes. They are never stored. A swap keeps the original start time.

### 6.3 Fit labels

| Fit | Pill | Detail line |
|---|---|---|
| 2 | Great | Ideal conditions |
| 1 | OK | Doable, with caveats |
| 0 | Skip | Save it for another day |

A design direction may reword the three labels, but uses one wording on every screen: A · Sky Mode uses **Perfect / Fine / Skip**; B and the v1 baseline use **Great / OK / Skip**.

Warning banner text for each weather:
- sunny: "Not ideal in full sun."
- cloudy: "Not ideal under heavy cloud."
- rainy: "Not great in the rain."
- hot: "Not great in the heat."

### 6.4 Dates, times and public holidays

- **Time zone:** every date and time is Sydney wall-clock time (`Australia/Sydney`), computed with a time-zone-aware library (date-fns-tz), never from the device's own time zone. "Today" is today in Sydney.
- **Range:** the calendar runs from today to 6 months ahead. Days before today are past (§4.4).
- **Daylight saving:** Sydney clocks go forward on the first Sunday in October (4 Oct 2026, 2am → 3am) and back on the first Sunday in April. Start times are stored as wall-clock times; end times and durations are computed in the time zone, so a plan across a change keeps its real length. A start time that doesn't exist (2:00–2:59am on the change day) moves to 3:00am. Calendar export uses `TZID=Australia/Sydney` (§6.8).
- **Public holidays:** NSW public holidays are calculated from the rules in the Public Holidays Act 2010 (including the extra weekday when New Year's Day, Anzac Day, Christmas or Boxing Day fall on a weekend, and Australia Day moving to the Monday), with a short list for one-off declared holidays. The calculation is tested against the NSW Government's published table. (The data.gov.au holiday dataset is inactive, with nothing after 2020.) The August Bank Holiday isn't a public holiday and isn't shown. A holiday shows its name on the day, appears as a quick day in Add to a day when it's within 14 days, and uses the weekend Opal cap (§6.6).

### 6.5 Share URL

`/plan?s=<base64url(JSON)>`, where the JSON is `{"v":2,"d":{"2026-10-03":{"s":"sunny","i":[["bondi-coogee","08:30"],["rocks-markets","13:00"]]},"2026-10-07":{"i":[["chinatown","18:30"]]}}}`.

- A share covers one day or the next 14 days. Items are listed by start time.
- The URL contains no personal data.
- The link must stay under 2,000 characters. The app enforces this with at most 8 items per day and 14 days per link; if a share would exceed it, it shares fewer days and says so.
- v1 links (`{"v":1,"w":<Saturday>,"sat":…,"sun":…}`) still open: they're converted as in §4.4.

### 6.6 Cost estimate

- `people = adults + kids`.
- **Transport** is always public transport from the city centre, per person for the day, then summed:
  - adult: `min(fare × 2, cap.adult) + nonOpal × 2`
  - child: `min(fare, cap.child) + (nonOpalChild ?? nonOpal × 0.5) × 2` (kids 4–15 pay half; under-4s ride free and aren't counted)
  - `cap` is the Opal daily cap for the day being planned: **Friday, Saturday, Sunday and public holidays $9.65 adult, $4.80 child; Monday to Thursday $19.30 adult, $9.65 child** (as of 30 Sep 2026). The caps live in one config value and are updated with the July fare change.
  - The day being planned is the date chosen in Add to a day, or the selected day when the activity page was opened from My plans. With no date, the estimate uses the weekend cap and says "Weekend fares. Weekday fares can be higher."
  - Weekday estimates may also be higher at peak times; the fare range already allows for this, and the estimate says so on weekdays.
  - The transport line is rounded to whole dollars and its note starts "From the city centre." Non-Opal legs are never capped.
  - Driving and parking are not part of the total; the Driving? note shows the parking cost per car (§3.2 item 4).
- **Entry:** `entry × adults + (entryChild ?? entry) × kids`.
- **Extras:** each switched-on extra costs `per × people`.
- **Total:** each line is rounded to whole dollars, so the breakdown adds up; the total is the sum of the min and max ends separately, shown as "$124–184". Per person is `total / people`, rounded to whole dollars. A total of $0 shows as "Free".
- **Caveats:** the UI never shows a single exact price. It always shows a range marked "est." with the disclaimer, next to the number itself (a disclaimer in small print elsewhere doesn't count). For public transport, when the cap applies it says so ("Opal's weekend cap applies: at most $9.65 per adult for the day", or the weekday cap on Monday to Thursday), and a non-Opal leg is called out ("Includes $9.40 ferry, not on Opal").

### 6.7 Times and order

- A day's plans are always shown in start-time order; there's no manual reordering.
- **Change the time:** 30 min earlier or later (between 6:00am and 10:00pm), or set an exact time in the Add to a day sheet in edit mode.
- **Change the day:** the same sheet in edit mode; the plan keeps its time unless the user changes it.
- **Overlaps** are allowed but flagged on both plans ("Overlaps with …").
- **Days it doesn't run:** can't be chosen in the sheet; a plan that ends up on such a day (e.g. from an old share link) is flagged.
- An activity can be planned only once per day; adding it again to that day offers **Change time** instead.
- **Undo:** every removal, time change and day change shows a toast with **Undo** for 5 seconds.

### 6.8 Add to your calendar

- **Event fields:** title = activity name; start and end from §4.4 and §6.4; location = the activity's meeting point plus "Sydney NSW"; notes = the getting-there summary when **Include directions** is on, then a link back to the activity page; reminder as chosen.
- **`.ics` file** (Apple Calendar, Outlook): one `VCALENDAR` with a `VTIMEZONE` for `Australia/Sydney` and one `VEVENT` per plan, `DTSTART;TZID=Australia/Sydney` with a `DURATION` (not a wall-clock `DTEND`, which would be ambiguous in the repeated hour when clocks go back), a stable `UID` per date and activity (so re-adding updates rather than duplicates), and a `VALARM` for the reminder. Generated in the browser; file name `sydney-plans-{date or "upcoming"}.ics`.
- **Google Calendar:** a `calendar.google.com/calendar/render?action=TEMPLATE` link per event with `dates` in local time and `ctz=Australia/Sydney`. Google uses the user's default reminders; the sheet says so. More than one event shows one link per event.
- No calendar account access or permissions are requested; nothing is synced back.

## 7. Non-functional requirements

- **Performance:** Lighthouse mobile score of 90 or more for Performance and Accessibility. First load under 150 KB of JS (gzipped), plus up to 40 KB for theme scenes (§3.5). Pages are rendered on demand from D1 at the edge; the server response (time to first byte) should stay under 300 ms at the 75th percentile from Sydney. The admin's code never loads on public pages.
- **Offline:** once visited, the app shell and all published activity pages are cached by a service worker: static files are precached, Discover and My plans are cached after the first visit, and the activity pages are fetched in the background when the browser is idle (skipped when the browser asks to save data). Pages are network-first, so a connected visitor always sees the latest published content. The plan works offline. The admin is never cached.
- **Accessibility:** WCAG 2.2 AA.
  - Controls are real `<button>` and `<a>` elements.
  - Toggles use `aria-pressed` and tabs use `aria-current`.
  - Touch targets are at least 44×44 px, and text contrast is at least 4.5:1 in every weather theme.
  - Fit is never shown by colour alone; every rating has a text label.
  - Every weather icon has an accessible name.
  - Every calendar day, time control and sheet is reachable and operable by keyboard; sheets and dialogs trap focus and return it on close.
  - Motion respects `prefers-reduced-motion` (§3.5).
- **Internationalisation:** all visitor-facing UI text goes in a strings file (`src/strings/en-AU.ts`), and dates and numbers use `Intl` with `en-AU`. There's no translation in the MVP (see §12.4). The admin is English-only and is exempt.
- **Privacy:** no visitor accounts and no tracking cookies. The only cookie is the admin session cookie, set only for signed-in content editors (strictly necessary). Analytics are cookieless, aggregate-only, and support custom events (Plausible, §8). The events tracked are:
  - `filter_change`
  - `activity_view`
  - `plan_add` (with source: `card`, `detail` or `calendar`, and whether the day is a weekend, weekday or public holiday)
  - `plan_change` (time or day)
  - `plan_b_swap`
  - `plan_share`
  - `calendar_export` (with target: `ics` or `google`, and scope)
  These measure the success signals in intent.md: plans created, share rate, Plan B use and return visits.
- **Browsers:** the last two versions of Safari iOS, Chrome Android, Chrome, Safari, Firefox and Edge. The end-to-end tests run in Chromium, WebKit and Firefox.
- **Reliability:** if D1 can't be reached, public pages show a short "Couldn't load right now" page with a retry (and the cached copy when offline support has one); the saved plan is never affected. D1's point-in-time restore (Time Travel: 30 days on the Workers Paid plan, 7 on Free) is the backup, and the revisions table keeps every version of every activity.

## 8. Tech stack

| Concern | Choice |
|---|---|
| Framework | Astro 7 + TypeScript, `output: "server"` (pages rendered on demand from D1; the privacy page is prerendered); React 19 islands for interactive parts only, with shared state in nanostores (see implementation-plan.md §3.3 for the island map) |
| Hosting | Cloudflare Workers (`@astrojs/cloudflare`) with Cloudflare D1 for content and admin accounts; static files served as Workers assets (`wrangler deploy`, preview URLs per branch) |
| Content admin | Custom admin at `/admin` (§4.5): built-in accounts (owner and editor roles, invite links), structured editor, map editor, draft / preview / publish, history |
| Scheduled jobs | **GitHub Actions** for jobs whose output a person reviews (they open pull requests): an optional weekly check of each activity's trip from Central (§4.3); a venue-page change check that flags price or hours changes. **Workers Cron Triggers** for jobs that write D1 directly: the forecast refresh (§11.1) |
| Data sources | Transport for NSW Trip Planner API for the optional trip check (CC BY 4.0, free key); Opal daily caps from transportnsw.info; Open-Meteo (§11.1). All credited in the footer. |
| Analytics | Plausible (cookieless, supports the custom events in §7; from about US$9/month), or self-hosted Umami. Cloudflare Web Analytics was dropped: it doesn't support custom events. |
| Styling | Tailwind + CSS variables driven by a per-weather theme map (`themes[weather]`, §3.5). Final tokens and fonts come from the chosen design direction; the v1 sandstone/ferry-green palette is retired. Fonts are self-hosted with the Astro Fonts API (local provider) so a trimmed variable font can be used. |
| Motion | CSS transitions and keyframes for theme changes and loops; a small spring helper (e.g. Motion One) for the add confirmation and Plan B entrance only |
| Dates and time zones | date-fns-tz (chosen over the Temporal polyfill for size); all date logic in `Australia/Sydney` (§6.4) |
| Calendar export | A small in-house `.ics` writer (RFC 5545) with a `VTIMEZONE` for Australia/Sydney, plus Google Calendar links (§6.8) |
| Content | Cloudflare D1 (§4.5), validated with the `astro/zod` schema on every save and publish; SQL migrations in `db/migrations/`; seed JSON in `db/seed/activities/` |
| State | nanostores shared across islands; the plan and weather persisted to localStorage with `@nanostores/persistent` |
| PWA | A service worker generated after the build with `workbox-build` (static files precached, pages network-first), plus a manifest with icons |
| Errors | Client error monitoring with a free tier (e.g. Sentry), with personal data scrubbed; server errors logged by Workers (Workers Logs) |
| Testing | Vitest for ranking, Plan B, times, dates, time zones (including daylight-saving changes) and `.ics` output; the D1 data layer and admin auth against the real migrations on Node's SQLite; a contrast test over the theme map; Playwright for the core flows (§9) and the admin, on a throwaway local D1 |
| CI | `astro check`, lint, `wrangler types --check`, unit tests (including the seed content against the schema), e2e tests and Lighthouse budgets on every PR |

## 9. Acceptance criteria

1. With Rainy selected, no activity whose `rainy` fit is `0` shows in Discover, and the hidden count is correct.
2. Changing any filter updates the list and the URL in under 100 ms. Reloading the URL restores the same view.
3. Choosing Family shows only activities whose `goodFor` includes `family`.
4. Adding an activity from its detail page with **Add to a day** (picking Wed 7 Oct, Evening) puts it in My plans on that date at 6pm, updates the tab badge, and shows "Planned · Wed 7 Oct" on its card and page.
5. The **Add** button on a Discover card opens Add to a day; confirming adds the plan without leaving Discover. Today, Tomorrow, the next Saturday and Sunday and the next public holiday are offered as quick days.
6. Setting Sun 4 Oct's sky to Rainy when it contains "Three Sisters & Echo Point" shows the warning and a Plan B with `rainy: 2` that runs on that day. Tapping Swap replaces the item and keeps its start time.
7. The same Plan B is never suggested for two items at once.
8. Changing a plan's time by +30 min re-sorts the day, persists after a reload, appears in the share URL, and can be undone within 5 seconds. Two plans whose times overlap both show "Overlaps with …".
9. Carriageworks Farmers Market can't be confirmed on a Sunday in Add to a day ("Closed"), and **Change day or time** moves a plan to another date keeping its time.
10. A share link for a day opened in a fresh browser shows the same plans and times, and **Save to my plans** stores them. A v1 weekend link still opens.
11. Changing the weather re-themes the UI within 1.2 s without blocking input. With reduced motion on, the change is instant and no ambient loops run.
12. Every text style passes WCAG AA contrast in all four themes (automated test).
13. With localStorage blocked, the app still works for the whole session.
14. After the first visit, the app loads and the saved plan shows with no network connection.
15. The admin refuses to save an activity that is missing a required field or has `weatherFit` values outside 0–2, refuses to create an activity with an `id` that's already used, refuses to publish one whose pairing points nowhere, and in production refuses to publish a draft.
16. An activity page's Getting there shows the public transport trip from the city centre (time, changes, fare, the way-in strip), the last stretch to the door, and a **Directions from where you are** link that opens Google Maps transit directions to `dest` in a new tab; the map highlights only that trip's lines. There's no origin picker and no travel-mode switch.
17. For a one-way activity, "Getting back" is shown and the **Way back** toggle draws the return route on the map and adds it to the line under the map.
18. Choosing the Family preset (2 adults + 2 kids) on Bondi to Coogee by public transport shows transport as `2 × min(adult return, $9.65) + 2 × min(child return, $4.80)`, and on Royal National Park adds the uncapped Bundeena ferry fare. The total and per-person figures follow §6.6.
19. Selecting a POI in the list highlights the same numbered pin on the real map and shows its note, and selecting a pin does the same for the list. The list is fully usable by keyboard and screen reader, and still works when the map can't be shown.
20. The Driving? note on Bondi to Coogee shows the drive time from the city, "Parking, 3 hrs: $15–30 per car" marked est., and its tips; on Cockatoo Island it says you can't drive there and why; a Rideshare line appears only on activities whose content has one. The cost breakdown's transport line is always public transport.
21. Tapping a "Make a day of it" pairing opens that activity's page at the top, keeps the group size, and Back returns to the screen the user came from.
22. Changing the weather on an activity page changes it for the whole app: going back shows the list re-ranked for that weather.
23. Switching between all four weathers never changes any text's font, size, width, weight or letter spacing (visual regression test on Discover and an activity page).
24. Set the sky: each segment is a button with `aria-pressed`, reachable by keyboard, and the selected one is the only filled segment.
25. **Add to my calendar** for a day with two plans downloads one `.ics` file with two events at the right Sydney times, the place, directions when switched on, and the chosen reminder; it imports into Apple Calendar, Google Calendar and Outlook without errors.
26. A plan at 10am on Sun 4 Oct 2026 (the day daylight saving starts) exports as 10:00 Sydney time (`DTSTART;TZID=Australia/Sydney:20261004T100000`), and a 2:30am start that day is moved to 3:00am.
27. Google Calendar export for one plan opens Google's add-event page with the right title, times (`ctz=Australia/Sydney`), place and notes; for several plans it shows one link per plan.
28. Mon 5 Oct 2026 shows "Labour Day" in the calendar and Add to a day, and the cost estimate for that day uses the weekend Opal cap; a Wednesday uses the weekday cap.
29. A saved v1 weekend plan is migrated to v2 on first load with no plans lost.
30. In the admin, saving a draft doesn't change the public page; **Publish** shows the change on the next request; **Unpublish** makes the page a 404 and turns pairings to it into plain text; a signed-in editor sees the draft with `?preview`, and a visitor doesn't.
31. When two editors open the same activity and both save, the second save is refused with "Someone else changed this activity", and nothing is lost from the first.
32. A wrong password is refused without saying whether the email exists; a change sent from another site (wrong Origin) is refused; an editor can't open or call the owner-only Users pages; a disabled account is signed out at once.
33. After one visit to Discover with the network on, every published activity page opens with the network off.


## 10. Not doing (for now)

These are deliberate non-goals, carried over from [intent.md](intent.md). Revisit them only with evidence from users.

- Booking, ticketing or payments.
- Reviews and star ratings. Phase 3 community *tips* (§12.3) are moderated advice, not ratings.
- Social feeds or friend lists.
- Nightlife and real-time event listings. Phase 2 events (§11.4) are a few curated highlights only.
- Native iOS and Android apps. The PWA comes first.

---

## 11. Phase 2: smarter planning

### 11.1 Live forecast

- **Source:** Open-Meteo daily forecast (no API key, CC BY 4.0), fetched by a Workers Cron Trigger every 3 hours for each area (city, Blue Mountains, Northern Beaches, Royal National Park) and stored in a D1 `forecasts` table; never fetched from the client. Each activity uses the nearest area to its `location`, so no content change is needed. The app reads it from one small JSON endpoint (`/data/forecast.json`, cached for 1 hour). Show a credit ("Weather data: Open-Meteo") on Discover and My plans.
- **Not the Bureau of Meteorology directly:** it has no public API, its free forecast files are not for commercial use, and its copyright terms don't allow passing the data on. Open-Meteo's free tier is also non-commercial; if the app ever carries ads or paid features, move to its paid plan.
- **Accuracy:** a forecast made on Wednesday or Thursday is reliable for "hot or not" and only indicative for rain. Show the rain chance in the caption ("Forecast: rainy, 60% chance") and keep the manual override.
- **Mapping,** applied in this order:
  1. rainy if `precipitation_probability_max ≥ 50` or `precipitation_sum ≥ 2 mm`
  2. otherwise hot if `temperature_2m_max ≥ 30`
  3. otherwise cloudy if `cloud_cover_mean ≥ 70`
  4. otherwise sunny
- **Behaviour:**
  - Discover's default weather is today's city forecast, or the selected day's when Discover is opened from a day in My plans (that link carries the day's sky). A sky the user picks on Discover or an activity page stays for the rest of that day; **Use forecast** goes back to the forecast.
  - Each day within the forecast range is pre-set with `skySource: "auto"` and a caption, e.g. "Forecast: rainy, 60% chance of rain · updated 2 h ago". A day with plans uses the forecast for its first plan's area ("Forecast for the Blue Mountains: …").
  - Picking a weather manually sets `"manual"` and is never overwritten. A **Use forecast** link restores auto.
- **Caching and failure:** cache for 1 hour. If offline, use the last cached forecast with its age. If none exists, fall back to manual with no error state.
- **Change alert:** when an auto forecast changes and a planned item becomes Skip, show a banner on My plans: "Sunday now looks rainy. 1 activity needs a Plan B." Forecasts cover about 7 days ahead; later days keep a manual sky.

### 11.2 Map view

- A **List / Map** toggle on Discover. The maps use MapLibre GL with a Sydney extract of Protomaps vector tiles (about 31 MB, zoom 0–14, `scripts/map/`), self-hosted in an R2 bucket bound to the Worker and served through `/map/*` with byte ranges, with its label fonts alongside (no API key or quota, $0). Show "© OpenStreetMap contributors". Without the tiles in R2, the Discover toggle and day maps don't appear, and activity pages show their numbered list and directions link without the map.
- **Activity maps (D15):** the real map is the only map on activity pages (§3.2 item 3); its data is each activity's `geo` (§4.3). Nothing queries OpenStreetMap or the Trip Planner from the site: places, lines and facilities are generated by a script, reviewed in the admin and stored with the activity. Because activity pages now rely on the tiles, the R2 bucket and its upload are a launch step (owner).
- **Loading:** MapLibre is large (about 290 KB gzipped with its worker), so it loads only when the visitor opens a map, never on first load, and isn't in the offline precache; without WebGL the map says so and the list carries everything.
- **Alerts on activity pages:** NSW Rural Fire Service fire danger and total fire bans for the Greater Sydney Region (today and tomorrow), on outdoor activities (those not rated Perfect in the rain), fetched by the Worker and cached for 15 minutes, shown in Heads up with the time and a link to the RFS. If the feed fails, the page says to check the RFS site instead of showing stale data. NSW National Parks closure alerts aren't shown yet: no open feed was found (open question 13). Beach conditions link out to Beachsafe, which has no open licence.
- **Pins:** one per result, labelled with its fit for the current weather. Pins are real buttons (at least 44 px) named "{activity}: {fit} when {sky}"; the style follows the theme and always includes a text label. Selecting a pin shows its card, with quick-add, under the map.
- **My plans** gets **Show this day on a map**: the selected day's plans, numbered in time order.
- **Accessibility:** the map is supplementary. Everything on it is also reachable in the list.

### 11.3 Travel time from your suburb

> **Deferred (D14).** Getting there no longer has starting points, so this is a separate Discover feature, not part of the activity page. It needs a trip planner per state, and NSW is the only state with a hosted one; a self-hosted planner (e.g. OpenTripPlanner over each state's timetables) would be needed before other cities. The tracker also has a proposal to use the visitor's location instead of a suburb (M18).

- **Input:** the user sets a home suburb from a searchable list of Sydney suburbs, stored locally. Precise location is never requested.
- **Estimates:** public transport travel time from the suburb's centroid to each activity. Pre-compute this weekly per suburb with the same Transport for NSW Trip Planner job as §4.3 and store it in a D1 `travel_times` table (suburb × activity → minutes); the app fetches one suburb's row set when a suburb is chosen. No live Trip Planner calls from the client. About 600 suburbs × 100 activities is 60,000 calls, the API's daily limit, so spread it over the week or limit it to suburbs people have picked.
- **Display:** cards show "about 45 min by public transport".
- **New filter:** "Within 1 hr" (plus "Any distance").
- **Ranking:** travel time becomes a final tie-break after fit (shorter first).

### 11.4 Events and seasonal highlights

- **Content:** a new D1 `events` table with `start`/`end` dates, a venue `location`, `weatherFit`, `goodFor`, a link to the official page and an optional `activityId` (for events at a place that's already an activity). Events use the admin's draft / publish / history flow and expire from the site after their end date.
- **Display:** events in the next 14 days appear in an **On soon** row at the top of Discover (filtered by the group chip, never hidden by the sky: each shows its fit), and can be added to a day like activities; Add to a day only offers the event's own dates (quick days are its days; others are struck through). An event has no page of its own: its card and its plans link to the official page, or to the activity it's at.
- **Planning:** event ids start with `e-`, so plans, share links and calendar export treat them like activities (export uses the venue as the place and the official page as the link). Events are never suggested as a Plan B. They stay in the planning index for 30 days after they end, so past days in My plans still show them.
- **Seasonal activities** (`seasonal.months`) such as whale watching or Vivid get a "Seasonal" tag and are boosted within their fit tier (after fit, before "not yet planned"), when the month is known.
- **Curation:** events are editor-curated, around 3–10 per fortnight. This is not a full listings feed (see §10).

### 11.5 "Surprise me"

- A button on Discover picks one activity at random from the current results with fit 2. It excludes items already planned and anything shown in the last three picks.
- The pick is revealed with the theme's signature motion, with **Add to a day** and **Another one**.
- If there are no fit-2 results, it picks from fit 1 and says so. If the only fit-2 results are among the last three picks, they can come back (never the same one twice in a row); if everything that suits the sky is already planned, it says so.
- Analytics: `surprise_pick`, with whether it fell back to fit 1.

### 11.6 Accessibility filters

- **New optional data:** `access: { prams: "yes" | "partial" | "no"; stepFree: "yes" | "partial" | "no"; accessibleToilet: boolean; notes?: string }`.
- **Filter chips:** "Pram-friendly" and "Step-free", in the URL (`pram=1`, `step=1`) and saved with the other filters. An activity matches only on `"yes"`; `"partial"` doesn't match, and shows as "Partly" with its note on the activity page. The chips appear once at least one published activity has access facts, so they're never an empty promise.
- **Detail:** an **Access** section lists the facts and notes, with `lastVerified`.
- **Content rule:** the access fields are filled in the admin only from venue or NSW National Parks information, never guessed. If they're unknown, show "Not yet checked".

## 12. Phase 3: grow

### 12.1 Accounts and sync

- **Optional sign-in** with passkeys or an email magic link. There are no passwords, and every Phase 1–2 feature keeps working without an account.
- **Backend:** the same Worker and D1 database as the rest of the app (proposed; it replaces the earlier Supabase plan, open question 11). Visitor accounts live in their own tables (`visitors`, `visitor_sessions`, `passkeys`, `plans`), separate from the admin's `users`, with their own cookie. D1 has no row-level security, so every visitor query is scoped by the signed-in visitor's ID in one data-access module, and tests check that one visitor can't read another's plans.
- **Email:** magic links need a transactional email service (for example Cloudflare Email Service or Resend), which needs the owner's account and a sending domain.
- **Sync:** the plan stays in localStorage and is the source of truth offline; when signed in, changes are sent to the server and merged by day, with the newer `updatedAt` winning per item.
- **Migration:** on first sign-in, the local plan and history upload and merge (union of items, local order kept).
- **Data rights:** export my data (JSON) and delete my account, both self-serve.

### 12.2 Group plans and voting

- **Create a group plan** from a day in My plans and invite people by link. Invitees can view without an account; voting and suggesting need a sign-in.
- **Members can:**
  - **suggest** activities (they appear as "Suggested by Min")
  - **vote** Yes / Maybe / No on each item
  - see live counts (one Durable Object per group plan holds the live state and pushes updates over WebSockets; D1 keeps the durable record).
- **The organiser** can lock each day's plan. The top-voted items are highlighted as "Group pick", and locking moves them into the plan in vote order.
- **Weather still rules:** Plan B warnings and swaps apply to group plans. A swap is proposed as a new item for a vote.
- **Notifications** (opt-in, web push): a new suggestion, a day locked, or the forecast turning a group pick to Skip.
- **Limits:** up to 12 members and 8 items per day.

### 12.3 Community tips

- Signed-in users can add a **tip** (≤ 240 chars) to an activity, e.g. "Go before 9am to get parking at Watsons Bay".
- **Moderation:** every tip is reviewed before it's published, in a **Tips** queue in the admin (approve, edit, reject), after an automated screen for profanity and personal data. Tips can be reported, and 3 reports hide a tip pending review. Tips are stored in D1 with the visitor's ID so they can be removed with the account.
- **Display:** up to 3 recent tips on the detail page, labelled "Tip from a newcomer · Oct 2026" with first name and initial only.
- **No star ratings or reviews** (§10). Tips can receive a "Helpful" vote, which only affects their order.

### 12.4 Translations

- **First locales:** Korean (`ko`), Simplified Chinese (`zh-Hans`), Hindi (`hi`) and Spanish (`es`), chosen from the countries newcomers most often come from. Confirm the list with arrival data before starting.
- **UI strings** use the existing strings file with an ICU message format.
- **Content:** text fields (`name`, `blurb`, `weatherNote`, `gettingThere`, `newcomerTip`, `safetyNotes`) become locale maps in the activity record. The admin shows each locale beside the English, marks translations older than the English they came from, and publishes per activity as now. Missing translations fall back to English per field.
- **Language picker** in settings, defaulting to the browser language. The choice goes in the URL (`/ko/…`) for sharing.
- **Quality:** translations are human-reviewed, and safety notes always are. Machine drafts are allowed only as a starting point.

### 12.5 More cities

- **Cities:** Melbourne and Brisbane first, each with at least 40 activities and the same content rules (§5).
- **City switcher** in the header. The chosen city is stored locally and appears in the URL (`/melbourne`).
- **Per city:** `city` becomes a union and an indexed column in D1, and the admin filters by city. Each city has its own time zone for dates, times and calendar export (e.g. Perth is UTC+8), its own forecast coordinates, and its own transit copy (e.g. myki in Melbourne, go card in Brisbane). Getting there needs no per-city data source: each activity's trip from that city's centre, last stretch and Driving? note are written and checked by hand (D14), and the cost estimate needs only that fare system's daily cap.
- **Theme scenes** may get city-specific elements (e.g. skyline), but they share the theme map and motion rules (§3.5).

---

## 13. Open questions

Questions 1–4 and 6 have proposed answers that the MVP was built with (TRACKER.md D1–D5); the owner still needs to confirm them.

1. Which design variant (A Sky Mode or B Harbour Window) becomes the production look? **Built: A · Sky Mode.**
2. Should the duration filter be in the MVP, or should we launch with weather + group + free only? **Built: duration filter included.**
3. Should cost be tiers or approximate AUD? **Built: tiers on cards (ranges in §4.1), AUD estimates on the activity page.**
4. Is "Hot" 30°C in every season, or relative to the season (e.g. 25°C in winter feels warm but isn't a hazard)? **Built: fixed 30°C.**
5. ~~Should the "Last weekend" history be kept?~~ Resolved: past days stay read-only for 30 days (§4.4).
6. Photos: our own photography, Wikimedia Commons with credits, or Unsplash? (Destination NSW's image library is not open to this app without a written agreement.) **Built: no photos at launch.** When photos come, they'd be stored in R2 and uploaded from the admin.
7. Group voting (§12.2): should a "No" vote be visible to everyone, or only counted?
8. Community tips (§12.3): moderation is proposed as an automatic pre-filter (OpenAI's free moderation endpoint) plus manual approval and a report button, which also covers the defamation complaint defence. What turnaround do we promise?
9. ~~The name "Sydney Weekend Finder" predates any-day planning. Keep it, or rename before launch?~~ Resolved (owner, 2 Oct 2026): **Australia Activities Planner**, starting with Sydney.
10. Should My plans offer a **week** view on desktop as well as the month, for people planning several things in one week?
11. Phase 3 accounts (§12.1): build on the existing Worker and D1 (proposed: one stack, one bill, no second vendor), or on Supabase as first planned? Either way, which email service sends magic links?
12. Which Phase 2 features, if any, should ship with the launch? Proposed: none are required; build them in the order in implementation-plan.md §7.2 while the content is being verified, and switch each on only when its content is ready.
13. NSW National Parks closure alerts (§11.2): no open feed was found. Find out whether NPWS offers one (possibly through the NSW Government API portal, with a key), or keep linking to each park's page?
