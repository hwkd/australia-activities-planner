# Editor guide: the content admin

For whoever looks after the activities and events. Everything happens in the browser at **`/admin`**; you don't
need the code or any files.

## Signing in

- An owner sends you an **invite link** (valid 7 days, works once). Open it, add your name and choose a
  password (at least 12 characters; a few random words works well).
- Forgot your password? Ask an owner for a **reset link** (valid 1 day). There's no "email me" button:
  links are passed on by hand.
- After 5 wrong passwords for your email, sign-in pauses for 15 minutes.
- **Editors** edit and publish activities. **Owners** can also invite people, change roles, disable
  accounts and delete unpublished activities.

## How saving and publishing work

Each activity has a **draft** (what you're editing) and, once published, a **live** version (what
visitors see). They're separate:

1. **Save draft** (or Ctrl/Cmd+S) keeps your changes. The public site doesn't change.
2. **Preview draft** opens the activity page as it will look, visible only to signed-in editors.
3. **Publish** makes the saved draft live straight away. **Publish changes** does the same for an
   activity that's already live.
4. **Unpublish** takes it off the site. Activities that pair with it then show it as plain text.

The editor checks every field as you type (red messages next to the field, and a list at the top), and
won't save until they're fixed. Publishing also checks things across activities: pairings must point to
real activities.

If someone else saved the same activity while you were editing, you'll see "Someone else changed this
activity": reload to get their version (copy anything you want to keep first).

**History** lists every save, publish and restore with who did it. **Restore as draft** brings back an
old version as the draft; publish it to make it live.

## Checking an activity (turning a draft into verified)

Every activity starts with **Content status: Draft**. The live site shows only **Verified** activities
(spec §4.3); preview sites show drafts too, with a yellow banner.

1. **Getting there:** there's one public transport trip, from Central (the city centre). Check it in
   the Transport for NSW Trip Planner for a Saturday late-morning departure and fix the total time,
   changes, the adult Opal fare (each way, as a range), the steps (mode, line, instruction, minutes)
   and the **Getting back** text (always fill it in for one-way trips). Tick "Includes a leg that isn't
   on Opal" for private ferries and enter their fares.
   - **Driving?** tick **You can drive there** and give the drive time from the city, the **cost per
     car** (parking, tolls or park entry, as a range), what that covers (e.g. "Parking, 3 hrs") and any
     parking tips. If you can't drive there, leave it unticked and say why (e.g. "It's car-free and
     only reached by ferry").
   - **Rideshare (optional):** one sentence, a tip or a warning. Leave it empty if there's nothing
     useful to say. Never give a price.
2. **Costs:** check entry prices (adult and child) and extras on the venue's own website. Prices are
   ranges ("$45 to $50").
3. **Hours and days:** check opening hours. If it only runs on some days, tick them under "Runs only on".
   Tick **Booking required** if tickets must be booked ahead.
4. **Safety and access:** check against NSW National Parks or the venue. Never guess access information.
5. **Map:** see "Checking the map" below. When the places and lines are right, press **Map checked
   today**.
6. **Make a day of it:** 2–3 nearby activities, each chosen from the list. A day trip with little else near it (Newcastle, Kiama, the Hawkesbury) can have one, or a suggestion for the evening back in town; never leave it empty.
6a. **Our tip:** when you write advice or an observation that no official page confirms (a car park
   that fills by 9am, a path that gets crowded, quieter mornings), put it in its own sentence starting
   "Our tip:", e.g. "Parking near the beach is metered. Our tip: it fills by 9am on warm weekends." The
   page shows it with an "Our tip" label. Facts you've confirmed on an official page get no label.
6b. **Notice:** for something temporary that changes the visit (a track closure, works, a venue
   closed for a season), fill in **Notice** with what's affected and until when, and link the page with
   the latest (the NSW National Parks alert, the venue's notice). It shows at the top of the activity
   page. Remove it when it no longer applies, and check NSW National Parks alerts for every bushwalk
   when you recheck an activity.
7. **Not yet confirmed:** anything you couldn't confirm with an official source (a car park that
   doesn't publish its rates, the last ferry time, a price only resellers list) goes under **Not yet
   confirmed**, with the section it belongs to and one plain sentence written for visitors that says
   which figure is a guess ("The $15–30 parking estimate for The Rocks is a guess: car parks there don't
   publish casual rates."). Add **How to check** wherever a visitor can find the answer themselves: the
   page that has it (the car park operator, the council, the Transport for NSW timetable, NSW National
   Parks; Google Maps for café menus) or `tel:+61…` for a number to call, with link text naming the
   source ("Wilson Parking: The Domain", "Call Wylie's Baths"). Open the link first: it must be the
   right page, not a home page. Keep your best estimate in the field itself. The activity page shows
   these lines in their section as "Not yet confirmed". When someone confirms one, correct the detail
   and press **Confirmed: remove**. An unconfirmed detail doesn't stop an activity being verified.
8. When everything is checked: set **Content status: Verified**, **Last verified** and **Prices
   checked** to today, save, then publish.

## Writing a new activity

**+ New activity** on the list. Give it a name; the ID (its page address) is made from the name and
can't be changed later. Start from a blank activity or **a copy** of a similar one (the copy keeps the
map, getting there and costs to adapt, but starts as an unverified draft with no pairings and its map
unchecked). A blank activity's map has one start place at Circular Quay: move it to the real start.

Keep the blurb under 90 characters, the weather note under 160, and the getting-there summary and
newcomer tip under 240 (the counters show how close you are). Use second person, plain English, short
sentences and Australian spelling.

Weather: **Perfect** the weather makes it better or doesn't affect it; **Fine** it still works but with
a real downside (say what in the weather note); **Skip** unsafe, miserable or pointless in that weather.

## Events

**Events** (in the admin menu) are a few curated highlights: around **3 to 10 a fortnight**, the ones
worth planning a day around. They're not a listings feed, so leave out anything you wouldn't recommend
to a friend. Visitors see events on in the next 14 days in an **On soon** row on Discover and can add
them to a day, but only on the event's own dates.

- **+ New event**: give it a name; the ID (`e-…`, used by plans and share links) is made from it and
  can't be changed later. Start blank or from **a copy** of a similar event (the copy keeps the venue,
  link, weather and who it suits, but starts with no dates and unchecked).
