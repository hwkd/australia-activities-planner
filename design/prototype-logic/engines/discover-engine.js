class Component extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = {
      screen: "discover", from: "discover", openId: null,
      weather: (this.props && this.props.startWeather) || "sun",
      who: "any", dur: "any", freeOnly: false,
      sat: ["bondi-coogee", "rocks-markets"], sun: ["three-sisters"],
      satW: "sun", sunW: "rain", shared: false
    };
    // Rating vocabulary: index 0 = skip, 1 = ok, 2 = great. A direction may reword these (keep them short).
    this.FIT = [
      { label: "Skip", note: "Save it for another day" },
      { label: "OK", note: "Doable, with caveats" },
      { label: "Great", note: "Ideal conditions" }
    ];
    this.WX = [
      { key: "sun", label: "Sunny", short: "Sun", adj: "sunny", bad: "Not ideal in full sun." },
      { key: "cloud", label: "Cloudy", short: "Cloud", adj: "cloudy", bad: "Not ideal under heavy cloud." },
      { key: "rain", label: "Rainy", short: "Rain", adj: "rainy", bad: "Not great in the rain." },
      { key: "hot", label: "Hot 30°+", short: "Hot", adj: "hot", bad: "Not great in the heat." }
    ];
    this.WHO = [
      { key: "any", label: "Anyone" }, { key: "date", label: "Date" },
      { key: "friends", label: "Friends" }, { key: "family", label: "Family" }, { key: "solo", label: "Solo" }
    ];
    this.DUR = [
      { key: "any", label: "Any length" }, { key: "short", label: "Under 3 hrs" },
      { key: "half", label: "Half day" }, { key: "full", label: "Full day" }
    ];
    // w = [sunny, cloudy, rainy, hot]: 2 great, 1 ok, 0 skip · h = [minHours, maxHours]
    this.acts = [
      { id: "bondi-coogee", name: "Bondi to Coogee Coastal Walk", area: "Eastern Suburbs", cat: "Coastal walk", dur: "2–3 hrs", h: [2, 3], cost: "Free", w: [2, 2, 0, 1], with: ["date", "friends", "family", "solo"],
        blurb: "Sydney's most famous clifftop walk, linking six beaches and ocean pools.",
        getThere: "Train to Bondi Junction, then bus 333 or 380 to Bondi Beach. Bus back to the city from Coogee.",
        tip: "Pack swimmers: Bronte and Clovelly make great mid-walk dips. Lots of stairs, so leave the pram at home.",
        wxTip: "Exposed clifftops with little shade. Go early on hot days, and skip it in rain when the rocks get slippery." },
      { id: "manly", name: "Ferry to Manly & Shelly Beach", area: "Northern Beaches", cat: "Ferry & beach", dur: "Half day", h: [3, 5], cost: "$", w: [2, 2, 1, 2], with: ["date", "friends", "family", "solo"],
        blurb: "The harbour's best-value view, then a relaxed beach town with calm snorkelling.",
        getThere: "F1 ferry from Circular Quay, about 30 min. Tap on with Opal or a contactless card.",
        tip: "Grab an outside seat for Opera House and Harbour Bridge views. Walk along to Shelly Beach for calmer water and snorkelling.",
        wxTip: "The ferry ride is lovely even under cloud. Beach time needs sunshine." },
      { id: "spit-manly", name: "Spit Bridge to Manly Walk", area: "Northern Beaches", cat: "Bushwalk", dur: "3–4 hrs", h: [3, 4], cost: "Free", w: [2, 2, 0, 1], with: ["date", "friends", "solo"],
        blurb: "Ten kilometres of bush, hidden beaches and harbour lookouts, ending in Manly.",
        getThere: "Bus from Wynyard to Spit Bridge. Ferry home from Manly to Circular Quay.",
        tip: "About 10 km of bush, hidden beaches and harbour lookouts. Finish with fish and chips in Manly and ride the ferry home.",
        wxTip: "Mostly shaded, so it's bearable when warm. Muddy and slippery after rain." },
      { id: "three-sisters", name: "Three Sisters & Echo Point", area: "Blue Mountains", cat: "Lookout & walk", dur: "Full day", h: [6, 9], cost: "$", w: [2, 1, 0, 2], with: ["date", "friends", "family", "solo"],
        blurb: "The iconic sandstone peaks over the Jamison Valley, two hours by train.",
        getThere: "Blue Mountains line from Central to Katoomba (about 2 hrs), then a local bus or 25 min walk to Echo Point.",
        tip: "Walk the Prince Henry Cliff Walk between lookouts. It's several degrees cooler than the city, so bring a layer.",
        wxTip: "Low cloud can hide the valley completely. A great escape on a scorching city day." },
      { id: "wentworth", name: "Wentworth Falls & National Pass", area: "Blue Mountains", cat: "Bushwalk", dur: "3–4 hrs", h: [3, 4], cost: "$", w: [2, 1, 0, 1], with: ["friends", "solo"],
        blurb: "Stairs cut into cliffs beside a tall waterfall. A proper adventure.",
        getThere: "Train from Central to Wentworth Falls station, then walk to the Falls Reserve picnic area.",
        tip: "One of the most spectacular walks in the mountains, with stairs cut into the cliffs. Check NSW National Parks for track closures first.",
        wxTip: "Steep stairs and cliff edges get dangerous when wet. Start early in summer." },
      { id: "botanic", name: "Royal Botanic Garden & Mrs Macquarie's Chair", area: "City", cat: "Gardens", dur: "1–2 hrs", h: [1, 2], cost: "Free", w: [2, 2, 0, 1], with: ["date", "friends", "family", "solo"],
        blurb: "Harbourside gardens with the classic Opera House and Bridge photo spot.",
        getThere: "Walk from Circular Quay or Martin Place station.",
        tip: "Follow the harbour path to Mrs Macquarie's Chair for the classic Opera House and Bridge photo. Picnics welcome.",
        wxTip: "Shady lawns help on warm days, but there's little shelter in rain." },
      { id: "opera-tour", name: "Sydney Opera House Tour", area: "City", cat: "Culture", dur: "1 hr", h: [1, 1], cost: "$$", w: [2, 2, 2, 2], with: ["date", "friends", "family", "solo"],
        blurb: "Go behind the sails of Australia's most famous building.",
        getThere: "Short walk from Circular Quay station and ferry wharves.",
        tip: "Book the guided tour online. Stay for a drink at the Opera Bar steps afterwards.",
        wxTip: "Indoors, so it works in any weather." },
      { id: "agnsw", name: "Art Gallery of NSW", area: "The Domain", cat: "Gallery", dur: "2–3 hrs", h: [2, 3], cost: "Free", w: [1, 2, 2, 2], with: ["date", "friends", "family", "solo"],
        blurb: "Free, world-class art across two buildings, with a rooftop harbour view.",
        getThere: "Walk from St James or Martin Place station through the Domain.",
        tip: "General entry is free. Don't miss the newer Naala Badu building and its rooftop views.",
        wxTip: "A perfect refuge on a rainy or sweltering day." },
      { id: "aus-museum", name: "Australian Museum", area: "City", cat: "Museum", dur: "2 hrs", h: [2, 2], cost: "Free", w: [1, 2, 2, 2], with: ["date", "family", "solo"],
        blurb: "First Nations cultures, dinosaurs and Australia's strange wildlife, for free.",
        getThere: "Opposite Hyde Park, near Museum and St James stations.",
        tip: "Free general entry. A great introduction to First Nations cultures and Australia's unusual wildlife.",
        wxTip: "Indoors and air-conditioned." },
      { id: "taronga", name: "Taronga Zoo", area: "Mosman", cat: "Wildlife", dur: "Half day", h: [3, 5], cost: "$$$", w: [2, 2, 1, 1], with: ["date", "friends", "family"],
        blurb: "Koalas, kangaroos and giraffes with a harbour skyline behind them.",
        getThere: "F2 ferry from Circular Quay to Taronga Zoo wharf, about 12 min.",
        tip: "Ride the Sky Safari cable car up from the wharf, then walk downhill. Koalas and kangaroos with harbour views.",
        wxTip: "Mostly outdoors and hilly. Light rain means thinner crowds." },
      { id: "watsons", name: "Watsons Bay & The Gap", area: "Eastern Suburbs", cat: "Ferry & lookout", dur: "Half day", h: [3, 5], cost: "$", w: [2, 2, 0, 1], with: ["date", "friends", "family"],
        blurb: "Ferry out to fish and chips, then wild ocean cliffs at South Head.",
        getThere: "F9 ferry from Circular Quay to Watsons Bay.",
        tip: "Fish and chips by the wharf, then walk up to the Gap cliffs and Hornby Lighthouse at South Head.",
        wxTip: "Windy and exposed on the cliffs. Best on a clear day." },
      { id: "bridge-walk", name: "Walk across the Harbour Bridge", area: "The Rocks", cat: "Landmark", dur: "1 hr", h: [1, 1], cost: "Free", w: [2, 2, 1, 1], with: ["date", "friends", "family", "solo"],
        blurb: "Cross the Coathanger on foot for free, with the Opera House below.",
        getThere: "Stairs up from Cumberland St in The Rocks. Finish at Milsons Point station.",
        tip: "Use the eastern footpath for Opera House views. Pay a few dollars for the Pylon Lookout, or splurge on BridgeClimb.",
        wxTip: "Fine under an umbrella, but very exposed in the heat." },
      { id: "rocks-markets", name: "The Rocks Markets", area: "The Rocks", cat: "Markets", dur: "1–2 hrs", h: [1, 2], cost: "Free", w: [2, 2, 1, 1], with: ["date", "friends", "family", "solo"],
        blurb: "Weekend stalls, street food and sandstone laneways by the harbour.",
        getThere: "Short walk from Circular Quay or Wynyard.",
        tip: "Runs on weekends. Wander the sandstone laneways and historic pubs afterwards.",
        wxTip: "Partly covered, so it's workable in light rain." },
      { id: "cockatoo", name: "Cockatoo Island", area: "Sydney Harbour", cat: "History", dur: "Half day", h: [3, 5], cost: "$", w: [2, 2, 1, 1], with: ["date", "friends", "family"],
        blurb: "A convict-era island of tunnels and shipyards in the middle of the harbour.",
        getThere: "F3 or F8 ferry from Circular Quay.",
        tip: "A UNESCO-listed convict site with tunnels and old shipyards. You can even glamp overnight.",
        wxTip: "Tunnels and industrial sheds give some shelter." },
      { id: "balmoral", name: "Balmoral Beach", area: "Mosman", cat: "Beach", dur: "Half day", h: [3, 5], cost: "Free", w: [2, 1, 0, 2], with: ["date", "family"],
        blurb: "A calm harbour beach with fig trees, a promenade and gentle water.",
        getThere: "Bus from Wynyard or the city, about 40 min.",
        tip: "Calm, sheltered harbour water that suits kids and newer swimmers. Great spot for a picnic under the fig trees.",
        wxTip: "Best on hot days when ocean beaches are rough or packed." },
      { id: "icebergs", name: "Bondi Icebergs Pool", area: "Bondi", cat: "Swimming", dur: "1–2 hrs", h: [1, 2], cost: "$", w: [2, 1, 0, 2], with: ["date", "friends", "solo"],
        blurb: "Laps in the famous ocean pool where waves crash over the edge.",
        getThere: "Train to Bondi Junction, then bus 333 or 380 to Bondi Beach.",
        tip: "Swim in the famous ocean pool at the south end of Bondi. On the beach itself, always swim between the red and yellow flags.",
        wxTip: "Made for hot days." },
      { id: "sea-life", name: "SEA LIFE Aquarium", area: "Darling Harbour", cat: "Wildlife", dur: "2 hrs", h: [2, 2], cost: "$$$", w: [1, 2, 2, 2], with: ["date", "family"],
        blurb: "Sharks, dugongs and the Great Barrier Reef, all under one roof.",
        getThere: "Walk from Town Hall or Wynyard station.",
        tip: "Book online for cheaper entry, and look at combo tickets with WILD LIFE Sydney Zoo next door.",
        wxTip: "Indoors: a reliable rainy-day pick for kids." },
      { id: "featherdale", name: "Featherdale Wildlife Park", area: "Western Sydney", cat: "Wildlife", dur: "Half day", h: [3, 5], cost: "$$", w: [2, 2, 1, 1], with: ["date", "friends", "family"],
        blurb: "Hand-feed kangaroos and meet koalas up close.",
        getThere: "Train to Blacktown, then a short bus ride.",
        tip: "Get up close with kangaroos, wallabies and koalas. A first-month favourite for newcomers.",
        wxTip: "Mostly outdoors, with some covered areas." },
      { id: "chinatown", name: "Haymarket & Chinatown Food Crawl", area: "Haymarket", cat: "Food", dur: "2–3 hrs", h: [2, 3], cost: "$$", w: [1, 2, 2, 2], with: ["date", "friends", "family"],
        blurb: "Dumplings, Thai Town and bustling food courts in the city's south.",
        getThere: "Train to Central or Town Hall, or light rail to Chinatown.",
        tip: "Graze through Dixon Street, the food courts and Thai Town on Campbell Street. Go hungry.",
        wxTip: "Food courts and restaurants keep you dry and cool." },
      { id: "newtown", name: "Newtown Street Art & King St", area: "Inner West", cat: "Neighbourhood", dur: "2–3 hrs", h: [2, 3], cost: "$", w: [2, 2, 1, 1], with: ["date", "friends", "solo"],
        blurb: "Murals, vintage shops and food from everywhere on one long street.",
        getThere: "Train to Newtown station.",
        tip: "Murals, vintage shops, bookstores and food from everywhere. Stays lively into the night.",
        wxTip: "Plenty of cafés and shops to duck into." },
      { id: "royal-np", name: "Royal National Park via Bundeena", area: "Sutherland Shire", cat: "Coastal walk", dur: "Full day", h: [6, 8], cost: "$", w: [2, 1, 0, 1], with: ["date", "friends", "solo"],
        blurb: "A little ferry to the world's second-oldest national park.",
        getThere: "Train to Cronulla, then the small ferry across Port Hacking to Bundeena.",
        tip: "Walk to Jibbon Beach and the Aboriginal rock engravings. Carry plenty of water, as facilities are few.",
        wxTip: "Exposed coastal heath. Hard going in the heat." },
      { id: "palm-beach", name: "Palm Beach & Barrenjoey Lighthouse", area: "Northern Beaches", cat: "Lookout & beach", dur: "Full day", h: [6, 8], cost: "$", w: [2, 1, 0, 1], with: ["date", "friends"],
        blurb: "A lighthouse climb at the tip of the Northern Beaches.",
        getThere: "Bus from Manly wharf (about 75 min), or drive.",
        tip: "Climb the short, steep track to Barrenjoey Lighthouse for views over Pittwater and the ocean.",
        wxTip: "Only worth the long trip on a clear day." },
      { id: "clovelly", name: "Clovelly Beach", area: "Eastern Suburbs", cat: "Swimming", dur: "2–3 hrs", h: [2, 3], cost: "Free", w: [2, 1, 0, 2], with: ["date", "friends", "family", "solo"],
        blurb: "A calm, narrow inlet made for swimming and snorkelling with friendly fish.",
        getThere: "Bus 339 from Central to Clovelly, then a short walk down to the water.",
        tip: "Bring a mask and snorkel: the blue groper here are famously curious. The concrete platforms make it easy to get in.",
        wxTip: "Sheltered from big swell, so it's good when surf beaches are rough. Little shade, and no fun in the rain." },
      { id: "coogee", name: "Coogee Beach & Ocean Pools", area: "Eastern Suburbs", cat: "Beach", dur: "Half day", h: [2, 5], cost: "Free", w: [2, 2, 1, 2], with: ["date", "friends", "family", "solo"],
        blurb: "Relaxed beach with three ocean pools at either end and cafés across the road.",
        getThere: "Bus 372 from Central or 373 from Circular Quay to Coogee Beach.",
        tip: "Wylie's Baths, at the south end, is a beautiful old tidal pool on the rocks. It's the best swim when the surf is up.",
        wxTip: "Great on sunny and hot days. On a grey day the cafés on Coogee Bay Rd carry it." },
      { id: "north-head", name: "North Head Lookouts", area: "Manly", cat: "Lookout & walk", dur: "2–3 hrs", h: [2, 4], cost: "$", w: [2, 2, 0, 1], with: ["date", "friends", "family", "solo"],
        blurb: "Cliff-top views across the harbour entrance, a short walk from Manly.",
        getThere: "Ferry to Manly, then bus 135 up to North Head, or walk up via Shelly Beach (about 1 hr).",
        tip: "Fairfax Lookout is the view, but the old military tunnels and the quiet bush walks are what make it a morning.",
        wxTip: "Fine under cloud. Very exposed in heat and wind, and the views vanish in rain." },
      { id: "cronulla", name: "Cronulla Beach & Esplanade", area: "Sutherland Shire", cat: "Beach", dur: "Half day", h: [2, 5], cost: "Free", w: [2, 1, 0, 2], with: ["date", "friends", "family", "solo"],
        blurb: "The only Sydney surf beach on the train line, with a long seaside path and rock pools.",
        getThere: "T4 Illawarra line to Cronulla, the last stop. The beach is a 6 minute walk.",
        tip: "Walk the Esplanade south to the ocean pools at Shelly Park, then get fish and chips back near the station.",
        wxTip: "Best on hot and sunny days. Swim between the flags: the surf can be strong." },
      { id: "carriageworks", name: "Carriageworks Farmers Market", area: "Inner City", cat: "Markets", dur: "1–2 hrs", h: [1, 2], cost: "Free", w: [2, 2, 2, 2], with: ["date", "friends", "family", "solo"],
        blurb: "Saturday-morning food market inside giant old railway workshops.",
        getThere: "Train to Redfern, then an 8 minute walk through Little Eveleigh St.",
        tip: "Saturdays only, roughly 8am to 1pm. Go early, bring a bag, and have breakfast there.",
        wxTip: "Under cover in the old rail sheds, so it works in any weather." },
      { id: "parramatta", name: "Parramatta River & Eat Street", area: "Parramatta", cat: "Neighbourhood", dur: "Half day", h: [2, 5], cost: "$", w: [2, 2, 1, 1], with: ["date", "friends", "family", "solo"],
        blurb: "Riverside walks, colonial history and a whole street of restaurants.",
        getThere: "T1 train to Parramatta, or the slow, scenic F3 ferry up the river from Circular Quay.",
        tip: "Take the ferry one way for the river views, then eat on Church St. Old Government House is in Parramatta Park.",
        wxTip: "Restaurants and the museum-style sights work in rain. The river walk is exposed on hot days." },
      { id: "leura", name: "Leura Village & Gardens", area: "Blue Mountains", cat: "Neighbourhood", dur: "Half day", h: [3, 5], cost: "$", w: [2, 2, 1, 2], with: ["date", "friends", "family"],
        blurb: "A pretty mountain village of cafés and gardens, a short walk from the cliffs.",
        getThere: "Blue Mountains Line to Leura. The village starts at the station.",
        tip: "Easy to pair with Echo Point, one stop on. Walk down to Leura Cascades for a quick taste of the bush.",
        wxTip: "Cooler than the city, so good on hot days. The cafés and shops make a wet day work too." }
    ];
  }

  // ---- Shared behaviour: identical in every direction. Do not change the logic. ----
  baseVals() {
    const s = this.state, WX = this.WX, WHO = this.WHO, DUR = this.DUR, FIT = this.FIT, acts = this.acts;
    const byId = {};
    acts.forEach((a) => { byId[a.id] = a; });
    const wIdx = (k) => WX.findIndex((w) => w.key === k);
    const flags = (k) => ({ isSun: k === "sun", isCloud: k === "cloud", isRain: k === "rain", isHot: k === "hot" });
    const fitFlags = (f) => ({ fit: f, isGreat: f === 2, isOk: f === 1, isSkip: f === 0, fitLabel: FIT[f].label, fitNote: FIT[f].note });
    const inSat = (id) => s.sat.indexOf(id) >= 0;
    const inSun = (id) => s.sun.indexOf(id) >= 0;
    const inPlan = (id) => inSat(id) || inSun(id);
    const open = (id) => () => this.setState({ screen: "detail", openId: id, from: this.state.screen === "detail" ? this.state.from : this.state.screen });
    const toggleDay = (key, id) => () => {
      const list = this.state[key];
      this.setState({ [key]: list.indexOf(id) >= 0 ? list.filter((x) => x !== id) : list.concat([id]) });
    };
    const pickable = (list, cur, stateKey) => list.map((o, i) => ({
      key: o.key, label: o.label, index: i, selected: cur === o.key, notSelected: cur !== o.key,
      pressed: cur === o.key ? "true" : "false", pick: () => this.setState({ [stateKey]: o.key })
    }));
    const dayBits = (a) => ({
      inSat: inSat(a.id), notSat: !inSat(a.id), satPressed: inSat(a.id) ? "true" : "false",
      satAria: inSat(a.id) ? "Remove " + a.name + " from Saturday" : "Add " + a.name + " to Saturday",
      toggleSat: toggleDay("sat", a.id),
      inSun: inSun(a.id), notSun: !inSun(a.id), sunPressed: inSun(a.id) ? "true" : "false",
      sunAria: inSun(a.id) ? "Remove " + a.name + " from Sunday" : "Add " + a.name + " to Sunday",
      toggleSun: toggleDay("sun", a.id),
      planned: inPlan(a.id),
      plannedLabel: "Planned for " + [inSat(a.id) ? "Saturday" : null, inSun(a.id) ? "Sunday" : null].filter(Boolean).join(" & ")
    });

    // Filters
    const wi = wIdx(s.weather), cw = WX[wi];
    const weathers = WX.map((w, i) => Object.assign(flags(w.key), {
      key: w.key, label: w.label, short: w.short, index: i, selected: s.weather === w.key, notSelected: s.weather !== w.key,
      pressed: s.weather === w.key ? "true" : "false", pick: () => this.setState({ weather: w.key })
    }));

    // Ranking (spec 6.1)
    const durOk = (a) => s.dur === "any"
      || (s.dur === "short" && a.h[1] <= 3)
      || (s.dur === "half" && a.h[0] <= 5 && a.h[1] >= 2)
      || (s.dur === "full" && a.h[1] >= 5);
    const pool = acts.filter((a) => (s.who === "any" || a.with.indexOf(s.who) >= 0) && (!s.freeOnly || a.cost === "Free") && durOk(a));
    const shown = pool.filter((a) => a.w[wi] > 0).sort((a, b) =>
      (b.w[wi] - a.w[wi]) || ((inPlan(a.id) ? 1 : 0) - (inPlan(b.id) ? 1 : 0)) || a.name.localeCompare(b.name));
    const hidden = pool.length - shown.length;
    const cards = shown.map((a, i) => Object.assign(fitFlags(a.w[wi]), dayBits(a), {
      id: a.id, index: i, num: (i + 1 < 10 ? "0" : "") + (i + 1), delay: (i * 60) + "ms", isFirst: i === 0, notFirst: i !== 0,
      name: a.name, area: a.area, cat: a.cat, dur: a.dur, cost: a.cost, blurb: a.blurb,
      fitText: FIT[a.w[wi]].label + " when " + cw.adj,
      open: open(a.id),
      wx: WX.map((w, j) => Object.assign(flags(w.key), fitFlags(a.w[j]), { wname: w.label, short: w.short, current: j === wi, notCurrent: j !== wi }))
    }));

    // Detail
    const a = byId[s.openId] || acts[0];
    const d = Object.assign(dayBits(a), {
      id: a.id, name: a.name, area: a.area, cat: a.cat, dur: a.dur, cost: a.cost, blurb: a.blurb,
      getThere: a.getThere, tip: a.tip, wxTip: a.wxTip,
      withTags: a.with.map((k) => ({ label: (WHO.find((o) => o.key === k) || {}).label })),
      wxRows: WX.map((w, j) => Object.assign(flags(w.key), fitFlags(a.w[j]), { label: w.label, short: w.short, current: j === wi })),
      nowFit: Object.assign(fitFlags(a.w[wi]), { text: FIT[a.w[wi]].label + " when " + cw.adj }),
      satLabel: inSat(a.id) ? "On Saturday" : "Add to Saturday",
      sunLabel: inSun(a.id) ? "On Sunday" : "Add to Sunday"
    });

    // My weekend + Plan B (spec 6.2)
    const used = {};
    s.sat.concat(s.sun).forEach((id) => { used[id] = true; });
    const costRank = { "Free": 0, "$": 1, "$$": 2, "$$$": 3 };
    const indoor = (x) => x.w[2] === 2;
    const planB = (x, di) => {
      const cands = acts.filter((c) => !used[c.id] && c.w[di] === 2 && c.with.some((t) => x.with.indexOf(t) >= 0));
      if (!cands.length) return null;
      const score = (c) => (c.area === x.area ? 3 : 0) + (indoor(c) === indoor(x) ? 2 : 0)
        + (c.h[0] <= x.h[1] && c.h[1] >= x.h[0] ? 1 : 0) + (costRank[c.cost] <= costRank[x.cost] ? 1 : 0);
      cands.sort((p, q) => (score(q) - score(p)) || p.name.localeCompare(q.name));
      return cands[0];
    };
    const goDiscover = () => this.setState({ screen: "discover" });
    const days = [["sat", "Saturday", "Sat 3 Oct", "Sat", "3"], ["sun", "Sunday", "Sun 4 Oct", "Sun", "4"]].map((row) => {
      const key = row[0], label = row[1];
      const dw = s[key + "W"], di = wIdx(dw);
      const items = s[key].map((id, i) => {
        const it = byId[id], bad = it.w[di] === 0;
        let backup = null;
        if (bad) {
          const b = planB(it, di);
          if (b) {
            used[b.id] = true;
            backup = { name: b.name, area: b.area, dur: b.dur, cat: b.cat, swap: () => this.setState({ [key]: this.state[key].map((v) => (v === id ? b.id : v)) }) };
          }
        }
        return Object.assign(fitFlags(it.w[di]), {
          id: id, index: i, delay: (i * 80) + "ms", name: it.name, area: it.area, dur: it.dur, cat: it.cat, cost: it.cost,
          badText: WX[di].bad, hasBackup: !!backup, badOnly: bad && !backup,
          backup: backup || { name: "", area: "", dur: "", cat: "", swap: null },
          open: open(id), removeLabel: "Remove " + it.name + " from " + label,
          remove: () => this.setState({ [key]: this.state[key].filter((v) => v !== id) })
        });
      });
      return Object.assign(flags(dw), {
        key: key, label: label, date: row[2], short: row[3], dayNum: row[4],
        forecast: dw, forecastLabel: WX[di].label, forecastAdj: WX[di].adj,
        items: items, isEmpty: items.length === 0, hasItems: items.length > 0, find: goDiscover,
        warnCount: items.filter((x) => x.isSkip).length,
        wx: WX.map((w) => Object.assign(flags(w.key), {
          key: w.key, short: w.short, label: w.label, aria: label + " forecast: " + w.label,
          selected: dw === w.key, notSelected: dw !== w.key, pressed: dw === w.key ? "true" : "false",
          pick: () => this.setState({ [key + "W"]: w.key })
        }))
      });
    });

    const count = s.sat.length + s.sun.length;
    const scr = s.screen;
    return Object.assign(flags(s.weather), {
      isDiscover: scr === "discover", isDetail: scr === "detail", isPlan: scr === "plan",
      notDetail: scr !== "detail", showTabs: scr !== "detail",
      weather: s.weather, wxLabel: cw.label, wxAdj: cw.adj, wxShort: cw.short,
      weathers: weathers, whos: pickable(WHO, s.who, "who"), durs: pickable(DUR, s.dur, "dur"),
      freeOnly: s.freeOnly, notFreeOnly: !s.freeOnly, freePressed: s.freeOnly ? "true" : "false",
      toggleFree: () => this.setState({ freeOnly: !this.state.freeOnly }),
      resetFilters: () => this.setState({ weather: "sun", who: "any", dur: "any", freeOnly: false }),
      cards: cards, resultCount: String(cards.length), noResults: cards.length === 0, hasResults: cards.length > 0,
      resultTitle: cards.length + (cards.length === 1 ? " idea" : " ideas") + " for a " + cw.adj + " day",
      hasHidden: hidden > 0, hiddenCount: String(hidden),
      hiddenNote: hidden + (hidden === 1 ? " more is" : " more are") + " better saved for another day",
      d: d, goBack: () => this.setState({ screen: this.state.from || "discover" }),
      days: days, planCount: String(count),
      planCountLabel: count + (count === 1 ? " activity" : " activities"),
      shared: s.shared, notShared: !s.shared,
      shareLabel: s.shared ? "Link copied: send it to your group" : "Share plan with your group",
      toggleShare: () => this.setState({ shared: !this.state.shared }),
      goDiscover: goDiscover, goPlan: () => this.setState({ screen: "plan" }),
      setWeather: (k) => this.setState({ weather: k }),
      openActivity: (id) => this.setState({ screen: "detail", openId: id }),
      tabDiscoverCurrent: scr === "discover" ? "page" : "false", tabPlanCurrent: scr === "plan" ? "page" : "false"
    });
  }

  // ---- Direction-specific values (colours per weather, per-item styles). Write this per artboard. ----
  themeVals(v) {
    return {};
  }

  renderVals() {
    const v = this.baseVals();
    return Object.assign(v, this.themeVals(v));
  }
}
