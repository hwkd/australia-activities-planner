# Australia Activities Planner — Product Plan

> **2 October 2026: the product is now called Australia Activities Planner** (decision D9). It launches with Sydney only; more cities are Phase 3 (spec §12.5). Older notes may use the earlier working name, Sydney Weekend Finder.

A simple app that helps people who are new to Australia find things to do and plan their days out (weekends, public holidays or any day) with a partner, friends or family. It starts with Sydney.

Prototype (clickable phone design): https://claude.ai/artifact/3DefgcrPvBH4JCFK3qrYJX

---

## 1. The problem

Newcomers (international students, working-holiday makers, new migrants, people who have just moved for work):

- don't know what's worth doing beyond the famous landmarks
- don't know how to get there without a car (Opal, ferries, trains to the Blue Mountains)
- get caught out by the weather: a coastal walk in the rain, or a clifftop hike on a 38° day
- plan around who's coming: a date, a group of friends, or kids

The app answers one question: **"Given the weather and who I'm with, what should we do on our next day out?"**

## 2. Core user flow

1. **Discover**: pick the weather (Sunny / Cloudy / Rainy / Hot 30°+) and who's coming (Date / Friends / Family / Solo). The app ranks activities by how well they suit that weather and hides the ones that don't, with a count of what was hidden.
2. **Activity detail**: a weather check (Great / OK / Skip for each condition, with a reason), who it's good for, how to get there on public transport, cost, duration and a newcomer tip.
3. **My plans**: add activities to any day at a chosen time, see them in a calendar, and set each day's sky. The app flags anything that doesn't suit that day and suggests a **Plan B** you can swap in with one tap. Plans can be added to Apple Calendar, Google Calendar or Outlook.
4. **Share**: send the plan to your date or group as a link.

## 3. Activity data model

The content is the product. Every activity follows one schema:

```ts
type Weather = "sunny" | "cloudy" | "rainy" | "hot";
type Fit = 0 | 1 | 2;                 // 0 skip, 1 ok, 2 great
type Group = "date" | "friends" | "family" | "solo";

interface Activity {
  id: string;
  name: string;
  city: "sydney";                     // future: melbourne, brisbane…
  area: string;                       // "Eastern Suburbs", "Blue Mountains"
  category: string;                   // coastal walk, museum, beach, market…
  weatherFit: Record<Weather, Fit>;
  weatherNote: string;                // why: "exposed clifftops, slippery when wet"
  goodFor: Group[];
  duration: { label: string; minHours: number; maxHours: number };
  cost: "Free" | "$" | "$$" | "$$$";
  gettingThere: string;               // public-transport first
  transitMinsFromCBD?: number;
  newcomerTip: string;
  safetyNotes?: string[];             // swim between the flags, carry water, track closures
  bookingRequired?: boolean;
  seasonal?: { months: number[]; note: string };  // e.g. whale watching May–Nov
  days?: ("sat" | "sun")[];           // markets that only run on certain days
  location: { lat: number; lng: number };
  links?: { label: string; url: string }[];
  photos?: string[];
  lastVerified: string;               // ISO date, for keeping content fresh
}
```

## 4. Seed content: Sydney (target 40–60 for launch)

The prototype has 29 (22 to start, plus Clovelly, Coogee, North Head, Cronulla, Carriageworks, Parramatta and Leura, added so every "Make a day of it" suggestion links to an activity). Candidates to add, by category:

| Category | Activities |
|---|---|
| Coastal walks | Bondi → Coogee, Spit → Manly, Hermitage Foreshore, Royal NP (Bundeena / Jibbon), Barangaroo Reserve |
| Beaches & pools | Manly / Shelly Beach, Balmoral, Bondi Icebergs, Wylie's Baths (Coogee), Cronulla, Palm Beach |
| Blue Mountains & bush | Three Sisters & Echo Point, Wentworth Falls National Pass, Scenic World, Lane Cove NP, Ku-ring-gai Chase (West Head lookout) |
| Ferries & harbour | Manly ferry, Watsons Bay & The Gap, Cockatoo Island, Parramatta River ferry, Taronga Zoo by ferry, kayaking at The Spit |
| Landmarks | Opera House tour, Harbour Bridge walk / Pylon Lookout / BridgeClimb, Sydney Observatory, Luna Park |
| Museums & galleries (rain-proof) | Art Gallery of NSW, Australian Museum, MCA, Hyde Park Barracks, Powerhouse, White Rabbit Gallery, SEA LIFE Aquarium |
| Markets & food | The Rocks Markets, Glebe Markets, Carriageworks Farmers Market, Sydney Fish Market, Chinatown / Haymarket, Cabramatta food trip |
| Neighbourhoods | Newtown & King St, Surry Hills cafés, Paddington, Parramatta, Marrickville |
| Wildlife | Featherdale Wildlife Park, Taronga Zoo, whale watching (seasonal) |
| Parks & gardens | Royal Botanic Garden, Centennial Park, Chinese Garden of Friendship, Wendy's Secret Garden |
| Seasonal & events | Vivid Sydney, New Year's Eve fireworks spots, Sculpture by the Sea, outdoor cinemas |

Each entry needs its weather rating double-checked. That judgement is what the app is really for.

## 5. Tech approach

**Phase 1: a mobile-first web app (PWA)**, so there's no app-store friction and it's easy to share links.

- **Frontend**: Astro 7 + TypeScript + Tailwind, with React islands for interactive parts, deployed on Cloudflare Workers (static assets). Details in implementation-plan.md §3.
- **Content**: activities kept as typed JSON/TS files in the repo, validated with Zod. This is the fastest way to write and review 50 entries. Move to a CMS or Supabase later.
- **Plan storage**: localStorage first. A shareable plan is encoded in the URL, so no accounts are needed.
- **Weather**: Phase 2 pre-selects each day's forecast using Open-Meteo (free, no API key). The user can still override it.
- **Maps**: Phase 2, with MapLibre or Leaflet and OpenStreetMap tiles.

## 6. Milestones

| Phase | Scope |
|---|---|
| **0: Prototype** (done) | Clickable design: Discover, Detail, My weekend with Plan B, then the My plans calendar, Add to a day and calendar export |
| **1: MVP** | Web app with the three screens, 40+ Sydney activities, filters (weather, group, free, duration), an any-day planner with a calendar, export to the user's calendar, and a share-by-link |
| **2: Smarter planning** | Live forecast for the coming week, a map view, travel time from the user's suburb, seasonal and event activities, a "surprise me" pick |
| **3: Grow** | Accounts and saved plans, community tips, more languages for newcomers (e.g. Korean, Mandarin, Hindi, Spanish), Melbourne and Brisbane |

## 7. Open questions

- ~~Is the planning unit a whole weekend, or single days and public holidays too?~~ Decided 1 Oct 2026: any day, with a start time (spec §3.3).
- Should cost be a tier ($) or an approximate AUD price? Prices go stale, and tiers are easier to maintain.
- How do we keep content accurate (transport routes, prices, track closures)? A `lastVerified` date and a quarterly review are proposed.
- Should "Hot" be a fixed threshold (30°+) or relative to the season?
- Do we eventually want accessibility filters (pram-friendly, wheelchair access, no stairs)?
