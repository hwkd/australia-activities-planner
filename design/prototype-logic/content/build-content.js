// Builds content/sydney/*.json for all 22 activities.
// Basic fields come from engine.js, the three worked examples from detail-engine.js,
// and the 19 others from the DATA table below. All fares and prices are ESTIMATES.
const fs = require("fs");
const path = require("path");
const HERE = __dirname;
const OUT = path.join(__dirname, "../../../content/sydney");

global.DCLogic = class { constructor(p) { this.props = p || {}; } setState() {} };
const load = (f) => new (new Function(fs.readFileSync(path.join(HERE, f), "utf8") + "; return Component;")())({});
const basic = {}; load("../engines/discover-engine.js").acts.forEach((a) => { basic[a.id] = a; });
const worked = load("../engines/detail-engine.js").ACTS;

// ---------- shared helpers ----------
const W = (title, mins, detail) => ({ mode: "walk", title, mins, ...(detail ? { detail } : {}) });
const T = (line, title, mins, detail) => ({ mode: "train", line, title, mins, ...(detail ? { detail } : {}) });
const B = (line, title, mins, detail) => ({ mode: "bus", ...(line ? { line } : {}), title, mins, ...(detail ? { detail } : {}) });
const F = (line, title, mins, detail) => ({ mode: "ferry", ...(line ? { line } : {}), title, mins, ...(detail ? { detail } : {}) });
const C = (title, mins, detail) => ({ mode: "car", title, mins, ...(detail ? { detail } : {}) });
const T1C = T("T1", "Western line to Central", 28);

// How you reach each city hub from each origin: legs + adult Opal fare estimate [min, max].
const HUB = {
  quay: {
    central: { legs: [T("City Circle", "Train to Circular Quay", 8, "Any City Circle train")], fare: [3, 4] },
    quay: { legs: [], fare: [0, 0] },
    parra: { legs: [T1C, T("City Circle", "Train to Circular Quay", 8)], fare: [5, 7] }
  },
  wynyard: {
    central: { legs: [T("City", "Train to Wynyard", 5, "Any train via Town Hall")], fare: [3, 4] },
    quay: { legs: [W("Walk to Wynyard", 10)], fare: [0, 0] },
    parra: { legs: [T("T1", "Western line to Wynyard", 33)], fare: [5, 7] }
  },
  townhall: {
    central: { legs: [T("City", "Train to Town Hall", 3, "Any train towards the city")], fare: [3, 4] },
    quay: { legs: [T("City Circle", "Train to Town Hall", 5)], fare: [3, 4] },
    parra: { legs: [T("T1", "Western line to Town Hall", 31)], fare: [5, 7] }
  },
  stjames: {
    central: { legs: [T("City Circle", "Train to St James", 5)], fare: [3, 4] },
    quay: { legs: [T("City Circle", "Train to St James", 3)], fare: [3, 4] },
    parra: { legs: [T1C, T("City Circle", "Train to St James", 5)], fare: [5, 7] }
  },
  museum: {
    central: { legs: [T("City Circle", "Train to Museum", 3)], fare: [3, 4] },
    quay: { legs: [T("City Circle", "Train to Museum", 5)], fare: [3, 4] },
    parra: { legs: [T1C, T("City Circle", "Train to Museum", 3)], fare: [5, 7] }
  },
  central: {
    central: { legs: [], fare: [0, 0] },
    quay: { legs: [T("City Circle", "Train to Central", 8)], fare: [3, 4] },
    parra: { legs: [T1C], fare: [5, 6] }
  },
  bondij: {
    central: { legs: [T("T4", "Eastern Suburbs line to Bondi Junction", 12, "Frequent on weekends")], fare: [3, 4] },
    quay: { legs: [W("Walk to Martin Place", 9), T("T4", "Eastern Suburbs line to Bondi Junction", 9)], fare: [3, 4] },
    parra: { legs: [T1C, T("T4", "Eastern Suburbs line to Bondi Junction", 12)], fare: [6, 8] }
  }
};

// CBD base map, shared by the eight city-centre activities (400 x 300, schematic).
const CBD = {
  land: [
    "M0 300 V110 C20 104 40 102 60 100 L96 96 C106 88 114 78 120 70 C128 60 134 54 142 52 C150 52 156 58 158 66 C160 78 162 88 166 94 C172 102 184 102 190 94 C196 84 198 66 204 58 C208 54 212 58 214 68 C218 84 220 92 226 98 C240 108 262 108 274 98 C282 90 286 72 290 62 C294 58 298 66 298 78 C300 94 302 104 306 110 C314 122 330 120 336 108 C342 94 346 78 352 70 C360 66 368 76 372 84 C378 98 382 106 384 110 C390 116 396 116 400 116 V300 Z",
    "M104 0 H236 C230 14 214 24 192 26 C172 28 152 22 140 14 C126 8 114 4 104 0 Z"
  ],
  water: ["M60 100 C58 130 62 170 70 200 C76 208 86 208 90 198 C92 170 92 130 96 96 Z"],
  lines: {
    ccw: { kind: "train", d: "M180 270 C172 240 170 215 170 190 L160 135 C160 118 168 106 178 102", label: "City Circle", lx: 102, ly: 222 },
    cce: { kind: "train", d: "M180 270 C198 250 214 225 215 195 L215 160", label: "City Circle", lx: 222, ly: 238 },
    cqe: { kind: "train", d: "M178 102 C196 104 212 130 215 160 L215 195", label: "City Circle", lx: 224, ly: 128 },
    t1: { kind: "train", d: "M0 288 C60 286 130 280 180 270", label: "T1 from Parramatta", lx: 8, ly: 278 },
    car: { kind: "car", d: "M0 250 C60 246 120 236 168 214", label: "Drive in", lx: 20, ly: 240 }
  },
  stops: {
    central: { x: 180, y: 270, name: "Central", kind: "train" }, townhall: { x: 170, y: 190, name: "Town Hall", kind: "train" },
    wynyard: { x: 160, y: 135, name: "Wynyard", kind: "train" }, quay: { x: 178, y: 102, name: "Circular Quay", kind: "train" },
    stjames: { x: 215, y: 160, name: "St James", kind: "train" }, museum: { x: 215, y: 195, name: "Museum", kind: "train" }
  },
  labels: [{ x: 322, y: 40, text: "Sydney Harbour", water: true }, { x: 120, y: 166, text: "City", water: false }]
};
// Build a CBD-based map: pick base lines and stops by id, then add the activity's own layers.
const cbd = (o) => ({
  land: CBD.land, water: CBD.water, valley: [],
  trail: o.trail, trailLabel: o.trailLabel,
  lines: o.base.map((id) => ({ id, ...CBD.lines[id] })).concat(o.lines || []),
  pois: o.pois, stops: o.stops.map((k) => CBD.stops[k]), fac: o.fac || [],
  labels: CBD.labels.concat(o.labels || [])
});
const toi = (x, y) => ({ kind: "toilet", x, y }), caf = (x, y) => ({ kind: "cafe", x, y });
const P = (n, x, y, name, type, note) => ({ n, x, y, name, type, note });

