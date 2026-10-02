# Implementation plan: Design A · Sky Mode

Written 1 October 2026, revised the same day after an audit, the move to Astro, and the move of content to D1 with a custom admin (changes listed at the end). This plan turns the Sky Mode prototypes and [spec.md](spec.md) into the MVP (spec Phase 1), including **planning on any day** with a calendar and export to the user's own calendar, and then plans the rest of the app: the MVP gaps, Phase 2 and Phase 3 (section 7.2). It assumes **A · Sky Mode is the production design** (spec open question 1).

**Where things stand (1 October 2026):** milestones M0–M11 are built and tested locally (Vitest 119, Playwright 90, Lighthouse 95+ performance). Going live waits on the owner (Cloudflare account, D1 database, deploy, keys) and on verified content (C1). Section 7.2 lists what's left to build.

**Design reference:** the prototype canvas, https://claude.ai/artifact/3DefgcrPvBH4JCFK3qrYJX. Build from:
- `A · Sky Mode — Mobile` and `— Desktop`: Discover
- `A · Activity detail — Mobile` and `— Desktop`: the activity page
- `A · Set the sky`: Variant 2 (sky strip) is the chosen weather control
- `A · My plans calendar — Mobile` and `— Desktop`, and `A · Add to a day — Mobile`: planning, the calendar and calendar export

Since canvas Version 36, the A activity-page artboards show the simplified **Getting there** (TRACKER.md D14, 2 Oct 2026): one public transport trip from the city centre, the last stretch, Directions from where you are and a Driving? note. Build that, not the origin and mode pickers still in the B and v1 artboards.

The Discover and activity-page prototypes still show the old Sat / Sun buttons and a "My weekend" tab. The calendar artboards and spec §3.3 supersede them: build **Add to a day** and **My plans**, not the weekend controls.

**Reference logic in the repo:** [design/prototype-logic/](design/prototype-logic/) holds the three prototype engines (Discover, activity detail, calendar), snapshots of every artboard, the content generator and validator, and the checks that exercised them. Everything there runs from the repo (see its README).

**Progress is tracked in [TRACKER.md](TRACKER.md)** (task checklist, decisions, acceptance status, log).

**Supporting documents:** [intent.md](intent.md) (why), [spec.md](spec.md) (what), [feasibility.md](feasibility.md) (services and costs), [design/directions.md](design/directions.md) (design decisions).

---

## 1. Scope

**In the MVP**
- Discover, Activity detail, **My plans** (calendar) and the shared-plan view, on phone and desktop (spec §3).
- **Add to a day:** any date and start time, with fit, overlap and "doesn't run that day" checks (§3.3, §6.7).
- **Add to your calendar:** `.ics` download for Apple Calendar and Outlook, Google Calendar links (§6.8).
- Sky Mode's weather-reactive theme: four sky scenes, glass panels, per-weather tokens, the Set the sky strip, and a sky per planned day (§3.1, §3.5).
- Ranking, Plan B per day, times and overlaps, share links v2 with v1 conversion, dates in Sydney time with daylight saving and NSW public holidays (§6).
- Activity pages with the schematic map, getting there by public transport from the city centre (with the last stretch and a Driving? note), and the cost estimate with the right Opal cap for the day (§3.2, §4.3, §6.6). *Changed 2 Oct 2026 (D14); the first build had three origins and three travel modes, reworked in M24.*
- Content in Cloudflare D1 with a custom admin at `/admin`: accounts, structured editor, map editor, draft / preview / publish, history, and the draft gate (§4.3, §4.5, §5).
- ~~The weekly transport job: routes, Opal fares and tolls (§4.3).~~ Not needed for launch since D14: fares and driving notes are hand-kept, and a weekly check of each activity's trip from Central is an optional editor aid (M9a).
- Offline support, analytics with custom events, error monitoring, WCAG 2.2 AA (§7–8).
- At least 40 verified Sydney activities (§5). There are 29 drafts today.

**Not in the MVP:** everything in spec §11 (Phase 2) and §12 (Phase 3), including the live forecast, the real tiled map and alerts. They are planned in section 7.2 so the MVP's choices don't block them.

## 2. Decisions to confirm before building

| Question (spec §13) | Proposed answer | Why |
|---|---|---|
| 1. Production design | **A · Sky Mode** | Most refined direction; this plan depends on it |
| 2. Duration filter in the MVP? | **Yes** | Already designed; small logic |
| 3. Cost as tiers or AUD? | **Both:** tiers on cards, AUD estimates on the activity page | Matches the prototypes |
| 4. "Hot" fixed or seasonal? | **Fixed 30°C** | Simple and explainable |
| 5. "Last weekend" history | **Resolved in the spec:** past days stay read-only for 30 days | Replaced by the calendar |
| 6. Photos | **None at launch** | The design works without photos |
| 9. Keep the name "Weekend Finder"? | **Decided (2 Oct 2026): Australia Activities Planner**, Sydney first | Applied in `src/site.ts` and the PWA manifest |
| 10. Week view on desktop? | **Not in the MVP** | Month view plus the day panel covers it |

Also decided: **analytics is Plausible** (about US$9/month), because Cloudflare Web Analytics doesn't support custom events and the success signals need them. Self-hosted Umami is the free alternative if running a small server is acceptable.

## 3. Architecture

### 3.1 Stack