- A new event can be saved half-written, but **Publish** stays off until every field is filled in and
  valid (the list at the top says what's missing).
- **Dates** must cover only days it's on: the first and last day, inclusive. If it skips days (say,
  Fridays only), don't stretch one event across the gaps; use the next run of days, or make separate
  events.
- **Check it against the official page** (dates, times, price, venue) and put that page in the link.
  Then set **Checked** to the day you did (the **Checked today** button) before publishing. Re-check if
  anything changes.
- **Linked activity** is optional: use it when the event is at a place that's already an activity (a
  festival at the Botanic Garden, say). That activity must be published first.
- Events **leave the site by themselves** after their last day; there's nothing to unpublish. Saving,
  publishing, history and **Restore as draft** work as for activities. Owners can delete an event that
  isn't on the site.

## Things that need a person, not a tool

- Fares and route details are estimates until the weekly transport job is running (tracker M9a/M9b).
- Parking costs and the rideshare sentence have no data source; check them by hand each quarter.
- Public holidays are calculated from the NSW rules; if the Government declares a one-off holiday, a
  developer adds it to `src/lib/holidays.ts` (the `EXTRA` list).

## For developers

- Content lives in **Cloudflare D1** (`db/migrations/`); `db/seed/activities/*.json` only seeds a fresh
  database (local development and tests).
- `npm run db:reset` recreates the local database; `ADMIN_PASSWORD=… npm run db:user -- --email … --name … --role owner`
  creates an account (the only way to create the first owner). Add `--remote` for the real database.
- Production must set `CONTENT_MODE` to `published` (wrangler.jsonc `vars`), so drafts can't go live.

## Checking the map

Each activity page shows a real street map: the numbered places, the walking line, toilets and cafés,
and the real route of the trip from Central (and the way back for one-way trips). For the first 29
activities this was generated from open data by a script, so **every map needs checking** before the
activity is verified. `.map-data/geo-report.md` (ask a developer) lists the places the script
couldn't find and placed by estimate, and trips whose lines don't match the written route: start with
those.

**Map places** (the numbered places):

- The list on the right and the map on the left are the same places. Select a row and its pin is
  highlighted; select a pin and its row is.
- **Drag a pin** to move its place, or type its **longitude** and **latitude** (from the venue's
  page or a map app: right-click a spot in Google Maps to copy its coordinates, latitude first).
  Everything works with the boxes alone if the map can't show.
- Give each place a short **name**, a **type** (Start, Finish, Beach, Pool, Lookout, Food, Stop or
  Paid attraction) and a **note** a visitor would find useful ("Calm, sheltered inlet. Good for a
  snorkel.").
- Keep them in the order a visitor reaches them: ↑ and ↓ reorder, and the numbers follow (1, 2, 3…).
  The first is usually the Start. **+ Add place** adds one at the end of the list, placed on the map
  next to the selected place; ✕ removes one.

**Map lines and facilities** (drawn on the same map, read-only there):

- **Walking line and facilities:** paste GeoJSON and choose **Use this GeoJSON**. Lines replace the
  walking line; points tagged as toilets or cafés replace the facilities; places are never touched.
  For walks in a national park, use NSW National Parks open data (CC BY 4.0) where it differs from
  OpenStreetMap. A developer can fetch an OSM route with
  `node scripts/map/osm-trail.mjs --name "<route name>"`.
- **Trip from Central** and **Way back:** paste GeoJSON with one line per leg, in order, then set each
  leg's mode and line (e.g. train, T4). Remove the way back for trips that come back the same way.
- Set **Source** (e.g. "OpenStreetMap contributors (ODbL), Transport for NSW (CC BY 4.0)") and, once
  you've checked everything against the official map, **Map checked today**. Save and publish.

To start a map again from open data, a developer runs
`node --env-file=.dev.vars scripts/map/build-geo.mjs --write <activity id>`, which rewrites that
activity's seed file and the report; its lines can then be pasted here.

Fire danger ratings and total fire bans from the NSW RFS show on outdoor activities automatically;
there's nothing to edit.