// ---------- the 19 activities ----------
const DATA = {
  "spit-manly": {
    facts: [["Time", "3–4 hrs"], ["Distance", "10 km one way"], ["Effort", "Moderate, some steep steps"], ["Entry", "Free"]],
    dest: { lat: -33.8035, lng: 151.2460, label: "Spit Bridge" },
    map: {
      land: ["M0 0 H400 V230 C392 220 380 190 372 150 C364 132 356 124 350 120 C332 108 314 104 300 110 C282 116 268 128 262 140 C256 156 252 168 250 180 C246 204 240 222 230 230 C212 246 186 250 170 240 C152 228 142 212 130 200 C116 186 102 176 90 170 C72 162 54 154 40 150 C26 146 12 150 0 156 Z",
        "M0 300 V196 C16 190 30 188 40 190 C60 196 80 220 90 250 C96 270 100 286 100 300 Z"],
      water: [], valley: [],
      trail: "M42 146 C60 150 76 158 90 164 C106 172 118 184 128 194 C140 208 152 224 166 232 C186 242 210 238 226 222 C238 210 242 194 246 178 C250 162 252 148 258 138 C268 122 282 110 298 106 C316 102 334 108 348 116",
      trailLabel: "Spit to Manly walk, 10 km",
      lines: [
        { id: "bus", kind: "bus", d: "M0 286 C20 260 34 222 40 190 L40 152", label: "Bus from Wynyard", lx: 48, ly: 270 },
        { id: "f1", kind: "ferry", d: "M350 124 C332 180 296 250 264 300", label: "F1 ferry back to the city", lx: 250, ly: 282 },
        { id: "car", kind: "car", d: "M0 250 C14 228 28 204 38 188", label: "Drive via Military Rd", lx: 104, ly: 292 }
      ],
      pois: [
        P(1, 42, 146, "Spit Bridge", "start", "Start on the north side of the bridge, at Ellery's Punt Reserve."),
        P(2, 90, 164, "Clontarf Beach", "beach", "Calm harbour beach with a netted swimming area, toilets and a kiosk."),
        P(3, 128, 194, "Castle Rock Beach", "beach", "Small, quiet beach down a flight of steps."),
        P(4, 166, 232, "Grotto Point", "lookout", "Side track to a little lighthouse and harbour views."),
        P(5, 226, 222, "Dobroyd Head", "lookout", "Aboriginal rock engravings and the big view to the Heads."),
        P(6, 250, 178, "Reef Beach", "beach", "Sheltered beach looking across to Manly."),
        P(7, 262, 140, "Forty Baskets Beach", "beach", "Harbour pool and a grassy picnic spot."),
        P(8, 348, 116, "Manly Wharf", "end", "Finish here. Ferries to Circular Quay leave from the wharf.")
      ],
      stops: [{ x: 40, y: 170, name: "Spit Bridge stop", kind: "bus" }, { x: 350, y: 124, name: "Manly Wharf", kind: "ferry" }],
      fac: [toi(50, 134), toi(96, 154), toi(336, 102), caf(84, 152), caf(356, 100)],
      labels: [{ x: 96, y: 236, text: "Middle Harbour", water: true }, { x: 308, y: 176, text: "North Harbour", water: true }, { x: 180, y: 120, text: "Balgowlah Heights", water: false }]
    },
    pt: { hub: "wynyard", tail: [B(null, "Bus to Spit Bridge", 25, "Northern Beaches buses from Wynyard"), W("Cross to the start of the track", 3)], tailFare: [3, 5],
      lines: ["bus"], back: { text: "It's one way. From Manly Wharf, the F1 ferry takes you back to Circular Quay in about 30 min.", lines: ["f1"] } },
    drive: { mins: { central: 25, quay: 22, parra: 45 }, perCar: [10, 20], perCarLabel: "Parking, 4 hrs", title: "Drive to Spit Bridge", detail: "Via the Harbour Bridge and Military Rd", park: "Park and walk to the track", lines: ["car"],
      notes: ["Parking near the bridge is limited and mostly metered.", "It's a one-way walk: take a bus from Manly back to your car."] },
    ride: { each: { central: [35, 50], quay: [30, 45], parra: [70, 95] }, title: "Rideshare to Spit Bridge", notes: ["Good for a one-way walk: ride to the Spit, then take the ferry home from Manly."] },
    costs: { entry: [0, 0], extras: [["food", "Fish & chips in Manly", [15, 25], true], ["ferry", "Coffee and snacks on the way", [8, 12], false]] },
    visit: {
      bestTime: "Start by 9am so you reach Manly for lunch. The bush sections are shaded, the headlands are not.",
      hours: "Always open. Parts can close after storms or in fire danger: check NSW National Parks alerts.",
      bring: ["2 litres of water", "Walking shoes", "Swimmers & towel", "Sunscreen & hat"],
      facilities: ["Toilets at the Spit, Clontarf and Manly", "Kiosk at Clontarf, cafés in Manly"],
      access: "Bush track with stairs, rocks and some steep sections. Not suitable for prams or wheelchairs.",
      safety: ["Carry water: there are few taps on the track", "Check the tide: a short section near Clontarf can flood at high tide"]
    },
    pairs: [["Ferry to Manly & Shelly Beach", "Swim, then ferry home", "At the finish"], ["Balmoral Beach", "Calm harbour swim", "≈ 10 min by bus from the Spit"]]
  },

  "wentworth": {
    facts: [["Time", "3–4 hrs"], ["Distance", "5 km loop"], ["Effort", "Hard, steep stairs"], ["Entry", "Free"]],
    dest: { lat: -33.7255, lng: 150.3760, label: "Wentworth Falls picnic area" },
    map: {
      land: ["M0 0 H400 V300 H0 Z"], water: [],
      valley: ["M0 168 C50 176 100 160 150 176 C190 190 230 172 270 184 C320 198 360 186 400 192 V300 H0 Z"],
      trail: "M210 140 C212 152 214 160 216 168 C224 176 232 180 238 182 C220 200 170 204 124 190 C116 176 112 162 112 150 C140 140 176 138 210 140",
      trailLabel: "National Pass loop, 5 km",
      lines: [
        { id: "bmt", kind: "train", d: "M400 40 C330 42 260 44 200 46", label: "Blue Mountains Line", lx: 270, ly: 34 },
        { id: "walkF", kind: "walk", d: "M200 46 C204 80 208 110 210 140", label: "Walk 30 min", lx: 216, ly: 96 },
        { id: "car", kind: "car", d: "M400 84 C330 96 270 116 214 136", label: "Via the M4", lx: 300, ly: 122 }
      ],
      pois: [
        P(1, 200, 46, "Wentworth Falls Station", "start", "Walk down Falls Rd, or follow the Charles Darwin Walk along the creek."),
        P(2, 210, 140, "Falls picnic area", "lookout", "Toilets, car park and Jamison Lookout. The loop starts here."),
        P(3, 238, 182, "Wentworth Falls", "lookout", "Stepping stones across the top of the falls, then stairs down."),
        P(4, 180, 202, "National Pass", "lookout", "A ledge track cut into the cliff, with the Grand Stairway."),
        P(5, 124, 190, "Valley of the Waters", "lookout", "A string of cascades, then a steep climb out."),
        P(6, 112, 150, "Conservation Hut", "food", "Café at the top of the climb, with valley views.")
      ],
      stops: [{ x: 200, y: 46, name: "Wentworth Falls", kind: "train" }],
      fac: [toi(222, 132), toi(100, 144), caf(100, 158), caf(186, 58)],
      labels: [{ x: 250, y: 262, text: "Jamison Valley", water: true }, { x: 110, y: 70, text: "Wentworth Falls", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("BMT", "Blue Mountains Line to Wentworth Falls", 105, "Roughly hourly on weekends"), W("Down Falls Rd to the picnic area", 30)], fare: [6, 9] },
        quay: { legs: [T("City Circle", "Train to Central", 8), T("BMT", "Blue Mountains Line to Wentworth Falls", 105, "Roughly hourly on weekends"), W("Down Falls Rd to the picnic area", 30)], fare: [6, 9] },
        parra: { legs: [T("BMT", "Blue Mountains Line to Wentworth Falls", 78, "Stops at Parramatta"), W("Down Falls Rd to the picnic area", 30)], fare: [5, 8] }
      },
      lines: ["bmt", "walkF"], back: { text: "Same way back. Check the time of the last train before you start the loop.", lines: ["bmt"] }
    },
    drive: { mins: { central: 95, quay: 100, parra: 70 }, perCar: [8, 20], perCarLabel: "M4 toll, est.", title: "Drive via the M4 and Great Western Hwy", detail: "Tolled section on the M4", lines: ["car"],
      notes: ["The picnic area car park fills by mid-morning on weekends.", "Driving lets you add Leura or Katoomba on the same day."] },
    ride: null, unavailable: { ride: "Rideshare isn't practical for this trip: it's a long, expensive ride. The train is the easy option." },
    costs: { entry: [0, 0], extras: [["food", "Lunch at the Conservation Hut", [18, 30], true]] },
    visit: {
      bestTime: "Start by 10am. The falls are best after rain, but the stairs are not: wait for a dry day.",
      hours: "Always open. Tracks close after rockfalls or heavy rain: check NSW National Parks alerts before you go.",
      bring: ["Sturdy shoes", "2 litres of water", "A warm layer", "Snacks"],
      facilities: ["Toilets at the picnic area and Conservation Hut", "Café at the Conservation Hut"],
      access: "Hundreds of steep steps and narrow ledges. Not suitable for prams, wheelchairs or anyone uneasy with heights.",
      safety: ["Stay on the track and behind railings", "Tell someone your plan: phone signal drops in the valley"]
    },
    pairs: [["Three Sisters & Echo Point", "The classic lookout", "Two stops up the line"], ["Leura Mall", "Cafés and gardens", "One stop up the line"]]
  },

  "botanic": {
    facts: [["Time", "1–2 hrs"], ["Distance", "2 km one way"], ["Effort", "Easy, mostly flat"], ["Entry", "Free"]],
    dest: { lat: -33.8590, lng: 151.2160, label: "Queen Elizabeth II Gate" },
    map: cbd({
      trail: "M206 80 C214 90 220 96 226 98 C240 108 262 108 274 98 C282 90 286 78 290 68", trailLabel: "Farm Cove foreshore walk, 2 km",
      base: ["ccw", "t1", "car"], stops: ["central", "quay"],
      lines: [{ id: "walkQ", kind: "walk", d: "M178 102 C188 96 198 88 206 80", label: "Walk 6 min", lx: 100, ly: 124 }],
      pois: [
        P(1, 206, 80, "Queen Elizabeth II Gate", "start", "The garden gate beside the Opera House forecourt."),
        P(2, 250, 106, "Farm Cove seawall", "lookout", "Flat harbourside path with skyline views."),
        P(3, 246, 134, "The Calyx & Palm Grove", "food", "Indoor plant displays, a café and shady lawns."),
        P(4, 300, 100, "Boy Charlton Pool", "pool", "Outdoor harbour-side pool, open in the warmer months."),
        P(5, 290, 68, "Mrs Macquarie's Chair", "end", "The classic Opera House and Harbour Bridge photo spot.")
      ],
      fac: [toi(236, 120), toi(284, 84), caf(256, 142), caf(216, 96)],
      labels: [{ x: 250, y: 84, text: "Farm Cove", water: true }]
    }),
    pt: { hub: "quay", tail: [W("Around the Opera House to the garden gate", 6)], tailFare: [0, 0], lines: { central: ["ccw", "walkQ"], quay: ["walkQ"], parra: ["t1", "ccw", "walkQ"] },
      back: { text: "From Mrs Macquarie's Chair, walk back through the garden or up to Martin Place station (≈ 15 min).", lines: [] } },
    drive: { mins: { central: 12, quay: 8, parra: 40 }, perCar: [15, 30], perCarLabel: "Parking, 2 hrs", title: "Drive to Mrs Macquaries Rd", detail: "Metered parking along the road", park: "Walk into the garden", lines: ["car"],
      notes: ["Metered parking on Mrs Macquaries Rd is limited on sunny weekends.", "The train to Circular Quay is usually quicker."] },
    ride: { each: { central: [14, 22], quay: [10, 16], parra: [60, 85] }, title: "Rideshare to the Opera House gate", notes: ["Ask to be dropped at the Opera House forecourt on Macquarie St."] },
    costs: { entry: [0, 0], extras: [["food", "Picnic supplies or a café lunch", [12, 25], true], ["pool", "Boy Charlton Pool entry", [7, 9], false]] },
    visit: {
      bestTime: "Early morning or the hour before sunset, when the light on the Opera House is best.",
      hours: "Opens at 7am daily. Closing time changes with the season, from about 5pm in winter to 8pm in summer.",
      bring: ["Picnic rug", "Sunscreen & hat", "Water bottle", "Camera"],
      facilities: ["Toilets near the Palm Grove and Mrs Macquarie's Chair", "Cafés at the Palm Grove and The Calyx"],
      access: "Paved and mostly flat. Good for prams and wheelchairs, with some gentle slopes.",
      safety: ["There's little shade on the seawall: cover up in summer"]
    },
    pairs: [["Sydney Opera House Tour", "Right next door", "At the start"], ["Art Gallery of NSW", "Free art, 5 min walk", "Beside the garden"]]
  },

  "opera-tour": {
    facts: [["Time", "1 hr tour"], ["Walk", "7 min from the station"], ["Effort", "Easy, many stairs inside"], ["Entry", "Tour ticket"]],
    dest: { lat: -33.8568, lng: 151.2153, label: "Sydney Opera House" },
    map: cbd({
      trail: "M178 102 C190 98 200 82 206 62", trailLabel: "East Circular Quay promenade",
      base: ["ccw", "t1", "car"], stops: ["central", "quay"],
      pois: [
        P(1, 178, 102, "Circular Quay Station", "start", "Trains, ferries, buses and light rail all stop here."),
        P(2, 194, 90, "East Circular Quay", "lookout", "Harbourside promenade with the bridge behind you."),
        P(3, 200, 74, "Opera Bar", "food", "Drinks and food on the lower concourse, right on the water."),
        P(4, 206, 60, "Welcome Centre", "end", "Tours meet here, under the Monumental Steps."),
        P(5, 216, 84, "Botanic Garden gate", "lookout", "Step straight into the garden after the tour.")
      ],
      fac: [toi(210, 70), caf(190, 78)]
    }),
    pt: { hub: "quay", tail: [W("Along East Circular Quay to the Opera House", 7)], tailFare: [0, 0], lines: { central: ["ccw"], quay: [], parra: ["t1", "ccw"] },
      back: { text: "Same way back, from Circular Quay.", lines: [] } },
    drive: { mins: { central: 12, quay: 5, parra: 40 }, perCar: [20, 45], perCarLabel: "Opera House car park, 2 hrs", title: "Drive to the Opera House car park", detail: "Entry from Macquarie St", park: "Lift up to the forecourt", lines: ["car"],
      notes: ["The car park is pricey. Public transport to Circular Quay is easier."] },
    ride: { each: { central: [14, 22], quay: [10, 15], parra: [60, 85] }, title: "Rideshare to the Opera House", notes: ["Drop-off is on Macquarie St, a 3 min walk from the steps."] },
    costs: { entry: [45, 50], entryChild: [25, 30], extras: [["food", "A drink at Opera Bar", [12, 20], false]] },
    visit: {
      bestTime: "Morning tours are quieter. Book a day or two ahead on weekends.",
      hours: "Tours run daily, roughly 9am to 5pm. The forecourt and steps are always open.",
      bring: ["Your booking on your phone", "Comfy shoes", "A light layer"],
      facilities: ["Toilets and cloakroom inside", "Bars and restaurants on the lower concourse"],
      access: "The standard tour has about 300 steps. A step-free access tour runs on set days: ask when you book.",
      safety: ["Large bags must be cloaked"]
    },
    pairs: [["Royal Botanic Garden & Mrs Macquarie's Chair", "Walk it off after", "Next door"], ["The Rocks Markets", "Weekend stalls", "≈ 12 min walk"]]
  },

  "agnsw": {
    facts: [["Time", "2–3 hrs"], ["Walk", "10 min from St James"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.8688, lng: 151.2174, label: "Art Gallery of NSW" },
    map: cbd({
      trail: "M215 160 C232 152 256 146 276 142", trailLabel: "Walk through the Domain",
      base: ["cce", "cqe", "t1", "car"], stops: ["central", "quay", "stjames"],
      pois: [
        P(1, 215, 160, "St James Station", "start", "Use the Hyde Park exit, then cross towards the cathedral."),
        P(2, 238, 186, "St Mary's Cathedral", "lookout", "The big sandstone cathedral on the edge of Hyde Park."),
        P(3, 250, 148, "The Domain", "lookout", "Open parkland. Follow Art Gallery Rd."),
        P(4, 276, 142, "Art Gallery, original building", "end", "Australian, Aboriginal and European collections. Free entry."),
        P(5, 292, 132, "Naala Badu building", "lookout", "The newer wing, with contemporary art and harbour terraces.")
      ],
      fac: [toi(268, 150), caf(284, 146), caf(222, 148)],
      labels: [{ x: 250, y: 84, text: "Farm Cove", water: true }]
    }),
    pt: { hub: "stjames", tail: [W("Through the Domain to the gallery", 10)], tailFare: [0, 0], lines: { central: ["cce"], quay: ["cqe"], parra: ["t1", "cce"] },
      back: { text: "Same way back, or walk down through the Botanic Garden to Circular Quay (≈ 20 min).", lines: [] } },
    drive: { mins: { central: 10, quay: 8, parra: 40 }, perCar: [15, 30], perCarLabel: "Domain car park, 3 hrs", title: "Drive to the Domain car park", detail: "Entry from Sir John Young Cres", park: "Moving walkway up to the Domain", lines: ["car"],
      notes: ["Street parking on Art Gallery Rd is metered and scarce."] },
    ride: { each: { central: [14, 22], quay: [12, 18], parra: [60, 85] }, title: "Rideshare to Art Gallery Rd", notes: [] },
    costs: { entry: [0, 0], extras: [["show", "Ticketed exhibition", [25, 35], false], ["food", "Gallery café", [12, 25], true]] },
    visit: {
      bestTime: "Any time. Wednesday evenings the gallery stays open late.",
      hours: "Open daily 10am to 5pm, and until late on Wednesdays.",
      bring: ["A small bag only", "Headphones for the audio guide"],
      facilities: ["Toilets, lockers and a cloakroom", "Cafés in both buildings"],
      access: "Step-free entries and lifts in both buildings. Wheelchairs can be borrowed.",
      safety: ["Big backpacks need to go in the cloakroom"]
    },
    pairs: [["Royal Botanic Garden & Mrs Macquarie's Chair", "Harbour views, 5 min away", "Next door"], ["Australian Museum", "Another free museum", "≈ 12 min walk"]]
  },

  "aus-museum": {
    facts: [["Time", "2 hrs"], ["Walk", "5 min from Museum station"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.8743, lng: 151.2131, label: "Australian Museum" },
    map: cbd({
      trail: "M215 195 C224 190 232 188 242 190", trailLabel: "Walk across Hyde Park",
      base: ["cce", "cqe", "t1", "car"], stops: ["central", "quay", "stjames", "museum"],
      pois: [
        P(1, 215, 195, "Museum Station", "start", "Use the Liverpool St / Hyde Park exit."),
        P(2, 204, 178, "Anzac Memorial", "lookout", "War memorial and reflection pool in Hyde Park. Free."),
        P(3, 242, 190, "Australian Museum", "end", "Entrance on William St, opposite Hyde Park."),
        P(4, 256, 172, "Cook + Phillip Park", "pool", "Indoor pools next door."),
        P(5, 246, 154, "St Mary's Cathedral", "lookout", "Two minutes' walk north.")
      ],
      fac: [toi(250, 198), caf(250, 184)]
    }),
    pt: { hub: "museum", tail: [W("Across Hyde Park to William St", 5)], tailFare: [0, 0], lines: { central: ["cce"], quay: ["cqe"], parra: ["t1", "cce"] },
      back: { text: "Same way back. It's also a 20 min walk down to Central.", lines: [] } },
    drive: { mins: { central: 8, quay: 10, parra: 38 }, perCar: [15, 30], perCarLabel: "Parking, 2 hrs", title: "Drive to a car park near Hyde Park", detail: "Several paid car parks on William St", park: "Short walk to the entrance", lines: ["car"], notes: ["There's no museum car park. Weekend flat rates at nearby car parks are usually the best deal."] },
    ride: { each: { central: [12, 18], quay: [12, 18], parra: [58, 80] }, title: "Rideshare to William St", notes: [] },
    costs: { entry: [0, 0], extras: [["show", "Ticketed exhibition", [20, 30], false], ["food", "Rooftop café", [12, 22], true]] },
    visit: {
      bestTime: "Go at opening time with kids. It gets busy on rainy weekends.",
      hours: "Open daily, roughly 10am to 5pm.",
      bring: ["A small bag", "A light layer: it's air-conditioned"],
      facilities: ["Toilets, parents' room and lockers", "Café with city views on the top floor"],
      access: "Step-free entry on William St, lifts to every floor.",
      safety: ["Rainy weekends get crowded: agree on a meeting spot if you have kids with you"]
    },
    pairs: [["Art Gallery of NSW", "Free art", "≈ 12 min walk"], ["Haymarket & Chinatown Food Crawl", "Dinner after", "≈ 15 min walk"]]
  },

  "taronga": {
    facts: [["Time", "Half day"], ["Ferry", "12 min each way"], ["Effort", "Moderate, hilly paths"], ["Entry", "Ticket"]],
    dest: { lat: -33.8433, lng: 151.2411, label: "Taronga Zoo Wharf" },
    map: {
      land: ["M0 0 H400 V130 C380 140 360 150 344 170 C336 186 330 204 322 214 C312 206 306 186 300 172 C290 164 278 160 266 160 C240 156 220 140 196 136 C150 128 100 140 60 128 C36 122 16 126 0 122 Z",
        "M0 300 V226 C30 220 56 232 80 238 C110 246 130 262 138 300 Z"],
      water: [], valley: [],
      trail: "M266 160 C270 154 272 150 274 146 C262 134 288 128 280 116 C272 106 286 100 292 96", trailLabel: "Zoo paths, wharf to top entrance",
      lines: [
        { id: "f2", kind: "ferry", d: "M72 240 C130 222 200 196 266 164", label: "F2 ferry, 12 min", lx: 120, ly: 206 },
        { id: "cc", kind: "train", d: "M40 300 C50 276 60 256 72 240", label: "City Circle from Central", lx: 8, ly: 292 },
        { id: "car", kind: "car", d: "M0 60 C80 56 180 70 292 94", label: "Drive via Military Rd", lx: 60, ly: 50 }
      ],
      pois: [
        P(1, 72, 240, "Circular Quay", "start", "Zoo ferries leave from Wharf 4."),
        P(2, 266, 160, "Taronga Zoo Wharf", "stop", "Buses meet each ferry and run up to the top entrance."),
        P(3, 274, 146, "Lower entrance", "paid", "Enter here to walk uphill, or ride up and walk down."),
        P(4, 276, 126, "Seals & harbour terraces", "lookout", "Seal shows and the famous giraffes-with-skyline view."),
        P(5, 286, 110, "Australian walkabout", "lookout", "Kangaroos, wallabies, emus and the koala encounter."),
        P(6, 292, 96, "Top entrance", "end", "Main plaza, shop and bus stop.")
      ],
      stops: [{ x: 72, y: 240, name: "Circular Quay", kind: "ferry" }, { x: 266, y: 160, name: "Taronga Zoo Wharf", kind: "ferry" }],
      fac: [toi(288, 136), toi(300, 104), caf(298, 120), caf(262, 138)],
      labels: [{ x: 190, y: 234, text: "Sydney Harbour", water: true }, { x: 150, y: 86, text: "Mosman", water: false }, { x: 362, y: 116, text: "Bradleys Head", water: false }]
    },
    pt: { hub: "quay", tail: [W("Walk to Wharf 4", 3), F("F2", "Ferry to Taronga Zoo", 12, "Every 30 min on weekends"), W("Up to the lower entrance", 4)], tailFare: [7, 9],
      lines: { central: ["cc", "f2"], quay: ["f2"], parra: ["cc", "f2"] }, back: { text: "Same way back. The last ferries leave around closing time: check before you go in.", lines: ["f2"] } },
    drive: { mins: { central: 22, quay: 20, parra: 45 }, perCar: [20, 30], perCarLabel: "Zoo car park, all day", title: "Drive via the Harbour Bridge", detail: "Then Military Rd and Bradleys Head Rd", park: "Car park to the top entrance", lines: ["car"], notes: ["The zoo car park fills by late morning on sunny weekends.", "A toll applies coming back across the harbour."] },
    ride: { each: { central: [35, 50], quay: [30, 45], parra: [70, 95] }, title: "Rideshare to the top entrance", notes: ["Ride up, walk down through the zoo, and take the ferry home."] },
    costs: { entry: [50, 55], entryChild: [30, 35], extras: [["food", "Lunch inside the zoo", [18, 30], true], ["koala", "Koala or giraffe encounter", [30, 40], false]] },
    visit: {
      bestTime: "Arrive at opening, when the animals are most active. Start at the top and walk downhill.",
      hours: "Open daily, roughly 9:30am to 4:30pm, later in summer.",
      bring: ["Sunscreen & hat", "Water bottle", "Walking shoes", "Tickets on your phone"],
      facilities: ["Toilets and water refill points throughout", "Cafés and kiosks at both ends"],
      access: "Steep hillside. There's an accessible route and lifts, and wheelchairs and strollers can be hired.",
      safety: ["It's mostly outdoors: plan shade breaks on hot days"]
    },
    pairs: [["Balmoral Beach", "Swim after", "≈ 15 min by bus"], ["Walk across the Harbour Bridge", "Add a sunset walk", "From Circular Quay"]]
  },

  "watsons": {
    facts: [["Time", "Half day"], ["Ferry", "≈ 25 min each way"], ["Effort", "Easy to moderate"], ["Entry", "Free"]],
    dest: { lat: -33.8447, lng: 151.2819, label: "Watsons Bay Wharf" },
    map: {
      land: ["M190 300 C200 270 222 250 240 226 C252 208 250 190 262 176 C272 164 268 150 276 138 C284 124 296 112 302 96 C306 80 312 62 322 52 C330 46 338 50 340 60 C344 90 340 120 342 150 C346 200 352 250 356 300 Z",
        "M0 300 V236 C30 230 60 240 86 246 C112 252 126 272 130 300 Z"],
      water: [], valley: [],
      trail: "M262 176 C284 178 312 182 336 182 C334 160 316 140 288 128 C294 114 298 104 302 96 C310 78 320 64 330 56", trailLabel: "South Head heritage trail",
      lines: [
        { id: "f9", kind: "ferry", d: "M78 246 C130 236 200 210 258 178", label: "F9 ferry", lx: 130, ly: 218 },
        { id: "cc", kind: "train", d: "M44 300 C52 280 62 262 76 248", label: "City Circle from Central", lx: 8, ly: 228 },
        { id: "car", kind: "car", d: "M150 300 C190 288 236 250 266 190", label: "Drive via New South Head Rd", lx: 160, ly: 296 }
      ],
      pois: [
        P(1, 78, 246, "Circular Quay", "start", "Watsons Bay ferries leave from Wharf 2. Check the board."),
        P(2, 262, 176, "Watsons Bay Wharf", "stop", "Fish and chips, a beach and a pub right at the wharf."),
        P(3, 286, 186, "Robertson Park", "food", "Shady lawn for a picnic, with playground and toilets."),
        P(4, 336, 182, "The Gap", "lookout", "Dramatic ocean cliffs. Stay behind the fence."),
        P(5, 288, 128, "Camp Cove", "beach", "Small, calm harbour beach with a kiosk."),
        P(6, 330, 56, "Hornby Lighthouse", "end", "Red-and-white lighthouse at the tip of South Head.")
      ],
      stops: [{ x: 78, y: 246, name: "Circular Quay", kind: "ferry" }, { x: 262, y: 176, name: "Watsons Bay Wharf", kind: "ferry" }],
      fac: [toi(296, 196), toi(298, 138), caf(272, 190), caf(278, 120)],
      labels: [{ x: 140, y: 140, text: "Sydney Harbour", water: true }, { x: 378, y: 120, text: "Tasman Sea", water: true }, { x: 290, y: 262, text: "Vaucluse", water: false }]
    },
    pt: { hub: "quay", tail: [W("Walk to the ferry wharf", 3), F("F9", "Ferry to Watsons Bay", 25, "About every 30–60 min on weekends"), W("Off the wharf into Robertson Park", 2)], tailFare: [7, 9],
      lines: { central: ["cc", "f9"], quay: ["f9"], parra: ["cc", "f9"] }, back: { text: "Ferry back to Circular Quay, or a bus along New South Head Rd to the city (≈ 45 min).", lines: ["f9"] } },
    drive: { mins: { central: 30, quay: 28, parra: 55 }, perCar: [0, 15], perCarLabel: "Parking", title: "Drive via New South Head Rd", detail: "Through Rose Bay and Vaucluse", park: "Street parking near Robertson Park", lines: ["car"], notes: ["Street parking is free but time-limited, and very hard to find on sunny weekends."] },
    ride: { each: { central: [35, 50], quay: [35, 50], parra: [80, 110] }, title: "Rideshare to Watsons Bay", notes: ["Ride one way and take the ferry back for the harbour views."] },
    costs: { entry: [0, 0], extras: [["food", "Fish & chips by the wharf", [15, 25], true]] },
    visit: {
      bestTime: "A clear, calm day. Late afternoon gives you sunset over the city from the wharf.",
      hours: "Always open. Check the last ferry back: weekend services finish early evening.",
      bring: ["Sunscreen & hat", "A wind jacket", "Swimmers for Camp Cove", "Water"],
      facilities: ["Toilets at Robertson Park and Camp Cove", "Cafés, a pub and takeaways at the wharf"],
      access: "The wharf, park and The Gap lookout are step-free. The trail to the lighthouse has stairs and uneven ground.",
      safety: ["Stay behind the cliff fences at The Gap", "Lady Bay, on the trail, is a nude beach: be aware if you're with kids"]
    },
    pairs: [["Bondi to Coogee Coastal Walk", "More clifftops", "≈ 20 min by bus to Bondi"], ["Royal Botanic Garden & Mrs Macquarie's Chair", "Stroll after the ferry", "At Circular Quay"]]
  },

  "bridge-walk": {
    facts: [["Time", "1 hr"], ["Distance", "1.5 km one way"], ["Effort", "Easy, stairs at each end"], ["Entry", "Free"]],
    dest: { lat: -33.8590, lng: 151.2070, label: "Bridge Stairs, Cumberland St" },
    map: cbd({
      trail: "M150 72 C146 64 144 58 146 52 L160 24 C162 20 164 16 166 12", trailLabel: "Bridge footpath, 1.5 km",
      base: ["ccw", "t1", "car"], stops: ["central", "wynyard", "quay"],
      lines: [
        { id: "walkQ", kind: "walk", d: "M178 102 C168 96 158 84 150 72", label: "Walk 10 min", lx: 100, ly: 124 },
        { id: "ns", kind: "train", d: "M166 12 C174 50 164 100 160 135", label: "Train back to Wynyard", lx: 176, ly: 46 }
      ],
      pois: [
        P(1, 150, 72, "Bridge Stairs", "start", "On Cumberland St in The Rocks. Follow the signs for the pedestrian walkway."),
        P(2, 146, 50, "Pylon Lookout", "paid", "Climb 200 steps inside the pylon for the view. Small entry fee."),
        P(3, 153, 38, "Mid-span", "lookout", "Opera House on one side, ferries below."),
        P(4, 166, 12, "Milsons Point Station", "end", "Trains back to the city in 4 minutes."),
        P(5, 148, 16, "Luna Park & Bradfield Park", "food", "Harbourside park under the bridge, with the fun park next door.")
      ],
      fac: [toi(140, 78), caf(156, 84), caf(176, 16)]
    }),
    pt: { hub: "quay", tail: [W("Through The Rocks to the Bridge Stairs", 10)], tailFare: [0, 0], lines: { central: ["ccw", "walkQ"], quay: ["walkQ"], parra: ["t1", "ccw", "walkQ"] },
      back: { text: "It's one way. From Milsons Point, any city-bound train reaches Wynyard in 4 min, or take a ferry from the wharf below.", lines: ["ns"] } },
    drive: { mins: { central: 12, quay: 6, parra: 40 }, perCar: [20, 40], perCarLabel: "Parking in The Rocks, 2 hrs", title: "Drive to The Rocks", detail: "Paid car parks only", park: "Walk to Cumberland St", lines: ["car"], notes: ["Parking in The Rocks is expensive. The train is much easier."] },
    ride: { each: { central: [14, 22], quay: [10, 15], parra: [60, 85] }, title: "Rideshare to Cumberland St", notes: [] },
    costs: { entry: [0, 0], extras: [["pylon", "Pylon Lookout entry", [20, 30], false], ["food", "Coffee in The Rocks or Kirribilli", [6, 12], true]] },
    visit: {
      bestTime: "Early morning or the hour before sunset. Midday is hot and exposed.",
      hours: "The footpath is always open. The Pylon Lookout keeps daytime hours.",
      bring: ["Sunscreen & hat", "Water", "Camera"],
      facilities: ["Toilets in The Rocks and at Milsons Point", "Cafés at both ends"],
      access: "Stairs at the Rocks end. There is a lift at the Milsons Point end, so step-free walkers should start or finish there and return the same way.",
      safety: ["The footpath is on the eastern side. Cyclists use the western side."]
    },
    pairs: [["The Rocks Markets", "Browse before you climb", "At the start"], ["Sydney Opera House Tour", "See both icons", "≈ 15 min walk"]]
  },

  "rocks-markets": {
    facts: [["Time", "1–2 hrs"], ["Walk", "5 min from the station"], ["Effort", "Easy, cobbled streets"], ["Entry", "Free"]],
    dest: { lat: -33.8585, lng: 151.2085, label: "The Rocks Markets" },
    map: cbd({
      trail: "M178 102 C170 98 164 92 160 84 C158 76 156 70 152 64", trailLabel: "George St to Dawes Point",
      base: ["ccw", "t1", "car"], stops: ["central", "wynyard", "quay"],
      pois: [
        P(1, 178, 102, "Circular Quay Station", "start", "Turn left out of the station and follow George St north."),
        P(2, 160, 84, "The Rocks Markets", "end", "Stalls along George St and Playfair St on Saturdays and Sundays."),
        P(3, 144, 88, "Historic pubs", "food", "Some of Sydney's oldest pubs are a block back from the market."),
        P(4, 170, 74, "Campbells Cove", "lookout", "Old sandstone warehouses with a front-row Opera House view."),
        P(5, 152, 62, "Dawes Point Park", "lookout", "Grass and cannons right under the Harbour Bridge.")
      ],
      fac: [toi(150, 76), caf(166, 90), caf(156, 94)]
    }),
    pt: { hub: "quay", tail: [W("Up George St into The Rocks", 5)], tailFare: [0, 0], lines: { central: ["ccw"], quay: [], parra: ["t1", "ccw"] }, back: { text: "Same way back, from Circular Quay.", lines: [] } },
    drive: { mins: { central: 12, quay: 5, parra: 40 }, perCar: [20, 40], perCarLabel: "Parking in The Rocks, 2 hrs", title: "Drive to The Rocks", detail: "Paid car parks only", park: "Walk to George St", lines: ["car"], notes: ["Streets around the market are closed to cars on market days."] },
    ride: { each: { central: [14, 22], quay: [10, 14], parra: [60, 85] }, title: "Rideshare to George St", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Street food lunch", [12, 22], true], ["gift", "A souvenir or two", [10, 40], false]] },
    visit: {
      bestTime: "Late morning, before the lunch crowd. Markets run Saturday and Sunday, roughly 10am to 5pm.",
      hours: "Weekends only, roughly 10am to 5pm. The laneways and pubs are open every day.",
      bring: ["A tote bag", "A card: most stalls take contactless", "Sunscreen"],
      facilities: ["Public toilets off George St", "Food stalls, cafés and pubs all around"],
      access: "Mostly flat along George St, but with cobbles and some steep side lanes.",
      safety: ["The cobbles and sandstone steps get slippery in the rain"]
    },
    pairs: [["Walk across the Harbour Bridge", "Stairs are 5 min away", "Next door"], ["Sydney Opera House Tour", "Across the quay", "≈ 12 min walk"]]
  },

  "cockatoo": {
    facts: [["Time", "Half day"], ["Ferry", "≈ 20 min each way"], ["Effort", "Easy to moderate"], ["Entry", "Free"]],
    dest: { lat: -33.8476, lng: 151.1718, label: "Cockatoo Island Wharf" },
    map: {
      land: ["M0 0 H400 V60 C340 70 300 64 250 76 C200 86 150 70 100 78 C60 84 30 76 0 80 Z",
        "M0 300 V232 C50 222 100 236 150 228 C210 218 260 232 310 222 C350 216 380 224 400 220 V300 Z",
        "M150 120 C176 104 236 100 270 112 C292 120 298 144 286 160 C268 180 214 186 176 176 C150 168 136 136 150 120 Z"],
      water: [], valley: [],
      trail: "M290 136 C280 138 274 140 270 140 C252 130 236 126 220 128 C210 138 204 146 200 150 C192 156 186 158 180 160 C206 172 234 172 256 166 C264 156 268 148 270 140", trailLabel: "Island loop, about 2 km",
      lines: [
        { id: "fcity", kind: "ferry", d: "M400 166 C366 162 326 148 292 138", label: "Ferry from Circular Quay", lx: 286, ly: 196 },
        { id: "friver", kind: "ferry", d: "M0 148 C60 124 140 94 210 94 C252 94 280 114 290 134", label: "F3 from Parramatta", lx: 20, ly: 116 }
      ],
      pois: [
        P(1, 290, 136, "Island wharf", "start", "All ferries arrive here. The visitor centre is straight ahead."),
        P(2, 268, 142, "Visitor Centre", "lookout", "Free maps and audio tours."),
        P(3, 220, 128, "Convict precinct", "lookout", "Sandstone barracks and cells on the upper island. UNESCO World Heritage."),
        P(4, 200, 150, "Dog-Leg Tunnel", "lookout", "A tunnel cut straight through the island. Bring a torch for fun."),
        P(5, 180, 160, "Industrial precinct", "lookout", "Giant old ship-building halls and cranes."),
        P(6, 256, 166, "Campground & café", "food", "Waterfront café and bar, next to the glamping tents.")
      ],
      stops: [{ x: 290, y: 136, name: "Cockatoo Island", kind: "ferry" }],
      fac: [toi(262, 130), toi(196, 166), caf(244, 174), caf(276, 150)],
      labels: [{ x: 96, y: 196, text: "Parramatta River", water: true }, { x: 200, y: 40, text: "Woolwich", water: false }, { x: 320, y: 262, text: "Birchgrove", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("City Circle", "Train to Circular Quay", 8, "Any City Circle train"), W("Walk to the ferry wharf", 3), F("F3 / F8", "Ferry to Cockatoo Island", 22, "Check the board: not every ferry stops")], fare: [10, 13] },
        quay: { legs: [W("Walk to the ferry wharf", 3), F("F3 / F8", "Ferry to Cockatoo Island", 22, "Check the board: not every ferry stops")], fare: [7, 9] },
        parra: { legs: [W("Walk to Parramatta Wharf", 10), F("F3", "Parramatta River ferry to Cockatoo Island", 60, "Roughly hourly on weekends")], fare: [8, 10] }
      },
      lines: { central: ["fcity"], quay: ["fcity"], parra: ["friver"] }, back: { text: "Same way back. Note the time of the last ferry when you arrive.", lines: [] }
    },
    drive: null, ride: null,
    unavailable: { drive: "You can't drive to Cockatoo Island: it's car-free and only reached by ferry.", ride: "You can't take a rideshare to Cockatoo Island: it's car-free and only reached by ferry." },
    costs: { entry: [0, 0], extras: [["food", "Lunch at the island café", [15, 28], true], ["audio", "Audio tour hire", [5, 10], false]] },
    visit: {
      bestTime: "A mild, clear day. Allow 2–3 hours on the island between ferries.",
      hours: "Open daily. Visitor centre and café keep daytime hours.",
      bring: ["Walking shoes", "Sunscreen & hat", "Water", "A phone torch for the tunnels"],
      facilities: ["Toilets near the wharf and campground", "Café and bar on the eastern shore"],
      access: "The lower island is flat and step-free. The upper convict precinct is reached by a steep ramp or stairs.",
      safety: ["Old industrial site: keep kids close near the docks and edges"]
    },
    pairs: [["Ferry to Manly & Shelly Beach", "Another great ferry ride", "From Circular Quay"], ["The Rocks Markets", "Browse before or after", "At Circular Quay"]]
  },

  "balmoral": {
    facts: [["Time", "Half day"], ["Bus", "≈ 40 min from the city"], ["Effort", "Easy, flat promenade"], ["Entry", "Free"]],
    dest: { lat: -33.8270, lng: 151.2520, label: "Balmoral Beach" },
    map: {
      land: ["M0 0 H250 C240 30 236 60 244 90 C252 110 250 128 246 146 C240 170 244 196 256 220 C266 244 264 274 262 300 H0 Z",
        "M256 134 C264 130 274 134 274 142 C274 150 264 154 256 148 Z"],
      water: [], valley: [],
      trail: "M240 240 C246 220 240 196 238 176 C238 160 244 150 244 138 C246 120 240 100 238 80", trailLabel: "Beach promenade, 1.5 km",
      lines: [
        { id: "bus", kind: "bus", d: "M0 252 C80 248 170 228 232 204", label: "Bus from Wynyard via Spit Junction", lx: 12, ly: 274 },
        { id: "car", kind: "car", d: "M0 130 C80 140 170 170 228 196", label: "Drive via Military Rd", lx: 30, ly: 124 }
      ],
      pois: [
        P(1, 232, 204, "The Esplanade bus stop", "start", "Buses stop right behind the beach."),
        P(2, 250, 222, "Balmoral Baths", "pool", "Free, netted harbour pool with a wooden boardwalk."),
        P(3, 232, 178, "Rotunda & lawns", "lookout", "Shady fig trees and picnic lawns."),
        P(4, 240, 156, "Bathers' Pavilion", "food", "Beach café and kiosk in the old bathing pavilion."),
        P(5, 266, 142, "Rocky Point Island", "lookout", "Cross the little footbridge for the view."),
        P(6, 238, 86, "Edwards Beach", "end", "The quieter northern half of the beach.")
      ],
      stops: [{ x: 232, y: 204, name: "The Esplanade", kind: "bus" }],
      fac: [toi(226, 190), toi(228, 110), caf(228, 164), caf(226, 218)],
      labels: [{ x: 336, y: 150, text: "Middle Harbour", water: true }, { x: 120, y: 80, text: "Mosman", water: false }]
    },
    pt: { hub: "wynyard", tail: [B(null, "Bus to Spit Junction", 22, "Frequent buses towards the Northern Beaches"), B(null, "Local bus down to Balmoral", 10, "Or a steep 20 min walk downhill")], tailFare: [4, 6],
      lines: ["bus"], back: { text: "Same way back. The bus up the hill saves a steep climb.", lines: [] } },
    drive: { mins: { central: 25, quay: 22, parra: 45 }, perCar: [15, 30], perCarLabel: "Parking, 3 hrs", title: "Drive via the Harbour Bridge and Military Rd", detail: "Then down Raglan St", park: "Metered parking along The Esplanade", lines: ["car"], notes: ["Beachfront parking is metered and full by 10am on hot weekends."] },
    ride: { each: { central: [35, 50], quay: [30, 45], parra: [70, 95] }, title: "Rideshare to The Esplanade", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Fish & chips or café lunch", [15, 28], true], ["sup", "Kayak or paddleboard hire", [25, 35], false]] },
    visit: {
      bestTime: "Morning, before the afternoon sea breeze. It's sheltered when ocean beaches are rough.",
      hours: "Always open.",
      bring: ["Swimmers & towel", "Sunscreen & hat", "Picnic rug", "Shade tent for kids"],
      facilities: ["Toilets and showers at both ends of the beach", "Cafés, a kiosk and a fish and chip shop"],
      access: "Flat, paved promenade the whole way. Good for prams and wheelchairs.",
      safety: ["Harbour beaches aren't patrolled like surf beaches: watch children in the water"]
    },
    pairs: [["Taronga Zoo", "Animals in the morning", "≈ 15 min by bus"], ["Spit Bridge to Manly Walk", "Start nearby", "≈ 10 min by bus"]]
  },

  "icebergs": {
    facts: [["Time", "1–2 hrs"], ["Pool", "50 m ocean pool"], ["Effort", "Easy"], ["Entry", "Small fee"]],
    dest: { lat: -33.8950, lng: 151.2743, label: "Bondi Icebergs Pool" },
    map: {
      land: ["M0 0 H400 V70 C384 84 366 96 356 116 C340 112 318 124 300 142 C272 170 236 206 200 232 C190 240 184 250 186 262 C190 276 180 290 176 300 H0 Z"],
      water: [], valley: [],
      trail: "M232 170 C224 190 210 214 196 236 C192 242 190 246 190 250", trailLabel: "Beach promenade to the pool",
      lines: [
        { id: "t4", kind: "train", d: "M0 120 L110 96", label: "T4 from Central", lx: 8, ly: 136 },
        { id: "b333", kind: "bus", d: "M110 96 C150 110 196 140 230 168", label: "Bus 333", lx: 140, ly: 96 },
        { id: "b333q", kind: "bus", d: "M0 60 C80 66 170 110 230 166", label: "Bus 333 from Circular Quay", lx: 8, ly: 50 },
        { id: "car", kind: "car", d: "M0 190 C70 178 160 166 226 174", label: "Drive via Bondi Rd", lx: 30, ly: 206 }
      ],
      pois: [
        P(1, 232, 170, "Bondi Beach bus stop", "start", "On Campbell Parade, right above the beach."),
        P(2, 262, 160, "Bondi Pavilion", "food", "Cafés, toilets, showers and change rooms."),
        P(3, 282, 172, "Bondi Beach", "beach", "Swim only between the red and yellow flags."),
        P(4, 190, 250, "Bondi Icebergs Pool", "end", "Pay at the door. Lap pool and a smaller kids' pool."),
        P(5, 178, 276, "Coastal walk", "lookout", "The Bondi to Coogee walk starts just past the pool.")
      ],
      stops: [{ x: 110, y: 96, name: "Bondi Junction", kind: "train" }, { x: 232, y: 170, name: "Bondi Beach stop", kind: "bus" }],
      fac: [toi(250, 150), toi(176, 244), caf(246, 140), caf(180, 232)],
      labels: [{ x: 320, y: 240, text: "Tasman Sea", water: true }, { x: 130, y: 190, text: "Bondi", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [...HUB.bondij.central.legs, B("333", "Bus to Bondi Beach", 12, "From the Bondi Junction interchange"), W("Along the promenade to the pool", 7)], fare: [4, 6] },
        quay: { legs: [W("Walk to the 333 stop at Circular Quay", 3), B("333", "Bus direct to Bondi Beach", 38, "Via Oxford St"), W("Along the promenade to the pool", 7)], fare: [3, 5] },
        parra: { legs: [...HUB.bondij.parra.legs, B("333", "Bus to Bondi Beach", 12), W("Along the promenade to the pool", 7)], fare: [6, 8] }
      },
      lines: { central: ["t4", "b333"], quay: ["b333q"], parra: ["t4", "b333"] }, back: { text: "Same way back. Buses leave from Campbell Parade every few minutes.", lines: [] }
    },
    drive: { mins: { central: 25, quay: 25, parra: 50 }, perCar: [12, 25], perCarLabel: "Parking, 2 hrs", title: "Drive to Bondi Beach", detail: "Via Oxford St and Bondi Rd", park: "Walk down to the pool", lines: ["car"], notes: ["Metered parking near the beach fills by 9am on warm weekends."] },
    ride: { each: { central: [30, 45], quay: [30, 45], parra: [65, 90] }, title: "Rideshare to Bondi Icebergs", notes: [] },
    costs: { entry: [10, 12], entryChild: [6, 8], extras: [["food", "Brunch in Bondi", [20, 32], true], ["towel", "Towel hire", [4, 6], false]] },
    visit: {
      bestTime: "Morning on a hot, calm day. In big surf, waves break right into the pool.",
      hours: "Open most days from early morning to early evening. Closed one day a week for cleaning: check before you go.",
      bring: ["Swimmers & towel", "Goggles", "Sunscreen", "Coins or card for entry"],
      facilities: ["Change rooms, showers and a sauna at the pool", "Cafés upstairs and along Campbell Parade"],
      access: "Steep stairs down from Notts Ave to the pool deck. Not step-free.",
      safety: ["The water is unheated and can be cold", "Pool edges are slippery when waves wash over"]
    },
    pairs: [["Bondi to Coogee Coastal Walk", "Starts at the pool", "At the door"], ["Watsons Bay & The Gap", "Cliffs and fish & chips", "≈ 20 min by bus"]]
  },

  "sea-life": {
    facts: [["Time", "2 hrs"], ["Walk", "10 min from Town Hall"], ["Effort", "Easy"], ["Entry", "Ticket"]],
    dest: { lat: -33.8696, lng: 151.2022, label: "SEA LIFE Sydney Aquarium" },
    map: cbd({
      trail: "M170 190 C150 186 126 176 102 162", trailLabel: "Walk down Market St",
      base: ["ccw", "t1", "car"], stops: ["central", "townhall", "wynyard", "quay"],
      pois: [
        P(1, 170, 190, "Town Hall Station", "start", "Take the Queen Victoria Building exit and head west on Market St."),
        P(2, 156, 174, "Queen Victoria Building", "food", "Grand old shopping arcade with cafés."),
        P(3, 102, 162, "SEA LIFE Aquarium", "end", "Entrance on the Darling Harbour waterfront."),
        P(4, 104, 140, "WILD LIFE Sydney Zoo", "paid", "Koalas and kangaroos indoors, right next door."),
        P(5, 98, 186, "Pyrmont Bridge", "lookout", "Walk across for the Darling Harbour view."),
        P(6, 112, 206, "Cockle Bay Wharf", "food", "Waterfront restaurants and takeaways.")
      ],
      fac: [toi(112, 152), caf(118, 170), caf(108, 196)],
      labels: [{ x: 38, y: 150, text: "Darling Hbr", water: false }]
    }),
    pt: { hub: "townhall", tail: [W("Down Market St to Darling Harbour", 10)], tailFare: [0, 0], lines: { central: ["ccw"], quay: ["ccw"], parra: ["t1", "ccw"] }, back: { text: "Same way back, or walk along the waterfront to Barangaroo and Wynyard.", lines: [] } },
    drive: { mins: { central: 10, quay: 10, parra: 38 }, perCar: [15, 35], perCarLabel: "Car park, 3 hrs", title: "Drive to a Darling Harbour car park", detail: "Several paid car parks nearby", park: "Walk to the waterfront", lines: ["car"], notes: ["Pre-booking a car park online is usually cheaper."] },
    ride: { each: { central: [12, 18], quay: [12, 18], parra: [58, 80] }, title: "Rideshare to King Street Wharf", notes: [] },
    costs: { entry: [40, 55], entryChild: [30, 40], extras: [["combo", "Add WILD LIFE Sydney Zoo", [20, 30], false], ["food", "Lunch at Darling Harbour", [18, 30], true]] },
    visit: {
      bestTime: "First thing in the morning, or after 2pm. Rainy weekends are the busiest.",
      hours: "Open daily, roughly 10am to 5pm.",
      bring: ["Tickets on your phone", "A light layer: it's cool inside"],
      facilities: ["Toilets and a parents' room inside", "Cafés and restaurants along the wharf"],
      access: "Step-free throughout, with lifts. Prams are fine but it gets crowded.",
      safety: ["The tunnels are dim and crowded: keep small children close"]
    },
    pairs: [["Haymarket & Chinatown Food Crawl", "Eat after", "≈ 12 min walk"], ["Australian Museum", "More for a rainy day", "≈ 20 min walk"]]
  },

  "featherdale": {
    facts: [["Time", "Half day"], ["Train", "≈ 40 min from Central"], ["Effort", "Easy, flat"], ["Entry", "Ticket"]],
    dest: { lat: -33.7665, lng: 150.8845, label: "Featherdale Wildlife Park" },
    map: {
      land: ["M0 0 H400 V300 H0 Z"], water: [],
      valley: ["M170 180 C210 164 280 176 290 216 C296 256 250 274 214 268 C180 262 160 214 170 180 Z"],
      trail: "M196 200 C220 190 250 196 262 216 C270 236 250 252 226 250 C204 248 190 226 196 200", trailLabel: "Park loop",
      lines: [
        { id: "t1", kind: "train", d: "M400 70 C300 72 200 76 120 80", label: "T1 Western line", lx: 250, ly: 60 },
        { id: "bus", kind: "bus", d: "M120 80 C130 120 150 160 190 196", label: "Local bus, 10 min", lx: 30, ly: 140 },
        { id: "car", kind: "car", d: "M400 150 C330 160 260 180 204 200", label: "Via the M4", lx: 312, ly: 146 }
      ],
      pois: [
        P(1, 120, 80, "Blacktown Station", "start", "Buses leave from the interchange beside the station."),
        P(2, 196, 200, "Park entrance", "paid", "Buy tickets online to skip the queue."),
        P(3, 236, 196, "Koala sanctuary", "lookout", "See koalas up close. Encounters cost extra."),
        P(4, 260, 226, "Kangaroo walk-through", "lookout", "Hand-feed kangaroos and wallabies."),
        P(5, 224, 248, "Reptiles & farmyard", "lookout", "Crocodile, snakes and a petting area for kids."),
        P(6, 206, 222, "Café & picnic area", "food", "Shaded tables near the middle of the park.")
      ],
      stops: [{ x: 120, y: 80, name: "Blacktown", kind: "train" }, { x: 162, y: 170, name: "Kildare Rd stop", kind: "bus" }],
      fac: [toi(214, 208), toi(246, 240), caf(212, 232)],
      labels: [{ x: 236, y: 286, text: "Wildlife park", water: true }, { x: 80, y: 50, text: "Blacktown", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("T1", "Western line to Blacktown", 40, "Fast trains every 15 min"), B(null, "Local bus to the park", 10, "From the station interchange"), W("To the entrance", 2)], fare: [6, 8] },
        quay: { legs: [T("City Circle", "Train to Central", 8), T("T1", "Western line to Blacktown", 40), B(null, "Local bus to the park", 10), W("To the entrance", 2)], fare: [6, 8] },
        parra: { legs: [T("T1", "Western line to Blacktown", 12), B(null, "Local bus to the park", 10, "From the station interchange"), W("To the entrance", 2)], fare: [4, 6] }
      },
      lines: ["t1", "bus"], back: { text: "Same way back. Buses run less often late on Sundays.", lines: [] }
    },
    drive: { mins: { central: 45, quay: 50, parra: 20 }, perCar: [0, 12], perCarLabel: "M4 toll, est. Parking is free", title: "Drive via the M4", detail: "Exit at Reservoir Rd", park: "Free car park at the entrance", lines: ["car"], notes: ["Parking at the park is free."] },
    ride: { each: { central: [80, 110], quay: [85, 115], parra: [25, 35] }, title: "Rideshare to the park", notes: ["From the city it's pricey. Take the train to Blacktown and ride from there instead (≈ $12–18)."] },
    costs: { entry: [40, 45], entryChild: [25, 30], extras: [["food", "Lunch at the café", [15, 25], true], ["koala", "Koala encounter photo", [30, 40], false], ["feed", "Animal feed cups", [3, 5], true]] },
    visit: {
      bestTime: "Morning, when the animals are fed and most active.",
      hours: "Open daily, roughly 8am to 5pm.",
      bring: ["Sunscreen & hat", "Closed shoes", "Water", "Camera"],
      facilities: ["Toilets and a parents' room", "Café, picnic tables and barbecues"],
      access: "Flat, paved paths. Good for prams and wheelchairs.",
      safety: ["Wash hands after feeding the animals"]
    },
    pairs: [["Three Sisters & Echo Point", "Carry on up the mountains", "Same train line"], ["Parramatta", "River walk and eat street", "On the way back"]]
  },

  "chinatown": {
    facts: [["Time", "2–3 hrs"], ["Walk", "8 min from Central"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.8790, lng: 151.2040, label: "Dixon Street, Haymarket" },
    map: cbd({
      trail: "M180 270 C168 262 156 254 146 246 C142 240 140 236 138 232 C134 226 132 222 132 218", trailLabel: "Food crawl, about 1 km",
      base: ["t1", "car"], stops: ["central", "townhall"],
      lines: [{ id: "lr", kind: "train", d: "M178 102 C174 140 172 190 170 214 C168 232 160 240 150 244", label: "Light rail from Circular Quay", lx: 184, ly: 150 }],
      pois: [
        P(1, 180, 270, "Central Station", "start", "Leave by the Eddy Ave exit and walk down towards George St."),
        P(2, 148, 250, "Paddy's Markets", "food", "Fresh food hall and souvenir stalls. Closed early in the week."),
        P(3, 138, 232, "Dixon Street", "end", "The pedestrian heart of Chinatown, between the two gates."),
        P(4, 128, 214, "Sussex St food courts", "food", "Cheap, busy food courts: point at what looks good."),
        P(5, 114, 234, "Darling Square", "food", "Newer laneways full of bubble tea, ramen and desserts."),
        P(6, 164, 236, "Thai Town", "food", "Campbell St is lined with Thai restaurants and grocers."),
        P(7, 106, 208, "Chinese Garden", "paid", "A quiet walled garden. Small entry fee.")
      ],
      fac: [toi(152, 262), toi(122, 224)]
    }),
    pt: {
      routes: {
        central: { legs: [W("Down Eddy Ave and George St to Haymarket", 8)], fare: [0, 0] },
        quay: { legs: [{ mode: "light-rail", line: "L2 / L3", title: "Light rail to Chinatown", mins: 15, detail: "Every few minutes along George St" }, W("To Dixon Street", 3)], fare: [3, 4] },
        parra: { legs: [T1C, W("Down George St to Haymarket", 8)], fare: [5, 6] }
      },
      lines: { central: [], quay: ["lr"], parra: ["t1"] }, back: { text: "Same way back. Central is an 8 min walk.", lines: [] }
    },
    drive: { mins: { central: 5, quay: 12, parra: 38 }, perCar: [15, 35], perCarLabel: "Car park, 3 hrs", title: "Drive to a Haymarket car park", detail: "Market City or Darling Square", park: "Walk to Dixon Street", lines: ["car"], notes: ["Traffic is slow and parking is pricey. The train is easier."] },
    ride: { each: { central: [10, 14], quay: [14, 22], parra: [58, 80] }, title: "Rideshare to Dixon Street", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "A food-court meal and a few snacks", [20, 35], true], ["tea", "Bubble tea or dessert", [7, 12], true], ["garden", "Chinese Garden entry", [8, 12], false]] },
    visit: {
      bestTime: "Friday and Saturday evenings are liveliest. Go hungry and share dishes.",
      hours: "Restaurants open from late morning until late. Paddy's Markets open Wednesday to Sunday.",
      bring: ["An appetite", "A card and some cash", "An umbrella if it's wet"],
      facilities: ["Toilets in Market City and the food courts", "Food everywhere"],
      access: "Flat streets and a pedestrian mall. Some older food courts are up stairs.",
      safety: ["Tell staff about food allergies: menus don't always list every ingredient"]
    },
    pairs: [["SEA LIFE Aquarium", "Before you eat", "≈ 12 min walk"], ["Newtown Street Art & King St", "More food and bars", "One train stop from Central"]]
  },

  "newtown": {
    facts: [["Time", "2–3 hrs"], ["Train", "7 min from Central"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.8980, lng: 151.1790, label: "Newtown Station" },
    map: {
      land: ["M0 0 H400 V300 H0 Z"], water: [],
      valley: ["M244 140 C262 132 286 140 288 158 C288 176 264 184 248 176 C236 168 234 150 244 140 Z"],
      trail: "M300 40 C270 80 230 120 200 150 C170 180 140 220 110 270", trailLabel: "King Street, 2 km",
      lines: [
        { id: "t2", kind: "train", d: "M400 108 C330 122 260 140 200 150", label: "Train from Central", lx: 300, ly: 108 },
        { id: "t2w", kind: "train", d: "M0 166 C80 162 150 158 200 150", label: "Train from Parramatta", lx: 8, ly: 184 },
        { id: "car", kind: "car", d: "M400 30 C360 34 330 36 304 40", label: "Drive via City Rd", lx: 312, ly: 24 }
      ],
      pois: [
        P(1, 200, 150, "Newtown Station", "start", "You come out right on King St. North is left, south is right."),
        P(2, 232, 118, "\"I Have a Dream\" mural", "lookout", "Newtown's best-known mural, on King St."),
        P(3, 268, 80, "King St north", "food", "Bookshops, record stores and Thai restaurants."),
        P(4, 262, 158, "Camperdown Memorial Rest Park", "lookout", "The local lawn for a picnic, with murals along the walls."),
        P(5, 142, 140, "Enmore Rd", "food", "Bars, gelato and the Enmore Theatre."),
        P(6, 136, 236, "King St south", "end", "Vintage stores, dessert bars and small galleries.")
      ],
      stops: [{ x: 200, y: 150, name: "Newtown", kind: "train" }],
      fac: [toi(252, 170), toi(212, 162)],
      labels: [{ x: 300, y: 214, text: "Inner West", water: false }, { x: 80, y: 90, text: "Enmore", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("T2", "Inner West line to Newtown", 7, "Every 5–10 min")], fare: [3, 4] },
        quay: { legs: [T("T2", "Inner West line to Newtown", 15, "Direct, via Town Hall and Central")], fare: [3, 5] },
        parra: { legs: [T("T1 / T2", "Train towards the city, to Redfern", 27), T("T2", "One stop back to Newtown", 4, "Or stay on a direct Inner West train")], fare: [5, 6] }
      },
      lines: { central: ["t2"], quay: ["t2"], parra: ["t2w"] }, back: { text: "Same way back. Trains run until late.", lines: [] }
    },
    drive: { mins: { central: 12, quay: 20, parra: 35 }, perCar: [0, 12], perCarLabel: "Street parking", title: "Drive to Newtown", detail: "Via City Rd and King St", park: "Find a side-street spot", lines: ["car"], notes: ["King St is a clearway at busy times and side streets are mostly permit or time-limited."] },
    ride: { each: { central: [14, 20], quay: [20, 30], parra: [50, 70] }, title: "Rideshare to King St", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Dinner on King St", [20, 35], true], ["sweet", "Gelato or a dessert bar", [7, 14], true], ["shop", "Vintage or book shopping", [15, 50], false]] },
    visit: {
      bestTime: "Late afternoon into the evening, when the street fills up. Saturday is busiest.",
      hours: "Shops open about 10am to 6pm. Restaurants and bars go late.",
      bring: ["Comfy shoes", "A tote bag", "A phone for mural photos"],
      facilities: ["Toilets at the station and in Camperdown Memorial Rest Park", "Food and drink on every block"],
      access: "Footpaths are flat but narrow and busy. The station has a lift.",
      safety: ["King St traffic is heavy: cross at the lights"]
    },
    pairs: [["Haymarket & Chinatown Food Crawl", "A second dinner", "One train stop to Central"], ["Carriageworks Farmers Market", "Saturday mornings", "≈ 15 min walk"]]
  },

  "royal-np": {
    facts: [["Time", "Full day"], ["Distance", "6–12 km return"], ["Effort", "Moderate, sandy and exposed"], ["Entry", "Free on foot"]],
    dest: { lat: -34.0830, lng: 151.1510, label: "Bundeena Wharf" },
    map: {
      land: ["M0 0 H330 C326 30 310 60 296 84 C270 96 230 92 200 100 C150 110 90 100 40 108 C24 110 10 106 0 108 Z",
        "M0 300 V190 C40 180 80 186 120 178 C160 170 196 176 220 186 C240 176 262 178 280 190 C300 204 316 230 330 260 C338 278 344 290 348 300 Z"],
      water: [], valley: [],
      trail: "M180 178 C196 186 216 190 236 184 C252 180 266 184 278 192 C290 204 296 216 300 226 C308 240 316 252 322 262", trailLabel: "Jibbon track and Coast Track",
      lines: [
        { id: "t4", kind: "train", d: "M0 30 C60 40 110 70 146 98", label: "T4 to Cronulla", lx: 20, ly: 66 },
        { id: "ferry", kind: "ferry", d: "M150 104 C156 130 168 156 180 176", label: "Bundeena ferry, 30 min", lx: 30, ly: 146 },
        { id: "car", kind: "car", d: "M0 250 C60 240 120 214 176 190", label: "Drive through the park", lx: 20, ly: 274 }
      ],
      pois: [
        P(1, 150, 104, "Cronulla Wharf", "start", "A 5 min walk from Cronulla Station, down to Gunnamatta Bay."),
        P(2, 180, 178, "Bundeena Wharf", "stop", "The little green ferry lands here."),
        P(3, 200, 196, "Bundeena village", "food", "A few cafés and a small shop. Last stop for supplies."),
        P(4, 236, 184, "Jibbon Beach", "beach", "Long, calm beach a short walk from the village."),
        P(5, 278, 192, "Jibbon Head engravings", "lookout", "Aboriginal rock engravings on a viewing platform. Stay on the boardwalk."),
        P(6, 300, 226, "The Balconies", "lookout", "Layered sandstone cliffs above the ocean."),
        P(7, 322, 262, "Wedding Cake Rock", "end", "About 3 km further on. View it from behind the fence only.")
      ],
      stops: [{ x: 146, y: 98, name: "Cronulla", kind: "train" }, { x: 180, y: 178, name: "Bundeena Wharf", kind: "ferry" }],
      fac: [toi(190, 204), toi(140, 90), caf(210, 204), caf(128, 96)],
      labels: [{ x: 262, y: 140, text: "Port Hacking", water: true }, { x: 366, y: 150, text: "Tasman Sea", water: true }, { x: 220, y: 50, text: "Cronulla", water: false }, { x: 130, y: 250, text: "Royal National Park", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("T4", "Illawarra line to Cronulla", 55, "Every 15–30 min"), W("Down to Cronulla Wharf", 5), F(null, "Bundeena ferry", 30, "Hourly. Not on Opal: pay on board, $9.40 adult"), W("Through the village to Jibbon Beach", 10)], fare: [4, 6], nonOpal: [9.4, 9.4], nonOpalChild: [4.7, 4.7] },
        quay: { legs: [T("City Circle", "Train to Town Hall", 5), T("T4", "Illawarra line to Cronulla", 58), W("Down to Cronulla Wharf", 5), F(null, "Bundeena ferry", 30, "Hourly. Not on Opal: pay on board, $9.40 adult"), W("Through the village to Jibbon Beach", 10)], fare: [4, 6], nonOpal: [9.4, 9.4], nonOpalChild: [4.7, 4.7] },
        parra: { legs: [T1C, T("T4", "Illawarra line to Cronulla", 55), W("Down to Cronulla Wharf", 5), F(null, "Bundeena ferry", 30, "Hourly. Not on Opal: pay on board, $9.40 adult"), W("Through the village to Jibbon Beach", 10)], fare: [5, 7], nonOpal: [9.4, 9.4], nonOpalChild: [4.7, 4.7] }
      },
      lines: ["t4", "ferry"], back: { text: "Same way back. The ferry is hourly and the last one leaves early evening: note the time when you land.", lines: [] }
    },
    drive: { mins: { central: 70, quay: 75, parra: 75 }, perCar: [12, 12], perCarLabel: "Park entry, per car per day", title: "Drive to Bundeena through the park", detail: "Via the Princes Hwy and Farnell Ave", park: "Street parking in Bundeena", lines: ["car"], notes: ["The park entry fee is per vehicle, per day.", "The park closes in high fire danger: check alerts first."] },
    ride: null, unavailable: { ride: "Rideshare isn't practical for this trip: it's over an hour each way and hard to book back. Take the train and ferry." },
    costs: { entry: [0, 0], extras: [["food", "Lunch in Bundeena", [15, 25], true], ["snack", "Trail snacks and water", [8, 12], true]] },
    visit: {
      bestTime: "A mild, clear day. Start early: the ferry is hourly and the track has almost no shade.",
      hours: "Always open, but the park closes in extreme fire danger and tracks can close after storms.",
      bring: ["2–3 litres of water", "Sunscreen & hat", "Sturdy shoes", "Lunch and snacks", "Swimmers"],
      facilities: ["Toilets and cafés in Bundeena only", "No water or bins on the track: carry everything out"],
      access: "Beach sand, rock platforms and uneven track. Not suitable for prams or wheelchairs.",
      safety: ["Stay behind the fence at Wedding Cake Rock: the edge is unstable", "Check NSW National Parks alerts for closures and fire danger", "Tell someone your plan"]
    },
    pairs: [["Cronulla Beach", "Swim and fish & chips", "At the ferry wharf"], ["Bondi to Coogee Coastal Walk", "An easier coast walk", "Another day"]]
  },

  "palm-beach": {
    facts: [["Time", "Full day"], ["Bus", "≈ 1 hr 45 from the city"], ["Effort", "Moderate, short steep climb"], ["Entry", "Free"]],
    dest: { lat: -33.5990, lng: 151.3240, label: "Palm Beach" },
    map: {
      land: ["M150 300 C156 260 170 230 186 200 C196 180 200 160 204 140 C206 124 204 110 210 98 C216 84 214 70 222 56 C232 40 252 32 268 40 C282 48 284 68 274 80 C262 92 246 94 240 106 C236 124 246 146 250 168 C256 204 262 250 270 300 Z"],
      water: [], valley: [],
      trail: "M216 186 C212 160 208 140 210 120 C212 104 220 92 230 84 C240 74 250 62 256 52", trailLabel: "Beach and lighthouse track, 3 km return",
      lines: [
        { id: "b199", kind: "bus", d: "M214 300 C214 262 214 222 216 190", label: "Bus 199 from Mona Vale", lx: 60, ly: 286 },
        { id: "car", kind: "car", d: "M196 300 C198 262 204 226 212 196", label: "Drive via Barrenjoey Rd", lx: 280, ly: 286 }
      ],
      pois: [
        P(1, 216, 186, "Palm Beach bus terminus", "start", "The end of the line. The beach is across the road."),
        P(2, 196, 184, "Palm Beach Wharf", "food", "Cafés on the calm Pittwater side, and ferries to the western shore."),
        P(3, 246, 172, "Palm Beach", "beach", "The ocean side. Swim between the flags at the southern end."),
        P(4, 224, 132, "Governor Phillip Park", "lookout", "Picnic lawns, toilets and the last car park."),
        P(5, 212, 104, "Station Beach", "beach", "Walk along the sand to the start of the lighthouse track."),
        P(6, 256, 52, "Barrenjoey Lighthouse", "end", "A steep 15–20 min climb for views over Pittwater and the ocean.")
      ],
      stops: [{ x: 216, y: 186, name: "Palm Beach terminus", kind: "bus" }],
      fac: [toi(234, 140), toi(204, 196), caf(190, 196), caf(232, 190)],
      labels: [{ x: 90, y: 150, text: "Pittwater", water: true }, { x: 340, y: 150, text: "Tasman Sea", water: true }, { x: 214, y: 264, text: "Palm Beach", water: false }]
    },
    pt: { hub: "wynyard", tail: [B("B1", "B-Line bus to Mona Vale", 50, "Every 10–15 min"), B("199", "Bus to Palm Beach", 25, "Every 15–30 min")], tailFare: [6, 8],
      lines: ["b199"], back: { text: "Same way back. Allow two hours, and check the last bus before you climb to the lighthouse.", lines: [] } },
    drive: { mins: { central: 70, quay: 65, parra: 80 }, perCar: [15, 40], perCarLabel: "Parking, half day", title: "Drive via the Harbour Bridge and Barrenjoey Rd", detail: "Along the Northern Beaches", park: "Car park at Governor Phillip Park", lines: ["car"], notes: ["Beach car parks are pay-and-display and fill early in summer.", "It's a long drive, but you can stop at other beaches on the way."] },
    ride: { each: { central: [90, 130], quay: [85, 125], parra: [110, 150] }, title: "Rideshare to Palm Beach", notes: ["It's expensive and drivers can be hard to find for the trip back."] },
    costs: { entry: [0, 0], extras: [["food", "Lunch at a wharf café", [20, 35], true], ["ferry", "Pittwater ferry ride", [10, 20], false]] },
    visit: {
      bestTime: "A clear day. Climb to the lighthouse in the morning, then swim.",
      hours: "Always open. The lighthouse itself opens only for occasional tours.",
      bring: ["Walking shoes", "Water", "Sunscreen & hat", "Swimmers & towel"],
      facilities: ["Toilets at Governor Phillip Park and the wharf", "Cafés at the wharf and along the ocean beach"],
      access: "The beach and park are flat. The lighthouse tracks are steep: the Smugglers Track is rough stone steps, the Access Trail is smoother but still steep.",
      safety: ["Swim only between the flags on the ocean side", "No water or shade on the headland"]
    },
    pairs: [["Ferry to Manly & Shelly Beach", "On the way back", "≈ 1 hr by bus"], ["Spit Bridge to Manly Walk", "Another Northern Beaches day", "Another day"]]
  }
  ,
  "clovelly": {
    facts: [["Time", "2–3 hrs"], ["Water", "Calm inlet, no surf"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.9140, lng: 151.2675, label: "Clovelly Beach" },
    map: {
      land: ["M0 0 H270 C276 30 268 60 280 84 C290 100 286 118 300 128 L300 132 C260 136 230 138 206 142 C200 146 200 154 206 158 C230 162 260 164 300 168 C292 186 286 206 292 228 C298 252 290 276 296 300 H0 Z"],
      water: [], valley: [],
      trail: "M276 40 C272 60 270 76 276 90 C284 104 280 118 270 130 C250 134 226 138 208 142 C200 148 200 154 208 160 C240 164 270 166 292 172 C288 196 284 220 290 250",
      trailLabel: "Coastal walk around the inlet",
      lines: [
        { id: "b339", kind: "bus", d: "M0 150 C80 150 140 150 186 150", label: "Bus 339 from Central", lx: 10, ly: 140 },
        { id: "car", kind: "car", d: "M0 210 C80 200 140 180 186 160", label: "Drive via Clovelly Rd", lx: 10, ly: 226 }
      ],
      pois: [
        P(1, 186, 150, "Clovelly bus stop", "start", "Buses stop at the top of the beach on Clovelly Rd."),
        P(2, 210, 150, "Clovelly Beach", "beach", "A narrow inlet with concrete platforms and steps straight into calm water."),
        P(3, 250, 170, "South-side snorkel", "lookout", "Swim along the rocks to look for the blue groper. Bring a mask."),
        P(4, 232, 128, "Surf club kiosk", "food", "Coffee and snacks above the beach."),
        P(5, 280, 86, "Gordons Bay", "beach", "Rocky cove with an underwater nature trail for snorkellers."),
        P(6, 290, 250, "Towards Coogee", "end", "The coastal walk carries on to Coogee, about 30 min south.")
      ],
      stops: [{ x: 186, y: 150, name: "Clovelly", kind: "bus" }],
      fac: [toi(226, 130), caf(238, 122), toi(246, 178)],
      labels: [{ x: 350, y: 220, text: "Tasman Sea", water: true }, { x: 262, y: 153, text: "Clovelly Bay", water: true }, { x: 100, y: 90, text: "Clovelly", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [W("Walk to the 339 stop near Central", 4), B("339", "Bus to Clovelly", 35, "Every 15–30 min. Check the stop in Trip Planner"), W("Down to the water", 3)], fare: [3, 5] },
        quay: { legs: [T("City Circle", "Train to Central", 8), W("Walk to the 339 stop", 4), B("339", "Bus to Clovelly", 35), W("Down to the water", 3)], fare: [5, 7] },
        parra: { legs: [T1C, W("Walk to the 339 stop", 4), B("339", "Bus to Clovelly", 35), W("Down to the water", 3)], fare: [6, 8] }
      },
      lines: ["b339"], back: { text: "Same way back. Or walk the coast to Coogee (≈ 30 min) and take bus 372 to Central.", lines: [] }
    },
    drive: { mins: { central: 25, quay: 25, parra: 50 }, perCar: [0, 10], perCarLabel: "Parking", title: "Drive via Clovelly Rd", detail: "Through Randwick", park: "Small car park above the beach", lines: ["car"],
      notes: ["The car park and nearby streets fill early on warm weekends. Time limits apply."] },
    ride: { each: { central: [25, 35], quay: [28, 40], parra: [70, 95] }, title: "Rideshare to Clovelly Beach", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Coffee and a snack", [8, 15], true], ["snorkel", "Mask and snorkel (if you don't have one)", [20, 40], false]] },
    visit: {
      bestTime: "Morning on a calm, sunny day, when the water is clearest.",
      hours: "Always open.",
      bring: ["Swimmers & towel", "Mask and snorkel", "Sunscreen & hat", "Reef-safe shoes"],
      facilities: ["Toilets and showers at the beach", "Kiosk at the surf club"],
      access: "Steps and ramps down to the concrete platforms. A beach wheelchair may be available: ask the lifeguards.",
      safety: ["Don't feed or touch the fish", "Watch for waves washing over the platforms when the swell is up"]
    },
    pairs: [["Bondi to Coogee Coastal Walk", "Clovelly is on the way", "Next to the inlet"], ["Coogee Beach & Ocean Pools", "Pools and cafés", "≈ 30 min walk south"]]
  },

  "coogee": {
    facts: [["Time", "Half day"], ["Pools", "Three ocean pools"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.9205, lng: 151.2575, label: "Coogee Beach" },
    map: {
      land: ["M0 0 H300 C296 30 288 52 290 70 C292 84 300 96 290 108 C270 118 252 130 246 150 C242 170 250 190 270 202 C288 212 300 226 296 248 C292 268 300 286 298 300 H0 Z"],
      water: [], valley: [],
      trail: "M262 116 C250 130 244 150 246 170 C250 188 262 198 276 206 C288 214 296 228 294 246",
      trailLabel: "Beach promenade and coastal path",
      lines: [
        { id: "b372", kind: "bus", d: "M0 140 C80 142 160 146 236 150", label: "Bus 372 from Central", lx: 10, ly: 132 },
        { id: "b373", kind: "bus", d: "M0 90 C90 100 170 120 236 146", label: "Bus 373 from Circular Quay", lx: 10, ly: 82 },
        { id: "car", kind: "car", d: "M0 200 C80 190 160 170 236 156", label: "Drive via Coogee Bay Rd", lx: 10, ly: 216 }
      ],
      pois: [
        P(1, 236, 150, "Coogee Beach bus stop", "start", "Buses stop on Arden St, right behind the beach."),
        P(2, 252, 136, "Coogee Beach", "beach", "Patrolled beach. Swim between the flags."),
        P(3, 206, 150, "Coogee Bay Rd", "food", "Cafés, bakeries and the big pub across from the beach."),
        P(4, 290, 104, "Giles Baths", "pool", "Rock pool at the north end. Free."),
        P(5, 272, 204, "Dolphin Point", "lookout", "Grassy headland with a memorial and views up the beach."),
        P(6, 294, 246, "Wylie's Baths", "end", "Historic tidal pool on the rocks. Small entry fee.")
      ],
      stops: [{ x: 236, y: 150, name: "Coogee Beach", kind: "bus" }],
      fac: [toi(238, 170), caf(222, 140), toi(280, 112), caf(214, 162)],
      labels: [{ x: 350, y: 170, text: "Tasman Sea", water: true }, { x: 120, y: 60, text: "Coogee", water: false }, { x: 120, y: 260, text: "Randwick", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [W("Walk to the 372 stop near Central", 4), B("372", "Bus to Coogee Beach", 35, "Every 15–20 min on weekends"), W("To the beach", 2)], fare: [3, 5] },
        quay: { legs: [W("Walk to the 373 stop", 3), B("373", "Bus to Coogee Beach", 40, "Via Randwick"), W("To the beach", 2)], fare: [3, 5] },
        parra: { legs: [T1C, W("Walk to the 372 stop", 4), B("372", "Bus to Coogee Beach", 35), W("To the beach", 2)], fare: [6, 8] }
      },
      lines: { central: ["b372"], quay: ["b373"], parra: ["b372"] }, back: { text: "Same way back. Buses leave from Arden St every few minutes.", lines: [] }
    },
    drive: { mins: { central: 25, quay: 25, parra: 50 }, perCar: [8, 20], perCarLabel: "Parking, 3 hrs", title: "Drive via Coogee Bay Rd", detail: "Through Randwick", park: "Metered parking near the beach", lines: ["car"],
      notes: ["Beachfront parking is metered and fills by mid-morning on warm weekends."] },
    ride: { each: { central: [25, 35], quay: [28, 40], parra: [70, 95] }, title: "Rideshare to Coogee Beach", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Brunch on Coogee Bay Rd", [20, 32], true], ["wylies", "Wylie's Baths entry", [5, 7], false]] },
    visit: {
      bestTime: "Morning, before the sea breeze. Late afternoon is lovely on the pools.",
      hours: "Beach always open. Wylie's Baths opens daytime hours.",
      bring: ["Swimmers & towel", "Sunscreen & hat", "Coins or card for Wylie's"],
      facilities: ["Toilets and showers along the promenade", "Cafés and takeaways on Coogee Bay Rd and Arden St"],
      access: "Flat, paved promenade and a beach access ramp. The ocean pools are down stairs.",
      safety: ["Swim between the flags", "Ocean pools can have waves breaking in at high tide"]
    },
    pairs: [["Bondi to Coogee Coastal Walk", "Finish the walk here", "Starts at Bondi"], ["Clovelly Beach", "Calm-water snorkel", "≈ 30 min walk north"]]
  },

  "north-head": {
    facts: [["Time", "2–3 hrs"], ["Distance", "2–5 km of tracks"], ["Effort", "Easy to moderate"], ["Entry", "Free"]],
    dest: { lat: -33.8150, lng: 151.2960, label: "North Head Sanctuary" },
    map: {
      land: ["M0 0 H400 V40 C380 46 366 58 360 76 C354 96 360 120 366 140 C374 168 380 200 372 228 C362 256 336 270 306 270 C276 270 252 256 240 234 C230 214 222 196 206 186 C186 174 164 172 140 168 C110 164 70 160 40 150 C24 144 10 140 0 140 Z"],
      water: [], valley: [],
      trail: "M300 200 C310 214 318 228 330 244 C320 252 306 252 296 244 C292 232 294 216 300 200",
      trailLabel: "Fairfax Walk loop, 1 km",
      lines: [
        { id: "f1", kind: "ferry", d: "M60 300 C90 250 120 200 146 168", label: "F1 ferry from Circular Quay", lx: 10, ly: 290 },
        { id: "b135", kind: "bus", d: "M150 162 C200 170 250 182 298 198", label: "Bus 135", lx: 200, ly: 196 },
        { id: "walk", kind: "walk", d: "M150 160 C220 140 300 110 352 104 C346 140 330 170 304 196", label: "Or walk via Shelly Beach, 1 hr", lx: 196, ly: 124 },
        { id: "car", kind: "car", d: "M0 60 C80 80 200 140 296 196", label: "Drive via Darley Rd", lx: 20, ly: 52 }
      ],
      pois: [
        P(1, 146, 166, "Manly Wharf", "start", "Ferries arrive here. Bus 135 leaves from the interchange outside."),
        P(2, 352, 104, "Shelly Beach", "beach", "Calm cove and the start of the walking route up the headland."),
        P(3, 300, 200, "North Head Sanctuary", "stop", "Visitor centre, café and the bus stop. Tracks fan out from here."),
        P(4, 330, 244, "Fairfax Lookout", "end", "Cliff-top views straight across the harbour entrance to South Head."),
        P(5, 268, 212, "North Fort", "paid", "Old gun tunnels and a memorial walk. The small museum charges entry."),
        P(6, 232, 224, "Q Station", "food", "The old quarantine station, now a hotel with a café and restaurant.")
      ],
      stops: [{ x: 146, y: 166, name: "Manly Wharf", kind: "ferry" }, { x: 300, y: 200, name: "North Head", kind: "bus" }],
      fac: [toi(292, 190), caf(310, 190), toi(156, 152), caf(166, 150)],
      labels: [{ x: 340, y: 290, text: "Tasman Sea", water: true }, { x: 90, y: 230, text: "Sydney Harbour", water: true }, { x: 220, y: 60, text: "Manly", water: false }]
    },
    pt: { hub: "quay", tail: [W("Walk to the Manly ferry", 3), F("F1", "Ferry to Manly", 30, "Every 20–30 min"), B("135", "Bus to North Head", 15, "Hourly or less on weekends: check times")], tailFare: [9, 11],
      lines: ["f1", "b135"], back: { text: "Same way back, or walk down via Shelly Beach and along the beach to Manly Wharf (≈ 1 hr).", lines: ["walk"] } },
    drive: { mins: { central: 40, quay: 35, parra: 55 }, perCar: [5, 15], perCarLabel: "Parking, 3 hrs", title: "Drive via the Harbour Bridge and Manly", detail: "Then up North Head Scenic Dr", park: "Pay parking at the sanctuary", lines: ["car"],
      notes: ["A toll applies coming back across the harbour."] },
    ride: { each: { central: [45, 60], quay: [40, 55], parra: [75, 100] }, title: "Rideshare to North Head", notes: ["Or take the ferry to Manly and ride the last 10 minutes (≈ $12–18)."] },
    costs: { entry: [0, 0], extras: [["food", "Café at the sanctuary", [12, 22], true], ["fort", "North Fort museum", [10, 15], false]] },
    visit: {
      bestTime: "A clear morning. Late afternoon light on the cliffs is beautiful too.",
      hours: "The sanctuary is open daily from early morning to dusk.",
      bring: ["Walking shoes", "Water", "Sunscreen & hat", "A wind jacket"],
      facilities: ["Toilets and a café at the visitor centre", "Toilets and cafés in Manly"],
      access: "Many tracks are wide and fairly flat, and Fairfax Lookout has an accessible path. The walk up from Shelly Beach is steep.",
      safety: ["Stay behind the cliff fences", "Bus 135 runs rarely on weekends: check the last bus down"]
    },
    pairs: [["Ferry to Manly & Shelly Beach", "Swim after", "≈ 1 hr walk down"], ["Spit Bridge to Manly Walk", "Another Manly day", "Another day"]]
  },

  "cronulla": {
    facts: [["Time", "Half day"], ["Walk", "2.5 km seaside path"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -34.0560, lng: 151.1550, label: "Cronulla Beach" },
    map: {
      land: ["M0 0 H310 C318 30 330 60 326 90 C322 116 330 140 322 166 C314 190 300 210 292 232 C286 248 270 256 254 252 C236 246 226 228 214 214 C200 200 180 200 164 206 C140 214 110 214 80 208 C50 202 24 204 0 210 Z"],
      water: [], valley: [],
      trail: "M324 70 C326 90 322 110 320 130 C318 150 314 170 306 190 C298 208 294 222 288 236",
      trailLabel: "The Esplanade, 2.5 km",
      lines: [
        { id: "t4", kind: "train", d: "M0 60 C60 70 120 100 170 120", label: "T4 from Central", lx: 10, ly: 54 },
        { id: "walkS", kind: "walk", d: "M170 120 C220 130 280 140 316 150", label: "Walk 6 min", lx: 226, ly: 160 },
        { id: "car", kind: "car", d: "M0 150 C60 146 120 140 166 130", label: "Drive via Captain Cook Dr", lx: 10, ly: 168 }
      ],
      pois: [
        P(1, 170, 120, "Cronulla Station", "start", "End of the T4 line. Walk through the mall to the beach."),
        P(2, 240, 136, "Cronulla Mall", "food", "Cafés, gelato and fish and chips."),
        P(3, 322, 76, "North Cronulla Beach", "beach", "Patrolled surf beach. Swim between the flags."),
        P(4, 318, 152, "South Cronulla Beach", "beach", "Closest beach to the station, with a grassy park behind."),
        P(5, 304, 194, "Esplanade lookouts", "lookout", "Rock platforms and views down to the headland."),
        P(6, 288, 236, "Shelly Park ocean pool", "end", "Free rock pool at the end of the walk."),
        P(7, 176, 206, "Cronulla Wharf", "stop", "Ferries to Bundeena and Royal National Park leave from Gunnamatta Bay.")
      ],
      stops: [{ x: 170, y: 120, name: "Cronulla", kind: "train" }, { x: 176, y: 206, name: "Cronulla Wharf", kind: "ferry" }],
      fac: [toi(312, 84), caf(306, 98), toi(296, 202), caf(232, 148)],
      labels: [{ x: 370, y: 140, text: "Tasman Sea", water: true }, { x: 220, y: 282, text: "Port Hacking", water: true }, { x: 90, y: 120, text: "Cronulla", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("T4", "Illawarra line to Cronulla", 55, "Every 15–30 min"), W("Through the mall to the beach", 6)], fare: [4, 6] },
        quay: { legs: [T("City Circle", "Train to Town Hall", 5), T("T4", "Illawarra line to Cronulla", 58), W("Through the mall to the beach", 6)], fare: [4, 6] },
        parra: { legs: [T1C, T("T4", "Illawarra line to Cronulla", 55), W("Through the mall to the beach", 6)], fare: [5, 7] }
      },
      lines: { central: ["t4", "walkS"], quay: ["t4", "walkS"], parra: ["t4", "walkS"] }, back: { text: "Same way back. Cronulla is the end of the line, so you'll always get a seat.", lines: [] }
    },
    drive: { mins: { central: 45, quay: 50, parra: 50 }, perCar: [8, 20], perCarLabel: "Parking, 3 hrs", title: "Drive via the Princes Hwy", detail: "Then Captain Cook Dr or Kingsway", park: "Metered parking near the beach", lines: ["car"],
      notes: ["Beachfront parking is metered and fills early on hot days."] },
    ride: { each: { central: [60, 85], quay: [65, 90], parra: [65, 90] }, title: "Rideshare to Cronulla", notes: ["The train is much cheaper and drops you a short walk from the sand."] },
    costs: { entry: [0, 0], extras: [["food", "Fish & chips or café lunch", [15, 25], true], ["sweet", "Gelato", [6, 10], false]] },
    visit: {
      bestTime: "Morning on a hot day, before the sea breeze picks up.",
      hours: "Always open.",
      bring: ["Swimmers & towel", "Sunscreen & hat", "Shade tent for kids", "Water"],
      facilities: ["Toilets and showers along the Esplanade", "Cafés and takeaways in the mall"],
      access: "The mall and the northern Esplanade are flat and paved. Parts of the path south have stairs.",
      safety: ["Swim between the flags: rips are common", "Stay off the rock platforms in big swell"]
    },
    pairs: [["Royal National Park via Bundeena", "Ferry from the wharf", "≈ 5 min walk"], ["Palm Beach & Barrenjoey Lighthouse", "Another beach day trip", "Another day"]]
  },

  "carriageworks": {
    facts: [["Time", "1–2 hrs"], ["When", "Saturdays, about 8am–1pm"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.8935, lng: 151.1925, label: "Carriageworks" },
    map: {
      land: ["M0 0 H400 V300 H0 Z"], water: [],
      valley: ["M100 170 C130 160 170 168 176 190 C178 210 140 222 112 214 C94 206 90 182 100 170 Z"],
      trail: "M220 118 C210 140 196 156 180 168 C166 178 152 186 140 190",
      trailLabel: "Via Little Eveleigh St, 8 min",
      lines: [
        { id: "trainC", kind: "train", d: "M400 70 C330 90 280 106 220 118", label: "Train from Central, 3 min", lx: 270, ly: 80 },
        { id: "trainW", kind: "train", d: "M0 130 C80 126 150 122 220 118", label: "T1 from Parramatta", lx: 10, ly: 146 },
        { id: "car", kind: "car", d: "M0 230 C60 220 100 206 132 196", label: "Drive in, parking on site", lx: 10, ly: 252 }
      ],
      pois: [
        P(1, 220, 118, "Redfern Station", "start", "Leave by the Lawson St exit and head west."),
        P(2, 252, 92, "Redfern St", "food", "Cafés and bakeries if you're early."),
        P(3, 180, 168, "Little Eveleigh St", "lookout", "Back-street walk with murals on the way to the market."),
        P(4, 140, 190, "Carriageworks Farmers Market", "end", "About 70 stalls of produce, bread and breakfast inside the old rail sheds."),
        P(5, 300, 196, "South Eveleigh", "food", "Restored rail workshops with cafés and lawns, a short walk away.")
      ],
      stops: [{ x: 220, y: 118, name: "Redfern", kind: "train" }],
      fac: [toi(150, 206), caf(124, 200), toi(232, 112)],
      labels: [{ x: 138, y: 244, text: "Carriageworks", water: true }, { x: 320, y: 50, text: "Redfern", water: false }, { x: 60, y: 90, text: "Eveleigh", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("City", "Train to Redfern", 3, "Any train one stop south"), W("Through Little Eveleigh St", 8)], fare: [3, 4] },
        quay: { legs: [T("City", "Train to Redfern", 12, "Most trains stop there"), W("Through Little Eveleigh St", 8)], fare: [3, 4] },
        parra: { legs: [T("T1", "Western line to Redfern", 30), W("Through Little Eveleigh St", 8)], fare: [5, 7] }
      },
      lines: { central: ["trainC"], quay: ["trainC"], parra: ["trainW"] }, back: { text: "Same way back from Redfern. It's also a 20 min walk to Central.", lines: [] }
    },
    drive: { mins: { central: 10, quay: 15, parra: 35 }, perCar: [8, 20], perCarLabel: "Parking, 2 hrs", title: "Drive to Carriageworks", detail: "Entry from Wilson St", park: "Paid car park on site", lines: ["car"],
      notes: ["The on-site car park fills by 9am on market days."] },
    ride: { each: { central: [12, 18], quay: [16, 24], parra: [50, 70] }, title: "Rideshare to Carriageworks", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Breakfast and coffee at the stalls", [15, 25], true], ["produce", "Produce to take home", [20, 50], false]] },
    visit: {
      bestTime: "Arrive by 9am for the best produce and shorter coffee queues.",
      hours: "Saturdays only, roughly 8am to 1pm. Check the Carriageworks site for holiday closures.",
      bring: ["A shopping bag", "A card: most stalls take contactless", "An appetite"],
      facilities: ["Toilets inside Carriageworks", "Seating in the sheds and outside"],
      access: "Flat and step-free throughout, though crowded at peak times.",
      safety: ["Crowded at peak times: keep small children close"]
    },
    pairs: [["Newtown Street Art & King St", "Murals and vintage shops", "≈ 15 min walk"], ["Haymarket & Chinatown Food Crawl", "Lunch in the city", "One train stop to Central"]]
  },

  "parramatta": {
    facts: [["Time", "Half day"], ["Ferry", "≈ 75 min from the city"], ["Effort", "Easy"], ["Entry", "Free"]],
    dest: { lat: -33.8150, lng: 151.0035, label: "Lennox Bridge, Church St" },
    map: {
      land: ["M0 0 H400 V300 H0 Z"],
      water: ["M0 130 C80 124 160 136 240 128 C300 122 350 128 400 120 V140 C350 148 300 142 240 148 C160 156 80 146 0 152 Z"],
      valley: [],
      trail: "M200 230 C200 200 200 170 200 150 C200 130 200 110 202 90",
      trailLabel: "Church St, station to Eat Street",
      lines: [
        { id: "t1", kind: "train", d: "M400 240 C320 236 260 232 200 230", label: "T1 from Central", lx: 300, ly: 256 },
        { id: "f3", kind: "ferry", d: "M400 132 C360 134 330 136 300 138", label: "F3 ferry from Circular Quay", lx: 270, ly: 170 },
        { id: "walkW", kind: "walk", d: "M300 138 C270 120 230 110 204 100", label: "Walk 10 min", lx: 248, ly: 100 },
        { id: "car", kind: "car", d: "M400 200 C330 196 260 190 206 186", label: "Drive via the M4", lx: 300, ly: 214 }
      ],
      pois: [
        P(1, 200, 230, "Parramatta Station", "start", "Leave by the Church St exit and walk north."),
        P(2, 200, 196, "Centenary Square", "lookout", "The town square, with St John's Cathedral beside it."),
        P(3, 200, 140, "Lennox Bridge", "lookout", "Sandstone bridge built by convicts in the 1830s. Paths run along both banks."),
        P(4, 202, 90, "Church St Eat Street", "end", "A strip of restaurants from Lebanese to Korean, busiest in the evening."),
        P(5, 300, 138, "Parramatta Wharf", "stop", "Where the F3 ferry from Circular Quay arrives."),
        P(6, 80, 182, "Parramatta Park", "paid", "Big riverside park with Old Government House, part of the World Heritage convict sites. House entry is paid.")
      ],
      stops: [{ x: 200, y: 230, name: "Parramatta", kind: "train" }, { x: 300, y: 138, name: "Parramatta Wharf", kind: "ferry" }],
      fac: [toi(190, 204), caf(214, 96), toi(92, 170), caf(214, 200)],
      labels: [{ x: 100, y: 143, text: "Parramatta River", water: true }, { x: 330, y: 60, text: "Parramatta", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("T1", "Western line to Parramatta", 28, "Fast trains every 10–15 min"), W("Up Church St to the river", 8)], fare: [5, 7] },
        quay: { legs: [W("Walk to the ferry wharf", 3), F("F3", "Parramatta River ferry", 75, "Scenic. Roughly every 30–60 min; the train via Central is faster"), W("Along the river to Church St", 10)], fare: [8, 10] },
        parra: { legs: [W("Up Church St to the river", 8)], fare: [0, 0] }
      },
      lines: { central: ["t1"], quay: ["f3", "walkW"], parra: [] }, back: { text: "Trains back to the city run every few minutes. The last ferries leave in the early evening.", lines: [] }
    },
    drive: { mins: { central: 35, quay: 40, parra: 5 }, perCar: [10, 25], perCarLabel: "Parking, 3 hrs", title: "Drive via the M4", detail: "Exit at Church St", park: "Paid car parks around the CBD", lines: ["car"],
      notes: ["The M4 is tolled between Concord and Parramatta."] },
    ride: { each: { central: [50, 70], quay: [55, 75], parra: [8, 14] }, title: "Rideshare to Church St", notes: [] },
    costs: { entry: [0, 0], extras: [["food", "Dinner on Eat Street", [20, 35], true], ["ogh", "Old Government House entry", [15, 20], false]] },
    visit: {
      bestTime: "Afternoon in the park, then dinner on Church St as it gets busy.",
      hours: "Park and river paths always open. Old Government House keeps daytime hours, Wednesday to Sunday.",
      bring: ["Comfy shoes", "Sunscreen", "An appetite"],
      facilities: ["Toilets in Parramatta Park and around the CBD", "Restaurants all along Church St"],
      access: "Flat and paved along Church St and most river paths. Old Government House has limited step-free access.",
      safety: ["Some river paths are poorly lit after dark: stick to Church St at night"]
    },
    pairs: [["Featherdale Wildlife Park", "Koalas and kangaroos", "≈ 20 min by train and bus"], ["Cockatoo Island", "Stop on the F3 ferry", "On the way"]]
  },

  "leura": {
    facts: [["Time", "Half day"], ["Train", "≈ 1 hr 45 from Central"], ["Effort", "Easy, one steep track"], ["Entry", "Free"]],
    dest: { lat: -33.7120, lng: 150.3310, label: "Leura Mall" },
    map: {
      land: ["M0 0 H400 V300 H0 Z"], water: [],
      valley: ["M0 190 C60 196 120 182 180 196 C230 208 280 190 330 200 C360 206 380 200 400 204 V300 H0 Z"],
      trail: "M160 42 C162 70 164 96 166 120 C176 150 190 170 200 186 C240 190 280 186 310 180",
      trailLabel: "The Mall, then down to the cliffs",
      lines: [
        { id: "bmt", kind: "train", d: "M0 40 C130 42 260 44 400 46", label: "Blue Mountains Line", lx: 260, ly: 34 },
        { id: "car", kind: "car", d: "M400 90 C320 96 240 104 170 112", label: "Via the M4", lx: 312, ly: 84 }
      ],
      pois: [
        P(1, 160, 42, "Leura Station", "start", "The Mall starts right outside the station."),
        P(2, 164, 90, "Leura Mall", "food", "Tree-lined street of cafés, sweet shops and homewares."),
        P(3, 90, 140, "Everglades Gardens", "paid", "Heritage garden with valley views. Entry fee."),
        P(4, 200, 186, "Leura Cascades", "lookout", "A short, steep track down to the cascades."),
        P(5, 310, 180, "Gordon Falls Lookout", "end", "Big view over the Jamison Valley.")
      ],
      stops: [{ x: 160, y: 42, name: "Leura", kind: "train" }],
      fac: [toi(174, 98), caf(150, 82), toi(210, 176)],
      labels: [{ x: 220, y: 262, text: "Jamison Valley", water: true }, { x: 60, y: 70, text: "Leura", water: false }]
    },
    pt: {
      routes: {
        central: { legs: [T("BMT", "Blue Mountains Line to Leura", 100, "Roughly hourly on weekends"), W("Into the Mall", 2)], fare: [6, 9] },
        quay: { legs: [T("City Circle", "Train to Central", 8), T("BMT", "Blue Mountains Line to Leura", 100, "Roughly hourly on weekends"), W("Into the Mall", 2)], fare: [6, 9] },
        parra: { legs: [T("BMT", "Blue Mountains Line to Leura", 73, "Stops at Parramatta"), W("Into the Mall", 2)], fare: [5, 8] }
      },
      lines: ["bmt"], back: { text: "Same way back. Trains run roughly hourly: check the last one.", lines: ["bmt"] }
    },
    drive: { mins: { central: 90, quay: 95, parra: 65 }, perCar: [8, 20], perCarLabel: "M4 toll, est.", title: "Drive via the M4 and Great Western Hwy", detail: "Tolled section on the M4", park: "Street parking around the Mall", lines: ["car"],
      notes: ["Parking on the Mall is time-limited. Side streets are easier."] },
    ride: null, unavailable: { ride: "Rideshare isn't practical for this trip: it's a long, expensive ride. The train is the easy option." },
    costs: { entry: [0, 0], extras: [["food", "Café lunch on the Mall", [18, 30], true], ["garden", "Everglades Gardens entry", [12, 18], false]] },
    visit: {
      bestTime: "Spring for blossom, autumn for colour. Any clear day works.",
      hours: "Village shops about 9am to 5pm. Lookouts always open.",
      bring: ["A warm layer: it's cooler than the city", "Walking shoes", "Water"],
      facilities: ["Public toilets near the Mall", "Plenty of cafés"],
      access: "The Mall is flat and paved. The Cascades track has steep steps.",
      safety: ["Stay behind railings at the lookouts", "Check NSW National Parks alerts before walking tracks"]
    },
    pairs: [["Three Sisters & Echo Point", "The classic lookout", "One stop up the line"], ["Wentworth Falls & National Pass", "Big waterfall walk", "One stop back"]]
  }
};

// ---------- assemble ----------
// Suggested start time (Sydney, HH:MM) used by Add to a day; mirrors the calendar prototype.
const START = { "chinatown": "18:30", "newtown": "17:00", "parramatta": "15:00", "carriageworks": "08:30", "rocks-markets": "10:00", "opera-tour": "11:00",
  "agnsw": "10:30", "aus-museum": "10:00", "sea-life": "10:00", "taronga": "09:30", "featherdale": "09:00", "three-sisters": "08:30", "wentworth": "08:30",
  "royal-np": "08:00", "palm-beach": "08:30", "spit-manly": "09:00", "bondi-coogee": "08:30", "icebergs": "09:00", "manly": "10:00", "watsons": "11:00",
  "cockatoo": "10:30", "bridge-walk": "16:30", "botanic": "09:30", "balmoral": "10:00", "clovelly": "09:00", "coogee": "10:00", "north-head": "09:30",
  "cronulla": "10:00", "leura": "10:00" };
// Optional §4.1 fields that only some activities need.
const EXTRA = {
  "carriageworks": { days: ["sat"] },
  "opera-tour": { bookingRequired: true }
};
// Older pairing names that now point at an activity of their own.
const ALIAS = { "Leura Mall": "leura", "Clovelly Beach": "clovelly", "Coogee cafés": "coogee", "North Head lookouts": "north-head",
  "Cronulla Beach": "cronulla", "Carriageworks Farmers Market": "carriageworks", "Parramatta": "parramatta" };
const CAT = { "Coastal walk": "coastal-walk", "Ferry & beach": "ferry", "Bushwalk": "bushwalk", "Lookout & walk": "lookout", "Gardens": "garden", "Culture": "landmark", "Gallery": "gallery", "Museum": "museum", "Wildlife": "wildlife", "Ferry & lookout": "ferry", "Landmark": "landmark", "Markets": "market", "History": "history", "Beach": "beach", "Swimming": "swimming", "Food": "food", "Neighbourhood": "neighbourhood", "Lookout & beach": "lookout" };
const fmt = (m) => (m < 60 ? "≈ " + m + " min" : "≈ " + Math.floor(m / 60) + " hr" + (m % 60 ? " " + (m % 60) + " min" : ""));
const round5 = (m) => Math.round(m / 5) * 5;
const ORIG = ["central", "quay", "parra"];
const addFare = (a, b) => [a[0] + b[0], a[1] + b[1]];

function ptRoute(legs, fare, lines) {
  const rides = legs.filter((l) => l.mode !== "walk").length;
  const mins = legs.reduce((s, l) => s + l.mins, 0) + Math.max(0, rides - 1) * 4;   // allow a few minutes per change
  return { total: fmt(round5(mins)), changes: Math.max(0, rides - 1), fare, lines, legs };
}
function build(id) {
  const b = basic[id];
  let facts, dest, map, routes, costs, visit, pairs;
  // The three original worked examples live in detail-engine.js; everything else comes from DATA below.
  if (worked[id] && ["bondi-coogee", "manly", "three-sisters"].indexOf(id) >= 0) {
    const w = worked[id];
    facts = w.facts; dest = w.dest; map = w.map; costs = { entry: w.costs.entry, extras: w.costs.extras }; visit = w.visit; pairs = w.pairs;
    routes = { dest, pt: { central: w.routes.pt.central, quay: w.routes.pt.quay, parra: w.routes.pt.parra, back: w.routes.pt.back }, drive: w.routes.drive, ride: w.routes.ride };
    if (!w.routes.ride) routes.unavailable = { ride: "Rideshare isn't practical for this trip: it's a long, expensive ride. The train is the easy option." };
  } else {
    const d = DATA[id];
    if (!d) throw new Error("no data for " + id);
    facts = d.facts.map(([k, v]) => ({ k, v })); dest = d.dest; map = d.map;
    const pt = {};
    ORIG.forEach((o) => {
      const lines = Array.isArray(d.pt.lines) ? d.pt.lines : d.pt.lines[o];
      if (d.pt.routes) { const q = d.pt.routes[o]; pt[o] = ptRoute(q.legs, q.fare, lines); if (q.nonOpal) Object.assign(pt[o], { nonOpal: q.nonOpal, nonOpalChild: q.nonOpalChild }); }
      else { const h = HUB[d.pt.hub][o]; pt[o] = ptRoute(h.legs.concat(d.pt.tail), addFare(h.fare, d.pt.tailFare), lines); }
    });
    pt.back = d.pt.back;
    const drive = d.drive && {
      total: Object.fromEntries(ORIG.map((o) => [o, fmt(d.drive.mins[o])])), perCar: d.drive.perCar, perCarLabel: d.drive.perCarLabel, lines: d.drive.lines,
      legs: [C(d.drive.title, d.drive.mins.central, d.drive.detail)].concat(d.drive.park ? [W(d.drive.park, 5)] : []), notes: d.drive.notes
    };
    const ride = d.ride && {
      total: Object.fromEntries(ORIG.map((o) => [o, fmt((d.drive ? d.drive.mins[o] : 30))])), perCarEach: d.ride.each, lines: d.drive ? d.drive.lines : [],
      legs: [C(d.ride.title, d.drive ? d.drive.mins.central : 30)], notes: d.ride.notes
    };
    routes = { dest, pt, drive: drive || null, ride: ride || null };
    if (d.unavailable) routes.unavailable = d.unavailable;
    costs = { entry: d.costs.entry, ...(d.costs.entryChild ? { entryChild: d.costs.entryChild } : {}), extras: d.costs.extras.map(([eid, label, per, on]) => ({ id: eid, label, per, on })) };
    visit = d.visit;
    pairs = d.pairs.map(([name, why, dist]) => ({ name, why, dist }));
  }
  return {
    id: b.id, status: "draft", name: b.name, city: "sydney", area: b.area, category: CAT[b.cat], categoryLabel: b.cat, blurb: b.blurb,
    weatherFit: { sunny: b.w[0], cloudy: b.w[1], rainy: b.w[2], hot: b.w[3] }, weatherNote: b.wxTip,
    goodFor: b.with, duration: { label: b.dur, minHours: b.h[0], maxHours: b.h[1] }, cost: b.cost,
    gettingThere: b.getThere, newcomerTip: b.tip, location: { lat: dest.lat, lng: dest.lng },
    ...(EXTRA[id] || {}),
    suggestedStart: START[id] || "10:00",
    facts, routes, map, costs: { ...costs, pricesChecked: null }, visit,
    pairings: pairs.map((p) => {
      const hit = basic[ALIAS[p.name]] || Object.values(basic).find((x) => x.name === p.name);
      return hit ? { ...p, name: hit.name, activityId: hit.id } : p;
    }),
    lastVerified: null
  };
}

fs.mkdirSync(OUT, { recursive: true });
const ids = Object.keys(basic);
const all = ids.map(build);
all.forEach((a) => fs.writeFileSync(path.join(OUT, a.id + ".json"), JSON.stringify(a, null, 2) + "\n"));
fs.writeFileSync(path.join(HERE, "content-all.json"), JSON.stringify(all));
console.log("wrote", all.length, "files to", OUT);
