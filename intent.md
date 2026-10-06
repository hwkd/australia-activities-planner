# Intent: Australia Activities Planner (Sydney first)

> **2 October 2026: the product is now called Australia Activities Planner** (decision D9). It launches with Sydney only; more cities are Phase 3 (spec §12.5). Older notes may use the earlier working name, Sydney Weekend Finder.

> Updated 1 October 2026: plans can be made for any day, not just weekends (see [spec.md](spec.md) §3.3). The name may change (spec open question 9).

## Why this exists

Moving to a new country is lonely and disorienting, and weekends make it worse. New arrivals in Sydney know about the Opera House and Bondi, and not much else. They don't know which walks are worth the trip, how to get anywhere without a car, or that a clifftop walk in the rain, or a bushwalk on a 38° day, can ruin a Saturday.

Existing guides are written for tourists. They show everything at once, assume perfect weather, and don't help you choose. Newcomers don't need more options. They need help picking **one good thing for their next day out**, often a Saturday but just as often a public holiday, a day off or a weeknight dinner, that suits the weather and the people they're with.

## What we're building

A small, mobile-first app that answers one question:

> **"Given the weather and who I'm with, what should we do on our next day out?"**

It starts with Sydney. Every activity is rated for how well it works in sunny, cloudy, rainy and hot weather, and for who it suits (a date, friends, family or solo). You pick the conditions, the app shows what fits, and you plan it for any day and time, with a backup ready if the sky turns. Plans live in a simple calendar and can be added to the calendar you already use (Apple, Google or Outlook).

Each activity page then removes the last reasons not to go: whether it's good in today's weather, where exactly it is (a map with the route and the stops that matter), how to get there and back on public transport, what it will roughly cost your group, and what pairs well with it nearby.

## Who it's for

**Primary:** people in their first one to two years in Australia: international students, working-holiday makers, skilled migrants and their families, and people who have moved to Sydney for work.

They usually:
- don't have a car and rely on trains, buses, ferries and Opal
- are on a budget, so free and cheap options matter
- plan with someone: a new partner, new friends from work or uni, or kids
- may speak English as a second language, so plain, short copy helps

**Secondary:** long-time locals who are stuck in a rut, and visiting friends and family.

## What success looks like

- A newcomer opens the app on a Thursday night and has the next day out planned, with a time, in **under 2 minutes**.
- The plan **survives the weather**: when it rains, the app has already offered a good indoor alternative.
- People **share the plan** with the person or group they're going with, and **add it to their own calendar**.
- People **come back most weeks**, because there's always something they haven't tried.

Early signals to track: plans created per weekly user (and how many fall on weekdays and public holidays), share rate, calendar exports, how often Plan B is used, and return visits over consecutive weeks. These need an analytics tool with custom events (spec §7–8). Since D7 (Cloudflare only, no visitor identifier) they're measured as totals: per-user and return-visit figures aren't available.

## Principles

1. **Decide, don't browse.** Rank and filter hard. Hide what doesn't fit, and say how many were hidden.
2. **Weather is first-class.** Every activity has an honest rating for each kind of weather, with a reason. Never recommend a clifftop walk in the rain.
3. **Public transport first.** Every "getting there" explains the train, bus or ferry trip. Driving is the footnote.
4. **Written for newcomers.** Plain language, local know-how ("swim between the flags", "tap on with Opal or a card"), no insider jargon.
5. **Curated over crowdsourced.** Fewer activities, every one checked. Quality of the ratings is the product. Later, community tips can add colour, but editors own the list and the ratings.
6. **No sign-up to be useful.** Plans live on the device and are shared by link.
7. **Content stays honest.** Every activity records when it was last checked. Stale facts are worse than missing ones. Prices, fares and times are always shown as estimates, next to the date they were checked, never as exact figures.
8. **Calm, legible design.** The weather sets the mood of the whole interface, but never at the cost of reading: text doesn't move, resize or reflow when the sky changes, and every screen works without motion.

## Non-goals

**Not planned.** These would change what the product is:
- Booking, ticketing or payments
- Reviews and star ratings
- Social feeds or friend lists
- Nightlife and real-time event listings
- Native iOS and Android apps. A mobile web app (PWA) comes first.

**Not in the MVP, but planned for later.** Each item keeps the principles above:
- **Accounts:** optional sign-in to sync plans. Everything still works without one (principle 6).
- **Group plans with voting:** shared with the people you're going with, not a public feed.
- **Community tips:** short, moderated advice from other newcomers. They're never ratings, and editors still curate the activity list (principle 5).
- **Curated events:** a handful of highlights each fortnight, not a listings feed.
- **Cities other than Sydney.**

## Where it could go

The same weather × group × day model carries over to Melbourne, Brisbane and beyond. Translated content in the languages newcomers speak (e.g. Korean, Mandarin, Hindi, Spanish) could turn it into a first-year companion for new arrivals.

The phased roadmap is in [spec.md](spec.md):
- **Phase 2:** live forecast, map, travel time, events, accessibility filters.
- **Phase 3:** accounts, group plans, community tips, translations, more cities.

None of this should shape the MVP beyond keeping `city` and copy strings out of the hard-coded UI.