| Layer | Choice (version checked 1 Oct 2026) |
|---|---|
| Framework | **Astro 7** (7.3.x; Vite 8, Rust compiler), TypeScript strict, `output: "server"` (the privacy page is prerendered; `build.format: "file"`) |
| Interactive components | **React 19** islands via `@astrojs/react` 7 |
| Shared client state | `nanostores` 1.x with `@nanostores/react`, and `@nanostores/persistent` for localStorage |
| Hosting | **Cloudflare Workers** with `@astrojs/cloudflare` (`output: "server"`): pages are rendered on demand from D1; static files are served as assets. Deployed with `wrangler deploy` (changed 1 Oct 2026, M11; was a fully static site). |
| Content | **Cloudflare D1** (`db/migrations/`): each activity has a draft and a published copy (plus derived card and export data), revisions, and admin users and sessions. Validated with the `astro/zod` schema on every save and publish. `db/seed/activities/*.json` seeds fresh databases only. |
| Admin | A custom CMS at `/admin` (React, client-only) over `/api/admin/*` (`src/server/adminApi.ts`): built-in accounts (PBKDF2 passwords, HttpOnly sessions, invites, roles, rate limits), structured activity editor with live validation, map editor, draft / preview / publish / history. Replaces Decap CMS. |
| Styling | Tailwind 4 (`@tailwindcss/vite`) with CSS variables per weather |
| Fonts | Astro Fonts API, `fontProviders.local()` with the trimmed Mona Sans file |
| Dates | `date-fns` 4 + `@date-fns/tz` (`TZDate` in `Australia/Sydney`) |
| Offline | Service worker generated after the build with `workbox-build` (`generateSW` over `dist/client`): static files precached, pages network-first, admin never cached. `@vite-pwa/astro` isn't used: its peer range stops at Astro 5. |
| Analytics, errors | Plausible script; Sentry's lazy loader in the browser; Workers Logs on the server |
| Tests | Vitest 5 (D1 code runs on Node's `node:sqlite` with the real migrations), Playwright 1.6x on a throwaway local D1, `@astrojs/check` for `.astro` type checks, axe, Lighthouse CI (through a gzip proxy locally) |
| CI and deploys | GitHub Actions for checks and the weekly data job; Cloudflare Workers Builds (or `wrangler versions upload` in CI) for preview URLs on every branch |

Note Astro 7's defaults when porting markup: the Rust compiler is stricter about invalid HTML, and `compressHTML: 'jsx'` strips whitespace between inline elements, so add `{' '}` where words sit in separate elements.

### 3.2 Pages

| Route | Built as | Interactive parts |
|---|---|---|
| `/` Discover | Rendered on demand from the published cards in D1 | Set the sky, filters and results, Coming up rail (desktop) |
| `/a/[id]` Activity | Rendered on demand from that activity's published copy (draft with `?preview` for signed-in editors); unknown or unpublished ids rewrite to `/404` | Weather tiles, map, getting there, cost, Add to a day button |
| `/plan` My plans | Shell with a skeleton, rendered on demand (it embeds the card index) | The whole calendar (it depends on the device's saved plans and today's date) |
| `/data/export.json` | On demand from D1 | Place and directions per activity, fetched when the export sheet opens |
| `/404` | On demand (so activity pages can rewrite to it) | None |
| `/privacy` | Prerendered | None |
| `/admin/*` | One client-only React app (`AdminApp`), never cached | Everything |
| `/api/admin/*` | JSON API (`src/server/adminApi.ts`) | – |

Shared plans (`/plan?s=…`) and the selected day (`?d=`) are read in the browser by the My plans island; the server isn't involved.

### 3.3 What is static, and what is an island

The rule: **render everything that's the same for every visitor as Astro HTML on the server (from D1, per request), and hydrate React only where the page has to react to the user, their saved plans, or today's date.** Anything that can be done with CSS or a few lines of inline script isn't a React island.

**Plain Astro, no JavaScript:**
- Layout, header and footer, tab bar and top nav (plain links; the active tab is known on the server).
- The **sky scenes** for all four weathers, crossfaded by CSS from `html[data-weather]`.
- Discover's **headline weather word**: all four words are in the HTML and CSS shows the one matching `data-weather`.
- On the activity page: hero, facts strip, the **fit callout** (four versions, CSS shows one), plan your visit, newcomer tip, heads up, and **Make a day of it** (plain links to other activity pages, so "reset on open" happens naturally).
- The 404 page and the privacy page.

**Tiny inline scripts (`<script is:inline>`, not React):**
- **Theme before paint:** reads `?w=` or the saved weather and sets `data-weather` on `<html>` so the right sky shows with no flash.
- **Today's date** in Discover's eyebrow (a cached page's date would be wrong).
- **Pause ambient loops** when the tab is hidden (toggles a class on `<html>`).

**React islands:**

| Island | Page | Directive | Why it's an island | State |
|---|---|---|---|---|
| `SetTheSky` | Discover | `client:load` | Primary above-the-fold control; must respond at once | writes `$weather` |
| `DiscoverExplorer` (filters + ranked results + cards) | Discover | `client:load` | Ranking depends on weather, filters and saved plans; Add buttons and "Planned" labels | reads `$weather`, `$plan`; URL query for filters |
| `ComingUpRail` | Discover (desktop) | `client:media="(min-width: 1024px)"` | Needs saved plans; desktop only, so phones never download it | reads `$plan` |
| `WeatherTiles` | Activity | `client:visible` | Tapping a tile changes the app weather | writes `$weather` |
| `RouteMap` | Activity | `client:visible` | Lights the trip's lines and the way back, POI selection, layer toggles | reads and writes the page's `$trip` store |
| `GettingThere` | Activity | *static Astro since D14 (M24)* | Was an island for the origin and mode pickers; with one trip and no pickers it has nothing interactive left | none |
| `CostEstimate` | Activity | `client:visible` | Group, extras, the cap for the day being planned | reads `$trip`, `$planningDate` |
| `AddToDayButton` | Activity | `client:idle` | Opens the sheet; label shows planned dates | reads `$plan`, writes `$sheet` |
| `MyPlans` | My plans | `client:only="react"` with an Astro skeleton as `slot="fallback"` | Everything depends on the device's plans and today's date, so server rendering would only produce a mismatch | `$plan`, its own selected-day state |
| `SheetHost` | Every page (layout) | `client:idle` | One place that renders **Add to a day**, **Add to your calendar** and the **Undo** toast over any page; their code is lazy-loaded with `React.lazy` the first time a sheet opens | reads `$sheet`, `$plan` |

Why this split:
- **Islands share state through nanostores, not React context.** Each island is a separate React root, so `SetTheSky` and `DiscoverExplorer`, or `RouteMap` and `CostEstimate`, coordinate through small stores instead of being forced into one big island.
- **`client:visible` on the activity page** means the map and cost code load only when scrolled to on a phone. On desktop they're in view, so they hydrate straight away.
- **`client:only` for My plans** because the calendar has nothing useful to prerender; the skeleton keeps layout stable.
- **The calendar file writer and Google links load only when the export sheet opens** (lazy chunk inside `SheetHost`), keeping them out of every page's first load.
- **Content stays in HTML.** Islands receive only the data they need as props (for example `RouteMap` gets that activity's map and route data); the full activity list is passed only to `DiscoverExplorer`, as a compact card index.

### 3.4 Shared state (`src/stores/`)

| Store | Kind | Contents | Notes |
|---|---|---|---|
| `$weather` | persistent atom (`swf.weather`) | `sunny \| cloudy \| rainy \| hot` | Its listener sets `html[data-weather]`; Discover also mirrors it to `?w=` with `history.replaceState` |
| `$plan` | persistent map (`swf.plan.v2`) | Plan v2 (spec §4.4) | Migrates v1 on first read; try/catch with in-memory fallback; syncs across tabs |
| `$sheet` | atom | `null`, `{ kind: "add", activityId, date? }` or `{ kind: "export", scope, date?, activityId? }` | Opened from any island, rendered by `SheetHost` |
| `$planningDate` | atom (session) | The day being planned, if any | Set when Discover or an activity is opened from a day in My plans; used by Add to a day and `CostEstimate` |
| `$trip` | atom, created per activity page | group, extras, selected POI, Way back | Shared by `RouteMap` and `CostEstimate`; origin and mode removed by D14 (M24) |
| `$toast` | atom | The current Undo toast | Rendered by `SheetHost` |

Pure logic lives in `src/lib/` (section 4) and is imported by islands and, where useful, by Astro components on the server (for example, to render the default cost range). Server-only code (D1, auth, the admin API) lives in `src/server/` and never reaches the browser.

### 3.5 Repository layout

```
astro.config.mjs               Astro 7, React, Tailwind, Fonts API, server output, Cloudflare adapter
wrangler.jsonc                 Worker (Astro adapter), D1 binding, CONTENT_MODE
src/content/schema.ts          the activity Zod schema (spec §4)
db/migrations/*.sql            D1 schema; db/seed/activities/*.json seeds fresh databases
scripts/db/                    reset, seed, create-user (the first owner), wrangler helper
src/server/                    D1 data layer, auth, admin API, env (server only)
src/middleware.ts              no-store, framing and CSP headers for /admin and /api/admin
src/lib/holidays.ts            NSW public holidays from the Act's rules (data.gov.au's dataset is inactive)
src/lib/content-checks.ts      cross-activity checks (pairings, map lines), used on save and publish
design/prototype-logic/        prototype engines, artboard snapshots, checks (reference only)
scripts/transport/             optional weekly check of each activity's trip from Central, with map drift (D14)
scripts/sw/                    service worker generation (workbox-build) after astro build
scripts/perf/                  Lighthouse with budgets
src/pages/                     index, a/[id], plan, 404, privacy, data/export.json, admin/[...path], api/admin/[...path]
src/layouts/                   Base layout with the theme script and SheetHost
src/components/*.astro         server-rendered components (sky scene, tab bar, footer); detail/, discover/, plans/, sheets/, shared/ group the rest
src/components/islands/        React islands (section 3.3) and their child components
src/components/admin/          the admin app: list, editor, map editor, users
src/stores/                    nanostores (section 3.4)
src/lib/                       pure logic, no React (section 4)
src/theme/                     tokens per weather, icons
src/strings/en-AU.ts           all visitor-facing UI text (M12.1; text is still inline today)
tests/                         unit, contrast, visual and e2e tests
```

**Naming:** the spec's weather keys are `sunny | cloudy | rainy | hot`; the prototypes use `sun | cloud | rain | hot`. Use the spec's keys everywhere in the app.

## 4. Porting the prototype logic

Port, don't rewrite. The engines in `design/prototype-logic/engines/` have been run across every activity, weather, origin, mode, month, day and export option.

| Prototype source | Becomes | Spec |
|---|---|---|
| `discover-engine.js`: filters, ranking, hidden count | `lib/ranking.ts` | §6.1 |
| `discover-engine.js` + `calendar-engine.js`: Plan B per day | `lib/planB.ts` | §6.2 |
| `calendar-engine.js`: month grid, relative labels, public holidays | `lib/dates.ts` (rebuilt on date-fns-tz for Sydney time and daylight saving) | §6.4 |
| `calendar-engine.js`: times, durations, overlaps, days it runs | `lib/planDays.ts` | §4.4, §6.7 |
| `calendar-engine.js`: export events and Google links | `lib/calendarExport.ts` (adds the `.ics` writer with `VTIMEZONE`) | §6.8 |
| Share link format | `lib/share.ts` (v2, plus v1 conversion) | §6.5 |
| `detail-engine.js`: route per origin and mode, unavailable modes (since D14: one trip from the city, way-in strip, last stretch; M24) | `lib/route.ts` | §3.2, §4.3 |
| `detail-engine.js`: cost estimate | `lib/cost.ts` (adds the weekday cap) | §6.6 |
| `detail-engine.js`: suggestion navigation | `lib/detailState.ts` | §3.2 item 9 |

**Golden tests:** before porting, export the prototype outputs as fixtures (ranking per weather and filter set, Plan B per scenario, cost per activity × origin × mode × group, calendar day info, export events). The TypeScript must match them, except where the spec deliberately changed behaviour since the prototypes (the weekday Opal cap, daylight-saving handling, the `.ics` file itself), which get their own tests.

## 5. Theme and design system

### 5.1 Tokens

One theme map, `themes[weather]`, holds every per-weather value; components read CSS variables and never hard-code a weather colour (§3.5). Values come from Sky Mode's palette: `ink`, `mute`, `sky`, `glass`, `glass2`, `line`, `soft`, `sel`, `selInk`, `accent`, `great`, `shadow`, `hl`, `scrim`. Set the page theme with `data-weather` on `<html>`; components that show another day's sky (calendar badges, the Add to a day sheet) take a `weather` prop instead. Colour, background and border transitions run over 900 ms to match the sky crossfade.

### 5.2 Typography

- **Mona Sans** for everything, served by the **Astro Fonts API** with `fontProviders.local()` pointing at the trimmed file (preload links and fallback metrics are generated for it).
- Trim the variable font at build time with fonttools to widths 80–100 and the weights in use, subset to Latin, Latin Extended and Vietnamese; check the result against the first-load budget.
- **Fixed widths, never weather-driven:** big titles 80, section heads 90, numbers and labels 100, as three utility classes.

### 5.3 Glass, spacing and shape

- Glass panels: `backdrop-filter: blur(18px) saturate(135%)`, with a solid fallback under `@supports not (backdrop-filter: …)` and `prefers-reduced-transparency`.
- 4/8 px spacing grid; inner radius = outer radius − padding.
- Hit targets at least 44 px everywhere, including calendar days.

### 5.4 Sky scenes

- Four stacked scene layers crossfaded with `opacity` only; CSS and inline SVG; 40 KB gzipped budget for all four.
- Animate only `transform` and `opacity`; pause when hidden or off-screen; a still frame and instant switch under reduced motion.

### 5.5 Contrast method

Glass is translucent, so contrast depends on what's behind it. For each theme, define two **worst-case backgrounds**: the glass colour composited over the lightest and over the darkest point of that theme's scene where text can sit (sampled from the artboards once, stored as tokens). The automated test checks every text token against both, and text placed directly on the sky against the scene's lightest point. Repeat the sampling whenever a scene changes.

### 5.6 Icons

The Set the sky line icons are the base set; draw the rest (modes, facilities, actions, calendar apps) on the same 24 px grid and 1.8 px stroke. No brand logos for calendar apps. Every weather icon has an accessible name.

## 6. Components

**Astro = static HTML, no JS. React = part of an island (section 3.3).** Shared UI that appears both statically and inside islands (fit meter, weather icons, chips) is written once as a React component and rendered by Astro on the server without a client directive, so it ships no JavaScript where it isn't interactive.

| Component | Kind | Inside | Spec |
|---|---|---|---|
| `SkyScene` | Astro | Layout | §3.5 |
| `ThemeScript`, `TodayDate`, `MotionPause` | Astro + inline script | Layout, Discover | §3.5 |
| `SetTheSky` (full and compact) | React | island `SetTheSky`; compact used in `MyPlans` | §3.1, §3.3 |
| `FilterChips`, `FreeToggle`, `ResultsHeader`, `EmptyState` | React | `DiscoverExplorer` | §3.1 |
| `ActivityCard` | React | `DiscoverExplorer` | §3.1 |
| `FitMeter`, `FitPill`, `WeatherIcon` | React, also rendered statically | everywhere | §6.3 |
| `DetailHero`, `FactsStrip`, `FitCallout` (four variants, CSS shows one) | Astro | Activity page | §3.2 |
| `WeatherTiles` | React | island | §3.2 |
| `SchematicMap`, `PoiList`, `PoiPanel`, `MapToggles` | React | `RouteMap` | §3.2, §4.3 |
| `WayIn`, `LegsTimeline`, `GettingBack`, `DrivingNote` | Astro (React `RoutePicker` removed by D14) | `GettingThere` | §3.2 |
| `CostEstimate` | React | island | §3.2, §6.6 |
| `VisitInfo`, `NewcomerTip`, `HeadsUp`, `Pairings` | Astro | Activity page | §3.2 |
| `AddToDayButton` | React | island | §3.2 |
| `AddToDaySheet` | React, lazy | `SheetHost` | §3.3 |
| `CalendarExport` (with the `.ics` writer) | React, lazy | `SheetHost` | §3.3, §6.8 |
| `UndoToast` | React | `SheetHost` | §6.7 |
| `CalendarMonth`, `CalendarDay`, `DayPanel`, `PlanTimeline`, `TimeControls`, `PlanBRow`, `ComingUp`, `ShareButton`, `SharedPlanView` | React | `MyPlans` (`ComingUp` also in `ComingUpRail`) | §3.3, §3.4, §6.7 |
| `MyPlansSkeleton` | Astro | `MyPlans` fallback | §3.3 |
| `AdminApp` (Login, Invite, ActivityList, NewActivity, UsersPage, AccountPage) | React, `client:only` | `/admin` | §4.5 |
| `ActivityEditor`, `LegsEditor`, `MapEditor` | React | `AdminApp` | §4.3, §4.5 |

**Budget check:** React 19 and React DOM take a large share of the 150 KB first-load budget on their own. M0 measures the real figure; if headroom is tight, the first places to save are making `ComingUpRail` and `WeatherTiles` vanilla scripts instead of islands.

## 7. Milestones

Estimates are for one experienced front-end developer, in working days. The content track runs in parallel with an editor.

### 7.1 MVP (built)

All of these are done locally except the items that need the owner's accounts or devices (TRACKER.md lists them).

| # | Milestone | Main work | Done when | Days |
|---|---|---|---|---|
| M0 | Set-up | Repo, Astro 7 site with React islands (static at first; server output since M11), Tailwind 4, lint, `astro check`, Vitest, Playwright, CI, Cloudflare Workers static assets with preview URLs, service worker skeleton (workbox-build), Plausible and Sentry wired, nanostores in place. **Measure an empty build's JS** against the 150 KB budget and record the headroom. | A preview deploys on every PR; baseline JS size recorded | 3 |
| M1 | Content pipeline and editor tools | Zod schema; port `design/prototype-logic/content` to `scripts/content`; draft gate; pairing and `suggestedStart` checks; NSW holiday import. **Editor tools:** originally Decap CMS plus a map editor; replaced in M11 by a custom admin on D1 with the map editor built in. | A production build refuses drafts; an editor can change an activity and its map without touching JSON by hand; acceptance 15 | 6 |
| M2 | Core logic | Port section 4 with golden tests; add Sydney time and daylight saving, plan v2 and v1 migration, share v2, the `.ics` writer, the weekday cap | Golden and new unit tests pass; logic for acceptance 1, 3, 6–9, 18, 20, 26, 28 and 29 covered by unit tests | 7 |
| M3 | Theme and Set the sky | Tokens, theme script, Mona Sans (trimmed, Astro Fonts API), glass, scenes, Set the sky island, contrast test (section 5.5) | Weather switch under 1.2 s at 60 fps on a mid-range Android; contrast test passes; acceptance 24 | 5 |
| M4 | Discover (phone) | Header, filters and weather in the URL, cards, Add button (opens a stub until M6), empty state, hidden count | Acceptance 1–3 pass end to end | 4 |
| M5 | Activity detail (phone) | All ten sections, map, getting there, cost, pairings, static pages, weather carried in links | Acceptance 16–22 pass | 7 |
| M6 | My plans and Add to a day (phone) | Calendar, day panel, day sky, timeline, time and day changes, overlaps, days it runs, Plan B, undo, Add to a day sheet, share and shared view, v1 migration | Acceptance 4–10 and 29 pass | 9 |
| M7 | Calendar export | Export sheet, `.ics` download, Google links, preview, done state; manual import test in Apple Calendar (iOS and macOS), Google Calendar and Outlook (web and desktop) | Acceptance 25–28 pass | 4 |
| M8 | Desktop | Discover with the Coming up rail, three-column activity page, desktop My plans and dialogs, 360–1440 px checks | Desktop artboards matched; no horizontal scroll at any width | 5 |
| M9a | Transport job: routes and tolls | Trip Planner calls per activity and origin, Toll Calculator, driving time, secrets in CI, a weekly PR with changes. **Map drift check:** when a route's lines or stops change, the PR flags that activity's map for redrawing instead of editing the map. **Narrowed by D14:** checks only each activity's trip from Central; tolls and driving time dropped; optional, not a launch gate. | Weekly job opens a reviewable PR; drift flags appear on a seeded change | 5 → 2 |
| M9b | Transport job: Opal fares | ~~Fare calculator from the Opal Fares dataset~~ **Dropped by D14:** one hand-kept adult fare per activity; the Opal daily cap bounds most day trips | – | 4 → 0 |
| M10 | Hardening | Offline, analytics events (§7), Lighthouse budgets, accessibility audit (keyboard, VoiceOver, TalkBack), reduced motion and transparency, visual regression for "type stays put", privacy page, error monitoring check | Acceptance 11–14 and 23 pass; Lighthouse 90+ for Performance and Accessibility | 5 |
| M11 | D1 and custom content admin | Content moved to D1 (draft and published copies, revisions); pages rendered on demand on Workers; built-in admin accounts (owner, editor, invites, resets, rate limits); the admin app with the structured editor, map editor, preview, publish, history; Decap removed; tests on `node:sqlite` and a throwaway local D1 | Admin e2e passes (create → publish → unpublish → history → delete, conflict, invite → role → disable); visitor e2e, visuals and Lighthouse unchanged | – (added 1 Oct 2026) |
| C1 | Content (parallel) | Verify the 29 drafts; write at least 11 more to reach 40 with the §5 mix, **including a schematic map for each**; set `lastVerified` and `pricesChecked` | 40+ activities with `status: "verified"` | 4–5 weeks of editor time |

**Total:** 64 developer days of planned work, plus **20% contingency (13 days)**, so about **77 days, or 15–16 weeks**, for one developer. C1 runs alongside and starts on day one.

**After D14 (2 Oct 2026):** M9b and most of M9a are gone (7 days) and M24 is added (4 days, section 7.2), so the MVP is about 57 + 4 developer days. The earlier "ship without the transport job" option is now the plan.

**Order:** M0 → M1 → M2 → M3 with M4 → M5 → M6 → M7 → M8 → M9a → M9b → M10. M9a and M9b only write content, so they can move earlier if a second developer joins.

### 7.2 Remaining work

Three groups, in this order: **finish the MVP** (M12, plus the owner's go-live steps), then **Phase 2** (M13–M18, spec §11), then **Phase 3** (M19–M23, spec §12). Phase 3 should start only after launch, once the success signals in intent.md show people are using the app (spec §10). Each Phase 2 feature is switched on only when its content is ready, so none of them holds up the launch (spec open question 12).

**Owner steps that gate launch (not development):** create the Cloudflare D1 database and deploy (M11.11, M0.5), the first owner account, `CONTENT_MODE=published`, Plausible and Sentry keys (M0.7, M0.8), the Transport for NSW Open Data Hub key (done 2 Oct 2026; since D14 only needed for the optional trip check, M9a, and the deferred M18), device checks (M3.8, M7.5, M10.6), the product name (D9) and C1 content.

#### Finish the MVP

| # | Milestone | Main work | Done when | Needs | Days |
|---|---|---|---|---|---|
| M24 | Getting there, simplified (D14) | One `pt` trip from Central per activity plus a `drive` note and optional `ride` sentence (schema, D1 migration, seed, admin editor); `lib/route.ts` derives the way-in strip and last stretch; `lib/cost.ts` is public transport only; `GettingThere` becomes static Astro (no pickers) with Directions from where you are and the Driving? note; `RouteMap` lights only the trip and the way back; `$trip` drops origin and mode; calendar export directions from the city; transport job narrowed to Central | AC 16, 17, 18, 20 and 21 pass in all three engines; 29 activities convert and round-trip through the admin | Canvas Version 36 (A · Activity detail) | 4 |
| M25 | Real map replaces the schematic (D15) | `geo` per activity (places, walking line, facilities, trip from Central and way back) generated by `scripts/map/build-geo.mjs` from OpenStreetMap and the Trip Planner and reviewed in the admin; the activity page draws only the real map (pins synced with the stop list, mode-styled trip lines, Way back, lines in words, fallback list); admin Places editor with draggable pins; SchematicMap, map palette and schematic editor removed; canvas A detail boards use base-map images rendered from our tiles | AC 16, 17, 19 pass in all three engines; every activity has places and a trip; the R2 tiles are a launch step | Done with M24 (same data) | 3 |
| M12 | MVP gaps | **1** Strings file `src/strings/en-AU.ts` for all visitor-facing text, with a lint rule against new inline strings in islands. **2** Offline for every published activity page: after the service worker is ready, fetch the activity pages into the pages cache when idle (skip on Save-Data; at most once a day). **3** WebKit and Firefox Playwright projects in CI (phone Safari and desktop Firefox); fix what they find, including the SVG mask draw on Safari. **4** Transport job reads the published activities from D1 (`wrangler d1 execute --remote` with a read-only API token in CI) instead of the seed files. **5** "Needs re-checking" flag in the admin list for activities verified more than 6 months ago. **6** A friendly error page when D1 can't be reached. **7** After the first deploy: measure time to first byte from Sydney; if the 75th percentile is over 300 ms, cache public pages in the Workers Cache API and clear it on publish. **8** An e2e check that unpublishing turns pairings into plain text (AC 30). | Spec §7 met; AC 30 and 33 pass; e2e green in all three engines | 4 needs the deploy and an API token; 7 needs the deploy | 8 |

#### Phase 2 (spec §11)

| # | Milestone | Main work | Done when | Needs | Days |
|---|---|---|---|---|---|
| M13 | Surprise me (§11.5) | Button on Discover, pick from fit-2 results (fit 1 with a note when there are none), no repeats of the last three, reveal motion, **Add to a day** and **Another one**; analytics event | Unit tests for the pick rules; e2e | – | 2 |
| M14 | Accessibility filters (§11.6) | `access` in the schema and the admin editor; "Pram-friendly" and "Step-free" chips (in the URL, saved filters); **Access** section on the activity page with "Not yet checked" | Unit and e2e tests; axe clean | Editor fills `access` from official sources | 3 |
| M15 | Events and seasonal highlights (§11.4) | D1 `events` table (migration), repository with draft / publish / history like activities, admin list and editor; **On soon** row on Discover; Add to a day limited to the event's dates; events in plans, share links and calendar export; Seasonal tag and boost within a fit tier | Editors can publish an event and visitors can plan it; expired events disappear | Editor curates 3–10 events per fortnight | 6 |
| M16 | Live forecast (§11.1) | Workers Cron Trigger every 3 h → Open-Meteo for four areas → D1 `forecasts`; `/data/forecast.json` (1 h cache); nearest area per activity; Discover defaults to today's forecast; days pre-set with `skySource: "auto"`, **Use forecast**, captions with age and rain chance; change alert on My plans; offline uses the last forecast; credit line | Mapping rules unit-tested; cron tested locally (`wrangler dev --test-scheduled`); manual sky never overwritten (e2e) | Open-Meteo's free tier is non-commercial (spec §11.1) | 5 |
| M17 | Map view (§11.2) | Sydney Protomaps extract in R2; MapLibre loaded only when a map opens; Discover **List / Map** with fit-labelled pins and a compact card; activity maps from GeoJSON (NPWS tracks, OSM facilities, reviewed in the admin) with the schematic map as the fallback; My plans day map; RFS and NPWS alerts fetched and cached by the Worker | First-load JS budget unchanged (map code lazy); keyboard and screen-reader parity with the list | Owner creates the R2 bucket | 12 |
| M18 | Travel time from your suburb (§11.3). **Deferred by D14:** a separate Discover feature; outside NSW it needs a self-hosted trip planner or a paid API | Suburb list and picker (stored locally); weekly job fills D1 `travel_times` (spread over the week within the API's daily limit); "about 45 min" on cards; "Within 1 hr" filter; tie-break in ranking | Ranking golden tests updated; job tested with recorded responses | Transport for NSW key | 6 |

**Phase 2 total:** 34 days, plus 20% contingency (7), so about **8 weeks** (28 days without the deferred M18).

#### Phase 3 (spec §12), after launch

| # | Milestone | Main work | Done when | Needs | Days |
|---|---|---|---|---|---|
| M19 | Visitor accounts and sync (§12.1) | Separate visitor tables and cookie; passkeys (WebAuthn) and email magic links; plan sync with merge; export my data and delete my account; privacy page update | A visitor can't read another's data (tests); plans sync across two browsers | Owner: decide D1 vs Supabase (open question 11), an email service and sending domain | 10 |
| M20 | Group plans and voting (§12.2) | Group plan from a day, invite link, suggestions and votes, a Durable Object per group for live counts, organiser lock, Plan B as a vote, opt-in web push | Two-browser e2e for suggest, vote and lock; 12-member and 8-item limits | M19; Workers Paid plan for Durable Objects; open question 7 | 15 |
| M21 | Community tips (§12.3) | Tips table, automated screen, **Tips** queue in the admin, reports (3 hide a tip), Helpful votes, display on activity pages | Nothing appears unreviewed (tests) | M19; open question 8 (turnaround) | 8 |
| M22 | Translations (§12.4) | ICU messages on the M12.1 strings file; `/ko/…` routes and a language picker; locale maps in the activity record with an admin translation view; fallback per field | Pseudo-locale e2e passes; no layout breaks in long languages | M12.1; translators and reviewers | 10 |
| M23 | More cities (§12.5) | `city` column and routes (`/melbourne`); per-city time zone, holidays, daily fare cap (myki, go card), forecast areas and transit copy; each activity's trip from that city's centre written by hand (D14, no per-city trip planner); city switcher; city-aware admin | Melbourne launch set of 40 verified activities | Content for each city (as C1); the fare cap per city | 12 |

**Phase 3 total:** 55 days, plus 20% contingency (11), so about **13 weeks**, plus content and translation time.

**Order:** M24 and M12 → (launch) → M13 → M14 → M16 → M15 → M17 → (M18 deferred, D14) → M19 → M21 → M20 → M22 → M23. M13 and M14 are small and need little content; M16 comes before M15 because the forecast improves every visit, while events need a steady supply of editing.

## 8. Testing

- **Unit (Vitest):** all of `src/lib` against the golden fixtures, plus edge cases: blocked storage, 8-item and 14-day share limits, v1 links and plans, non-Opal legs, the way-in strip and last stretch, activities you can't drive to, overlaps, days it doesn't run, plans across the 4 Oct and 5 Apr daylight-saving changes, a start time in the skipped hour, public holidays, the weekday and weekend caps.
- **`.ics` validation:** generated files pass an RFC 5545 validator in CI, and are imported by hand into Apple Calendar, Google Calendar and Outlook once per release.
- **Contrast:** the worst-case background method in section 5.5 (acceptance 12).
- **Visual regression (Playwright screenshots):** Discover, an activity page and My plans in all four weathers, phone and desktop; text must not move between weathers (acceptance 23).
- **D1 and admin (Vitest):** the data layer (`src/server/activities.ts`) and auth run against the real migrations on Node's `node:sqlite` through a small D1-compatible adapter: optimistic locking, the publish gate, revisions and restore, passwords, sessions, invites, rate limits, the last-owner rule.
- **End to end (Playwright):** one test per acceptance criterion in spec §9 (1–33). The run builds the app, resets a separate local D1 (`SWF_STATE=.wrangler/e2e`), seeds it, and creates a throwaway owner with a random password; visitor tests run on phone and desktop first, then the admin tests one at a time. M12 adds WebKit and Firefox.
- **Performance:** Lighthouse CI on every PR with budgets for JS (150 KB gzipped, against the M0 baseline), scenes (40 KB) and fonts.
- **Manual:** VoiceOver on iOS and TalkBack on Android for Discover, the calendar, Add to a day, the map's stop list and the cost steppers; one pass on a three-year-old Android phone for frame rate.

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Daylight-saving and time-zone bugs | Plans or calendar events an hour out | All date logic in `Australia/Sydney` via date-fns-tz; `TZID` with `VTIMEZONE` in `.ics`; unit tests on both change days; acceptance 26 |
| Calendar apps read `.ics` differently | Events missing reminders or times | Validator in CI; manual import in three apps each release; keep to widely supported fields |
| Holiday rules change or a one-off holiday is declared | Wrong labels or fares on a holiday | Rules tested against the NSW Government table; review each November and add one-off days to the `EXTRA` list |
| `backdrop-filter` is slow on mid-range Android | Janky scrolling | Lower blur on small screens, limit glass layers, solid fallback; measure in M3 |
| Contrast over animated skies | Fails AA | Worst-case backgrounds (section 5.5) |
| JavaScript budget | Over 150 KB | Baseline in M0 (React is the biggest fixed cost); islands only where needed (section 3.3); Zod runs on the server and in the admin only, never on public pages; export code lazy-loaded; calendar code only on `/plan` |
| Islands drift out of sync | Two islands show different weather or plans | All shared state in nanostores (section 3.4); e2e tests change state in one island and check another |
| Hydration mismatches | Console errors, flicker | Device-dependent UI uses `client:only` or reads stores after mount; disable Cloudflare Auto Minify (Astro's Cloudflare guide) |
| Astro 7 compiler strictness | Build errors on ported markup | Valid HTML only; `astro check` in CI; mind `compressHTML: 'jsx'` whitespace |
| SVG mask "draw" animation in Safari | Lines flicker | Fall back to `stroke-dashoffset` on the path; decorative only |
| Routes change but maps don't | Map shows the wrong lines | Editors check the trip and its map at review and at the 6-month re-check; the optional weekly check (M9a) flags drift for Sydney |
| Hand-kept fares go stale | Transport estimate off by a dollar or two | The Opal daily cap bounds most day trips; fares and caps rechecked each July and at the 6-month re-check; the estimate is always a range marked est. |
| Content not verified in time | Launch slips | C1 from day one; editor tools in M1; draft gate makes status visible |
| Analytics cost or outage | Can't measure success | Plausible is low cost; events are fire-and-forget and never block the UI |
| Open-data terms | Compliance | Credit Transport for NSW (CC BY) in the footer; don't store Google data |
| Pages now depend on D1 at request time | An outage or slow query takes the site down or slows it | Network-first service worker serves cached pages; friendly error page (M12.6); small derived card and export columns so Discover is one query; measure TTFB after deploy and add edge caching if needed (M12.7) |
| Production set to preview mode by mistake | Drafts go live | `CONTENT_MODE` defaults to `preview` only in `wrangler.jsonc`; the go-live checklist (M11.11) sets `published`; the draft banner makes preview content obvious |
| Admin account takeover | Content defaced | Hashed passwords and sessions, rate limits, Origin checks, strict CSP, no-store; invites by hand only; owners can disable accounts at once; revisions allow a restore; D1 Time Travel as the last resort |
| Weekly job and admin edits disagree | An editor's fix is overwritten, or a report is stale | The job never writes content; it reports against the published copy and the editor applies changes (spec §4.3) |
| Workers and D1 costs grow | Unexpected bills | Free tier covers launch traffic (D1 reads are per row; Discover reads about 40 rows); set a billing alert; edge caching cuts reads if needed |
| Phase 3 needs Durable Objects and email | New vendors and plans | Decide in open question 11 before M19; keep visitor and admin accounts separate |

## 10. Definition of done for the MVP

- All 33 acceptance criteria in spec §9 pass in CI in Chromium, WebKit and Firefox, plus the manual calendar imports.
- 40 or more activities with `status: "verified"` published in production, each with a reviewed map; production runs with `CONTENT_MODE=published`, so no draft can go live.
- At least one owner and one editor account on the production admin; the editor guide (docs/editor-guide.md) handed over.
- Lighthouse mobile 90+ for Performance and Accessibility; budgets met.
- Works offline after the first visit; works with storage blocked; v1 plans and links migrate.
- Analytics events and error monitoring live; privacy page published.
- Getting there matches D14 (M24). The weekly trip check (M9a) runs only if the owner wants it.
- Footer credits for Transport for NSW and data.gov.au data.
- The canvas artboards for A match the shipped screens, or the differences are recorded in design/directions.md.

---

## Audit changes (1 October 2026)

| Finding | Change |
|---|---|
| Built the weekend planner the product had moved away from | Scope, routes, logic, components and milestones now cover any-day planning, the calendar and calendar export (M6, M7); spec and intent updated to match |
| Cloudflare Web Analytics can't record custom events | Plausible chosen; spec §7–8 and feasibility.md corrected |
| Prototype logic and scripts only existed in temporary folders | Copied to `design/prototype-logic/` with artboard snapshots; every check runs from the repo |
| Transport job underestimated | Split into M9a (5 days) and M9b (4 days) |
| Auto-updated routes could drift from hand-drawn maps | Drift check in M9a |
| No editor or map tooling | Custom admin on D1 with the map editor built in (M11); maps budgeted in C1 |
| No contingency | 20% added; total now about 15–16 weeks, or 13–14 without the transport job |
| M4 claimed a criterion that needs later screens | Criteria re-mapped to the milestones that deliver them |
| `next-pwa` unmaintained | Service worker from `workbox-build` (see the Astro switch below) |
| The font loader couldn't use a trimmed font | Astro Fonts API with a local file |
| JS budget unmeasured | Baseline in M0 |
| App-wide weather had nowhere to live | Carried in links (`?w=`) and remembered locally |
| Contrast over glass undefined | Worst-case background method (section 5.5) |
| No error monitoring or privacy page | Added to M0 and M10 |

## Stack change: Astro (1 October 2026)

At the owner's request the app moved from Next.js to **Astro 7 with React islands**, still hosted on **Cloudflare Workers** (static assets). Section 3 now defines the pages, which parts are static, which are inline scripts, and which are React islands with their hydration directives, plus the shared nanostores. Fonts use the Astro Fonts API; offline uses `workbox-build` because `@vite-pwa/astro` doesn't yet support Astro 7. Milestone scope and estimates are unchanged.

## Content change: D1 and a custom admin (1 October 2026)

At the owner's request, Decap CMS (git-backed JSON) was removed. Content lives in **Cloudflare D1**, public pages are **rendered on demand** from it (`output: "server"`), and a **custom admin** at `/admin` with built-in accounts replaces the CMS (TRACKER.md D10, D11; milestone M11). Sections 3.1, 3.2, 3.5, 6, 8, 9 and 10 are updated to match, and spec §4.5 describes the admin.

## Plan update: remaining work (1 October 2026)

Section 7 is split into what's built (7.1) and what's left (7.2): M12 closes the MVP gaps found in a spec audit (strings file, offline for every activity, WebKit and Firefox, the transport job reading D1, the stale-check flag, D1 errors, edge caching if needed); M13–M18 plan Phase 2 and M19–M23 Phase 3 on the same Workers and D1 stack. The spec now has acceptance criteria 30–33 (admin and offline) and open questions 11–12.

## Plan update: Getting there simplified (2 October 2026)

At the owner's decision (TRACKER.md D14), each activity's **Getting there** is one public transport trip from the city centre (Central), with the way-in strip, the last stretch to the door, the way back, **Directions from where you are** (opens Google Maps) and a short **Driving?** note with an optional rideshare line. The origin picker (Central, Circular Quay, Parramatta), the Transport / Drive / Rideshare switch, the Opal fare calculator, tolls and driving-time lookups are gone. Why: three trips per activity to keep checked (the first live Trip Planner check flagged 75 of 87), a fare calculator per fare system, and no hosted trip planner outside NSW for more cities. The canvas (Version 36), spec §3.2, §4.3, §6.6, §8, §9 (AC 16, 20, 21), §11.3 and §12.5 are updated. In this plan: scope, islands (`GettingThere` becomes static), `$trip`, repo layout, components, M9a narrowed, M9b dropped, new M24 (4 days), M18 deferred, M23, testing, risks and the definition of done.

## Plan update: the real map replaces the schematic (2 October 2026)

At the owner's decision (TRACKER.md D15), activity pages use only the real map. Each activity's `geo` holds its numbered places, walking line, toilets and cafés and the real route of the trip from Central and the way back, generated from OpenStreetMap and the Transport for NSW Trip Planner (`scripts/map/build-geo.mjs`, report in `.map-data/geo-report.md`) and checked by an editor in the admin's Places editor. The schematic map, its editor and its palette are removed; the R2 tiles become a launch step because activity maps depend on them (without them, pages show the numbered list and the directions link). M25 is done together with M24, since both rewrite the same route and map data.
