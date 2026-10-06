# Australia Activities Planner: feasibility

> **2 October 2026: Getting there is simplified** (decision D14). Each activity has one public transport trip from the city centre, the last stretch and a hand-kept Driving? note. The fare calculator, toll and driving-time services and the rideshare formula below are no longer needed; "Getting there and costs" is rewritten to match, with the original research kept where it still applies.

> **2 October 2026: the product is now called Australia Activities Planner** (decision D9). It launches with Sydney only; more cities are Phase 3 (spec §12.5). Older notes may use the earlier working name, Sydney Weekend Finder.

Researched 30 September 2026. This covers every feature in the design canvas and in `spec.md` (MVP, Phase 2, Phase 3): can it be built, can the information be kept accurate, what it costs, and which services to use.

Not legal advice. Figures marked *unverified* could not be confirmed on an official page and need a second look before you rely on them. Sources are listed at the end.

## Verdict

- **Everything in the design is buildable.** Nothing on the canvas needs a service that doesn't exist or is closed to a solo developer.
- **Running cost is $0 a month for the MVP and Phase 2** (since D7 analytics are Cloudflare only: Web Analytics plus Workers Analytics Engine for events; Plausible's US$9 a month is no longer needed), and about US$35 a month once accounts and group plans (Phase 3) outgrow a free database tier.
- **Calendar export needs no service:** `.ics` files are generated in the browser, and Google Calendar takes a plain link.
- **The real cost is your time, not money.** Three things are checked by hand: venue prices and hours, parking, and (since D14) each activity's one trip from the city. Budget about 2–3 hours a quarter at 29 activities, about 9 hours a quarter at 100.
- **Getting there needs no paid or per-state service** (D14). Only NSW offers a hosted trip planner; a hand-written trip from the city centre works in any city, and the cost estimate needs only each fare system's daily cap.
- **Two licensing traps to avoid:** Bureau of Meteorology data (not licensed for a public app) and Google data (can't be stored in your own database).
- **One thing in the data was wrong:** the transport cost estimate ignored the weekend Opal cap. Fixed; see "Corrections".

## Feature by feature

| Feature (where it appears) | Buildable | Can it stay accurate | Cost | Use |
|---|---|---|---|---|
| Activity list, filters, ranking, Plan B (Discover) | Yes, static | Ratings are editorial, so yes | $0 | JSON files in the repo |
| Weather picked by hand (MVP) | Yes | n/a | $0 | none |
| Real weekend forecast (Phase 2) | Yes | Good for temperature, indicative for rain at 3–5 days | $0 | Open-Meteo |
| Public transport trip from the city centre, last stretch (detail page) | Yes | By hand at review, plus an optional weekly check | $0 | Transport for NSW trip planner (by hand); Trip Planner API for the optional check |
| Opal fare and daily cap (detail page, cost estimate) | Yes, one fare per activity | By hand; caps and fares change each July | $0 | transportnsw.info fares page |
| Private ferry fares (Bundeena) | Yes | By hand, yearly | $0 | operator's price page |
| Driving time from the city (Driving? note) | Yes | By hand, as a typical time | $0 | your own notes |
| Tolls | Folded into the Driving? note's cost | By hand | $0 | your own notes (Toll Calculator API not needed since D14) |
| Parking cost | Yes | By hand only | $0 | your own notes per activity |
| Rideshare | One tip or warning, no price (D14) | Rarely changes | $0 | your own notes |
| Entry prices, opening hours | Yes | By hand only | $0 | venue websites, with a change-detection job |
| Schematic maps (MVP) | Yes, already drawn | Rarely change | $0 | the SVG data in `content/` |
| Real interactive map (Phase 2) | Yes | Yes | $0 | MapLibre + Protomaps extract on Cloudflare R2 |
| "Open in Google Maps" and "Directions from where you are" links | Yes | Yes | $0 | Google Maps URL, no key needed |
| Track closures, fire danger (Phase 2) | Yes | Yes, with fragile feeds | $0 | NSW National Parks feed, NSW Rural Fire Service feeds |
| Beach conditions | Link out only | n/a | $0 | link to Beachsafe; Beachwatch for water quality |
| My weekend, share by link | Yes, no back end | n/a | $0 | browser storage + URL |
| Photos | Yes | n/a | $0 | your own, Wikimedia Commons, Unsplash |
| Curated events and markets (Phase 2) | Yes, by hand | 1–2 hours a week | $0 | no usable feed; hand-curate |
| Accounts, group plans, voting (Phase 3) | Yes | n/a | $0, then US$25/month | Supabase |
| Community tips (Phase 3) | Yes | Needs moderation | $0 + your time | pre-moderation queue + OpenAI moderation |
| Hosting | Yes | n/a | $0 | Cloudflare Workers static assets |

## Getting there and costs

This is the part of the design with the most numbers, so it matters most. **Since D14 (2 Oct 2026)** each activity has one public transport trip from the city centre (Central), the last stretch to the door and a Driving? note, all hand-kept. The trip from the visitor's own street opens in Google Maps.

**Public transport: one trip per activity, checked by hand.**
- An editor writes the trip from Central (Saturday late morning) and checks it in the Transport for NSW trip planner during review and at the 6-month re-check.
- Optional: the Transport for NSW Trip Planner API (free, key needed, 60,000 calls a day, CC BY 4.0) can re-check all 29 trips weekly and flag drift. The first live run (2 Oct 2026), against the old three-origin content, flagged 75 of 87 journeys, mostly because the drafts predate the Metro, which is why the content check comes after the simplification.
- Earlier plan, dropped: about 75 journeys a week (25 activities × 3 origins), auto-checked. It tripled the checking and only works in NSW.

**Opal fares: no calculator.**
- The trip API stopped returning fares in October 2023, and a calculator from the Opal Fares dataset (distance bands, discounts, caps) was planned. D14 drops it.
- Each activity keeps one adult fare for the trip from Central, from the Transport for NSW trip planner, updated each July.
- Weekend caps, from the official fares page: **adult $9.65 a day, child $4.80 a day** on Friday, Saturday, Sunday and public holidays. Most day trips hit or approach the cap, so the estimate rarely depends on the exact fare.

**Private ferries: a small hand-kept table.**
- Cronulla to Bundeena does not take Opal. Current fares are $9.40 adult and $4.70 child each way, and they sit outside the Opal cap.

**Driving: a hand-kept note.**
- The Driving? note gives a typical drive time from the city, the parking, toll or park-entry cost per car, and tips. No service is needed.
- Not needed any more: the Transport for NSW Toll Calculator API (free, same key) and openrouteservice or OSRM for driving times.
- Google's Routes API would give traffic-aware times and tolls, but its terms restrict storing results and require a Google map, so it stays out.

**Parking: no feed exists.**
- The only open data is City of Sydney meter zones from 2019. Keep a one-line parking note per activity with a "last checked" date.

**Rideshare: no price.**
- Uber's price estimate API needs business approval and is effectively closed to new developers, and Uber publishes no per-kilometre rates for Sydney.
- The planned formula (base + per km + per minute) is dropped. Where it helps, the Driving? note has one rideshare sentence, a tip ("ride up, walk down, ferry home") or a warning ("not practical: a long, expensive ride").

**Other states** (*from general knowledge, not checked against each agency's site*)
- NSW is the only state with a free hosted trip planner API. Victoria (PTV), Queensland (Translink), South Australia (Adelaide Metro), Western Australia (Transperth), the ACT and Tasmania publish timetable (GTFS) and some live feeds, but nothing that plans a journey.
- Each state has its own fare card, caps and rules (myki, go card, metroCARD, SmartRider, MyWay+).
- With D14, more cities need only hand-written trips and each fare system's daily cap. A feature that computes travel times (spec §11.3, deferred) would need a self-hosted planner such as OpenTripPlanner loaded with each state's GTFS, or a paid API (e.g. SkedGo/TripGo, HERE).

## Weather

- **Do not use Bureau of Meteorology data directly.** There is no official public API; the undocumented one carries a notice against use without permission; the free forecast files are marked not for commercial use; and the default copyright terms forbid supplying the data to others. (The Bureau's own site blocked automated reading, so this comes from its mirror site and search results.)
- **Use Open-Meteo.** No key, CC BY 4.0, free for up to 10,000 calls a day. You need about 10–20 calls a day if the forecast is fetched by a scheduled job for a handful of areas.
- **The catch:** the free tier is non-commercial. If you add ads or paid features, the paid plan is about US$29 a month (*unverified*, third-party listing).
- **Accuracy:** the Bureau reports next-day temperature within 2 °C about 90% of the time, and rain probabilities are well calibrated. There are no official figures for 3–5 days out. So a Thursday forecast for Saturday is reliable for "hot or not" and only indicative for showers.
- **Design implication:** keep the manual weather picker as the override, show a rain chance rather than a flat "rainy", and refresh daily. The Plan B feature already handles a forecast that changes.

## Maps

- **MVP schematic maps** cost nothing and are already drawn for all 29 activities. Upkeep is near zero unless a route changes.
- **Phase 2 real map:** MapLibre (free, open source) with a Sydney extract of Protomaps tiles hosted on Cloudflare R2's free tier. No key, no quota, no monthly bill. Show "© OpenStreetMap contributors".
- **Alternatives if you'd rather not self-host:** Mapbox (50,000 free map loads a month, then US$5 per 1,000) or Google Maps (10,000 free loads a month, then US$7 per 1,000). MapTiler and Stadia have free tiers, but for non-commercial use only.
- **Walking track lines:** NSW National Parks publishes its tracks as open data (CC BY 4.0), which covers National Pass and the park sections of Spit to Manly. Bondi to Coogee is council land, so take it from OpenStreetMap. Allow 1–2 hours per route, once.
- **Toilets and cafés:** pull from OpenStreetMap once at build time and store the result. Coverage in Sydney is *unverified*; spot-check each activity.

## Safety and closure alerts

- **Fire danger and total fire bans:** the NSW Rural Fire Service publishes feeds under CC BY 4.0 and supports redistribution. Ratings only cover today and tomorrow, so Saturday's rating is not known until Friday.
- **Track closures:** NSW National Parks has an alerts feed. It is per park, in free text, sometimes drops connections, and its open licence is stated only by a third party (*unverified*). Show the alert text with a link to the official page; don't try to interpret it.
- **Beach conditions:** the Beachsafe service has no open licence. Link out to it. NSW Beachwatch has an open feed for water quality.
- **UV:** use Open-Meteo's forecast. The national UV feed is observations only and may not be shown alongside advertising.
- **Rule for all of these:** show the time fetched and a link to the source, and fall back to "check the official site" when a feed fails. These are safety-relevant, so a stale alert is worse than none.

## Venue prices, hours and events

- **No feed gives you ticket prices you may store.** This is the main accuracy risk in the design.
- **Australian Tourism Data Warehouse:** the national listings database (the same one that feeds sydney.com). Access is paid after a 30-day trial; pricing isn't published (*unverified* third-party figure: a few hundred dollars to set up, plus an annual fee). Listings are entered by operators, so freshness varies.
- **Google Places:** can tell you opening hours and whether a venue has closed, within its free tier at this scale. Its terms don't allow storing that content, and it has no adult/child prices. Useful as a live lookup or a "something changed" alarm only.
- **What works:** manual checks against each venue's own site, about 5 minutes per venue per quarter, plus a scheduled job that fingerprints each venue's price page and flags when it changes. Show "checked on [date]" and a link beside every price. The spec's `pricesChecked` and `lastVerified` fields already support this.
- **Events and markets:** no usable feed. Eventbrite closed public search in 2020; Humanitix only returns your own events; City of Sydney What's On has no public API that I could find. Hand-curate 5–10 recurring markets and link to organisers.

## Photos

- **Destination NSW's image library is not available** to a personal or commercial app without written agreement.
- **Usable:** your own photos, Wikimedia Commons (credit each image; avoid non-commercial licences), Unsplash (free for commercial use).
- Keep the source link and licence for every photo. The spec's `photo.credit` field covers display.

## Hosting and back end

- **MVP and Phase 2:** Cloudflare Workers static assets, free (Cloudflare now recommends Workers over Pages for new projects; the site is fully static, so no paid Worker usage). Scheduled jobs run free on GitHub Actions (public repo) or Cloudflare Workers.
- **Avoid Vercel's free plan if you ever monetise:** it is for non-commercial use only.
- **Phase 3:** Supabase free tier (50,000 monthly users, 500 MB) is enough to start. Free projects pause after a week without activity; the paid tier is US$25 a month.
- **Analytics:** Cloudflare Web Analytics is free and cookieless, but it **doesn't support custom events** (its FAQ: "Not yet"), so it can't count plans, shares or calendar exports. Use Plausible (cookieless, custom events, from about US$9/month) or self-hosted Umami. *(Corrected 1 Oct 2026 in the implementation-plan audit.)* **Superseded 6 Oct 2026 (D7):** Cloudflare only. Page views from Web Analytics; the custom events go to the app's own endpoint and Workers Analytics Engine (free on the Workers plans within daily write and query allowances, per Cloudflare's published limits; not re-checked today).

## Legal points for Phase 3

These only bite once you have accounts and user-written tips.

- **Privacy Act:** businesses under $3M turnover are currently exempt. A reform bill was released for consultation on 31 August 2026 and nothing has passed; whether it removes the exemption is *unverified*. Build as if covered: email-only accounts, minimal data, a privacy policy.
- **Defamation:** a site can be treated as the publisher of users' comments. NSW law since July 2024 gives a defence if you have a visible complaints route and act within 7 days. Pre-moderating tips plus a report button covers this.
- **Online Safety Act:** a plain information site has minimal obligations. Adding user posts may raise the tier and require a risk assessment (*exact tier unverified*).
- **Under-16 social media ban:** aimed at services whose main purpose is social interaction. A guide with moderated tips is probably outside it, but avoid profiles, follows and direct messages. (*My reading; the regulator's assessment page could not be loaded.*)
- **Price estimates:** under consumer law, small-print disclaimers don't fix a misleading overall impression. Put "est." and the checked date next to the number itself, which the design already does, and don't say "Free" where a booking fee applies.
- **Moderation tooling:** OpenAI's moderation endpoint is free. Don't adopt Google's Perspective API; it shuts down on 31 December 2026 (*third-party source*).

## Corrections (applied 1 October 2026)

Findings from this research that changed the content, the design canvas and the spec. All five are now done:

1. **Transport cost with the weekend Opal cap.** The formula (`spec.md` §6.6) now takes the lower of the return fare and the daily cap ($9.65 adult, $4.80 child). The four detail artboards use it, and say when the cap applies. Example: Three Sisters for 2 adults and 2 kids was $36–54 by public transport, now $29.
2. **Bundeena ferry fare.** `royal-np.json` now keeps the Opal train fare and the ferry fare ($9.40 adult, $4.70 child each way) separately, as `nonOpal` / `nonOpalChild`. The ferry is never capped, and the detail page says "Includes $9.40 ferry, not on Opal".
3. **Fares are computed, not hand-entered** (`spec.md` §4.3): a weekly job uses the Trip Planner API and an Opal calculator built from the Opal Fares dataset, from the MVP on. Tolls and driving time come from the same job; parking and rideshare stay hand-kept. *Superseded 2 Oct 2026 by D14: one hand-kept fare per activity, a hand-kept Driving? note, and an optional weekly trip check.*
4. **Services named in the spec:** Open-Meteo (§11.1), MapLibre with self-hosted Protomaps tiles, track data and alerts (§11.2), the Trip Planner job (§11.3), and hosting, scheduled jobs, data sources and analytics (§8).
5. **Weather source:** §11.1 now says why the Bureau of Meteorology isn't used directly, and how far to trust a Thursday forecast for Saturday.

Also updated from this research: acceptance criterion 18, the price-disclaimer rule in §6.6, and open questions 6 (photos) and 8 (moderation).

## Ongoing maintenance, in one place

| When | Task | Time |
|---|---|---|
| Weekly (automated) | Forecast; fingerprint venue pages; optional check of each trip from Central | none unless flagged |
| Weekly (Phase 2) | Curate events and markets | 1–2 hours |
| Quarterly | Verify prices, hours, parking and the trip from the city for each activity | 2–3 hours at 29, 9 hours at 100 |
| Yearly, July | Update the Opal caps and each activity's fare; check tolls and private ferry fares | 1–2 hours |
| Occasionally | Refresh map tiles | 1 hour |

## Not checked

- Whether the Trip Planner API returns the Bundeena ferry as a leg (matters only for the optional trip check).
- Other states' open transport data, terms and fare rules (the "Other states" notes are from general knowledge).
- Transport for NSW's full portal terms document (only the licence page was read).
- Whether Google returns transit fares for Sydney.
- OpenStreetMap coverage of toilets and cafés around each activity.
- Tourism data warehouse pricing and field-level content.
- Firebase, HERE and Mapbox Directions limits (secondary sources only).

## Sources

**Transport** (the Opal Fares dataset, Toll Calculator, openrouteservice and Uber links are kept for reference; D14 no longer uses them)
- Trip Planner APIs: https://opendata.transport.nsw.gov.au/dataset/trip-planner-apis
- API limits: https://opendata.transport.nsw.gov.au/developers/api-basics
- Data licence: https://opendata.transport.nsw.gov.au/datalicence
- Opal Fares dataset: https://opendata.transport.nsw.gov.au/dataset/opal-fares
- Adult Opal fares and caps: https://transportnsw.info/tickets-fares/fares/adult-opal-fares
- Toll Calculator API: https://opendata.transport.nsw.gov.au/dataset/toll-calculator-api
- Cronulla ferries prices: https://cronullaferries.com.au/price/
- Google Maps pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Google Routes policies: https://developers.google.com/maps/documentation/routes/policies
- openrouteservice limits: https://openrouteservice.org/restrictions/
- City of Sydney parking rates: https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::ticket-parking-rates-1
- Uber price estimates API: https://developer.uber.com/docs/riders/references/api/v1.2/estimates-price-get

**Weather, maps, alerts**
- Bureau of Meteorology data feeds: https://reg.bom.gov.au/catalogue/data-feeds.shtml
- Bureau of Meteorology copyright: https://reg.bom.gov.au/other/copyright.shtml
- Open-Meteo terms and pricing: https://open-meteo.com/en/terms, https://open-meteo.com/en/pricing
- MapLibre licence: https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt
- Protomaps downloads: https://docs.protomaps.com/basemaps/downloads
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Mapbox pricing: https://www.mapbox.com/pricing
- OpenStreetMap attribution: https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
- Google Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
- NSW National Parks alerts feed: https://www.nationalparks.nsw.gov.au/api/rssfeed/get
- NSW Rural Fire Service feeds: https://www.rfs.nsw.gov.au/news-and-media/stay-up-to-date/feeds
- Beachwatch data feeds: https://beachwatch.nsw.gov.au/waterMonitoring/beachwatchDataFeeds
- National Parks track data: https://datasets.seed.nsw.gov.au/dataset/asset-infrastructure-track-section8bfcf

**Content, platform, legal**
- Tourism data warehouse: https://atdw.com.au/faq/
- Google Places fields and policies: https://developers.google.com/maps/documentation/places/web-service/data-fields, https://developers.google.com/maps/documentation/places/web-service/policies
- Eventbrite changelog: https://www.eventbrite.com/platform/docs/changelog
- Humanitix API: https://help.humanitix.com/en/articles/8888275-public-api-documentation
- Destination NSW content terms: https://content.destinationnsw.com.au/content/terms-and-conditions
- Unsplash licence: https://unsplash.com/license
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Vercel fair use: https://vercel.com/docs/limits/fair-use-guidelines
- Supabase pricing: https://supabase.com/pricing
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Cloudflare Web Analytics: https://developers.cloudflare.com/web-analytics/about/ and FAQ (no custom events): https://developers.cloudflare.com/web-analytics/faq/
- Plausible: https://plausible.io/
- Privacy Act coverage: https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act/rights-and-responsibilities
- Privacy reform consultation: https://consultations.ag.gov.au/rights-and-protections/privacy-reform/
- Online safety industry codes: https://www.esafety.gov.au/industry/codes
- Social media age restrictions: https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions
- NSW defamation amendment: https://legislation.nsw.gov.au/view/pdf/asmade/act-2023-36
- Misleading claims guidance: https://www.accc.gov.au/consumers/advertising-and-promotions/false-or-misleading-claims
- OpenAI moderation: https://help.openai.com/en/articles/4936833-is-the-moderation-endpoint-free-to-use
