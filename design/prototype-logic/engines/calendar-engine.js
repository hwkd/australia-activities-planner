class Component extends DCLogic {
  constructor(...args) {
    super(...args);
    const p = this.props || {};
    this.FIT = [
      { label: "Skip", note: "Save it for another day" },
      { label: "Fine", note: "Doable, with caveats" },
      { label: "Perfect", note: "Ideal conditions" }
    ];
    this.WX = [
      { key: "sun", label: "Sunny", short: "Sunny", adj: "sunny" },
      { key: "cloud", label: "Cloudy", short: "Cloudy", adj: "cloudy" },
      { key: "rain", label: "Rainy", short: "Rainy", adj: "rainy" },
      { key: "hot", label: "Hot 30°+", short: "Hot", adj: "hot" }
    ];
    // "Today" for the prototype. Dates are local Sydney dates as YYYY-MM-DD strings.
    this.TODAY = "2026-10-01";
    // NSW public holidays in the prototype's range (est.; confirm against the NSW Government list).
    this.HOLIDAYS = { "2026-10-05": "Labour Day", "2026-12-25": "Christmas Day", "2026-12-26": "Boxing Day", "2026-12-28": "Boxing Day holiday" };
    this.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    this.DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    this.SLOTS = [
      { key: "suggested", label: "Suggested" }, { key: "morning", label: "Morning", time: "09:00" },
      { key: "midday", label: "Midday", time: "12:00" }, { key: "afternoon", label: "Afternoon", time: "14:00" },
      { key: "evening", label: "Evening", time: "18:00" }
    ];
    this.TARGETS = [
      { key: "apple", label: "Apple Calendar" }, { key: "google", label: "Google Calendar" }, { key: "outlook", label: "Outlook" }
    ];
    this.REMINDERS = [
      { key: "none", label: "None" }, { key: "30m", label: "30 min before" }, { key: "2h", label: "2 hours before" }, { key: "1d", label: "1 day before" }
    ];
    // ---------------------------------------------------------------------------------
    // Activities (29), from content/sydney. dur = planned hours; start = suggested start.
    // w = [sunny, cloudy, rainy, hot]: 2 perfect, 1 fine, 0 skip. days = only these weekdays.
    // ---------------------------------------------------------------------------------
    this.ACTS = {};
    [
      {"id":"bondi-coogee","name":"Bondi to Coogee Coastal Walk","area":"Eastern Suburbs","cat":"Coastal walk","dur":2.5,"w":[2,2,0,1],"days":null,"place":"Bondi Beach","start":"08:30","getThere":"Train to Bondi Junction, then bus 333 or 380 to Bondi Beach. Bus back to the city from Coogee.","goodFor":["date","friends","family","solo"]},
      {"id":"manly","name":"Ferry to Manly & Shelly Beach","area":"Northern Beaches","cat":"Ferry & beach","dur":4,"w":[2,2,1,2],"days":null,"place":"Manly Wharf","start":"10:00","getThere":"F1 ferry from Circular Quay, about 30 min. Tap on with Opal or a contactless card.","goodFor":["date","friends","family","solo"]},
      {"id":"spit-manly","name":"Spit Bridge to Manly Walk","area":"Northern Beaches","cat":"Bushwalk","dur":3.5,"w":[2,2,0,1],"days":null,"place":"Spit Bridge","start":"09:00","getThere":"Bus from Wynyard to Spit Bridge. Ferry home from Manly to Circular Quay.","goodFor":["date","friends","solo"]},
      {"id":"three-sisters","name":"Three Sisters & Echo Point","area":"Blue Mountains","cat":"Lookout & walk","dur":6,"w":[2,1,0,2],"days":null,"place":"Echo Point Lookout","start":"08:30","getThere":"Blue Mountains line from Central to Katoomba (about 2 hrs), then a local bus or 25 min walk to Echo Point.","goodFor":["date","friends","family","solo"]},
      {"id":"wentworth","name":"Wentworth Falls & National Pass","area":"Blue Mountains","cat":"Bushwalk","dur":3.5,"w":[2,1,0,1],"days":null,"place":"Wentworth Falls picnic area","start":"08:30","getThere":"Train from Central to Wentworth Falls station, then walk to the Falls Reserve picnic area.","goodFor":["friends","solo"]},
      {"id":"botanic","name":"Royal Botanic Garden & Mrs Macquarie's Chair","area":"City","cat":"Gardens","dur":1.5,"w":[2,2,0,1],"days":null,"place":"Queen Elizabeth II Gate","start":"09:30","getThere":"Walk from Circular Quay or Martin Place station.","goodFor":["date","friends","family","solo"]},
      {"id":"opera-tour","name":"Sydney Opera House Tour","area":"City","cat":"Culture","dur":1,"w":[2,2,2,2],"days":null,"place":"Sydney Opera House","start":"11:00","getThere":"Short walk from Circular Quay station and ferry wharves.","goodFor":["date","friends","family","solo"]},
      {"id":"agnsw","name":"Art Gallery of NSW","area":"The Domain","cat":"Gallery","dur":2.5,"w":[1,2,2,2],"days":null,"place":"Art Gallery of NSW","start":"10:30","getThere":"Walk from St James or Martin Place station through the Domain.","goodFor":["date","friends","family","solo"]},
      {"id":"aus-museum","name":"Australian Museum","area":"City","cat":"Museum","dur":2,"w":[1,2,2,2],"days":null,"place":"Australian Museum","start":"10:00","getThere":"Opposite Hyde Park, near Museum and St James stations.","goodFor":["date","family","solo"]},
      {"id":"taronga","name":"Taronga Zoo","area":"Mosman","cat":"Wildlife","dur":4,"w":[2,2,1,1],"days":null,"place":"Taronga Zoo Wharf","start":"09:30","getThere":"F2 ferry from Circular Quay to Taronga Zoo wharf, about 12 min.","goodFor":["date","friends","family"]},
      {"id":"watsons","name":"Watsons Bay & The Gap","area":"Eastern Suburbs","cat":"Ferry & lookout","dur":4,"w":[2,2,0,1],"days":null,"place":"Watsons Bay Wharf","start":"11:00","getThere":"F9 ferry from Circular Quay to Watsons Bay.","goodFor":["date","friends","family"]},
      {"id":"bridge-walk","name":"Walk across the Harbour Bridge","area":"The Rocks","cat":"Landmark","dur":1,"w":[2,2,1,1],"days":null,"place":"Bridge Stairs, Cumberland St","start":"16:30","getThere":"Stairs up from Cumberland St in The Rocks. Finish at Milsons Point station.","goodFor":["date","friends","family","solo"]},
      {"id":"rocks-markets","name":"The Rocks Markets","area":"The Rocks","cat":"Markets","dur":1.5,"w":[2,2,1,1],"days":null,"place":"The Rocks Markets","start":"10:00","getThere":"Short walk from Circular Quay or Wynyard.","goodFor":["date","friends","family","solo"]},
      {"id":"cockatoo","name":"Cockatoo Island","area":"Sydney Harbour","cat":"History","dur":4,"w":[2,2,1,1],"days":null,"place":"Cockatoo Island Wharf","start":"10:30","getThere":"F3 or F8 ferry from Circular Quay.","goodFor":["date","friends","family"]},
      {"id":"balmoral","name":"Balmoral Beach","area":"Mosman","cat":"Beach","dur":4,"w":[2,1,0,2],"days":null,"place":"Balmoral Beach","start":"10:00","getThere":"Bus from Wynyard or the city, about 40 min.","goodFor":["date","family"]},
      {"id":"icebergs","name":"Bondi Icebergs Pool","area":"Bondi","cat":"Swimming","dur":1.5,"w":[2,1,0,2],"days":null,"place":"Bondi Icebergs Pool","start":"09:00","getThere":"Train to Bondi Junction, then bus 333 or 380 to Bondi Beach.","goodFor":["date","friends","solo"]},
      {"id":"sea-life","name":"SEA LIFE Aquarium","area":"Darling Harbour","cat":"Wildlife","dur":2,"w":[1,2,2,2],"days":null,"place":"SEA LIFE Sydney Aquarium","start":"10:00","getThere":"Walk from Town Hall or Wynyard station.","goodFor":["date","family"]},
      {"id":"featherdale","name":"Featherdale Wildlife Park","area":"Western Sydney","cat":"Wildlife","dur":4,"w":[2,2,1,1],"days":null,"place":"Featherdale Wildlife Park","start":"09:00","getThere":"Train to Blacktown, then a short bus ride.","goodFor":["date","friends","family"]},
      {"id":"chinatown","name":"Haymarket & Chinatown Food Crawl","area":"Haymarket","cat":"Food","dur":2.5,"w":[1,2,2,2],"days":null,"place":"Dixon Street, Haymarket","start":"18:30","getThere":"Train to Central or Town Hall, or light rail to Chinatown.","goodFor":["date","friends","family"]},
      {"id":"newtown","name":"Newtown Street Art & King St","area":"Inner West","cat":"Neighbourhood","dur":2.5,"w":[2,2,1,1],"days":null,"place":"Newtown Station","start":"17:00","getThere":"Train to Newtown station.","goodFor":["date","friends","solo"]},
      {"id":"royal-np","name":"Royal National Park via Bundeena","area":"Sutherland Shire","cat":"Coastal walk","dur":6,"w":[2,1,0,1],"days":null,"place":"Bundeena Wharf","start":"08:00","getThere":"Train to Cronulla, then the small ferry across Port Hacking to Bundeena.","goodFor":["date","friends","solo"]},
      {"id":"palm-beach","name":"Palm Beach & Barrenjoey Lighthouse","area":"Northern Beaches","cat":"Lookout & beach","dur":6,"w":[2,1,0,1],"days":null,"place":"Palm Beach","start":"08:30","getThere":"Bus from Manly wharf (about 75 min), or drive.","goodFor":["date","friends"]},
      {"id":"clovelly","name":"Clovelly Beach","area":"Eastern Suburbs","cat":"Swimming","dur":2.5,"w":[2,1,0,2],"days":null,"place":"Clovelly Beach","start":"09:00","getThere":"Bus 339 from Central to Clovelly, then a short walk down to the water.","goodFor":["date","friends","family","solo"]},
      {"id":"coogee","name":"Coogee Beach & Ocean Pools","area":"Eastern Suburbs","cat":"Beach","dur":3.5,"w":[2,2,1,2],"days":null,"place":"Coogee Beach","start":"10:00","getThere":"Bus 372 from Central or 373 from Circular Quay to Coogee Beach.","goodFor":["date","friends","family","solo"]},
      {"id":"north-head","name":"North Head Lookouts","area":"Manly","cat":"Lookout & walk","dur":3,"w":[2,2,0,1],"days":null,"place":"North Head Sanctuary","start":"09:30","getThere":"Ferry to Manly, then bus 135 up to North Head, or walk up via Shelly Beach (about 1 hr).","goodFor":["date","friends","family","solo"]},
      {"id":"cronulla","name":"Cronulla Beach & Esplanade","area":"Sutherland Shire","cat":"Beach","dur":3.5,"w":[2,1,0,2],"days":null,"place":"Cronulla Beach","start":"10:00","getThere":"T4 Illawarra line to Cronulla, the last stop. The beach is a 6 minute walk.","goodFor":["date","friends","family","solo"]},
      {"id":"carriageworks","name":"Carriageworks Farmers Market","area":"Inner City","cat":"Markets","dur":1.5,"w":[2,2,2,2],"days":["sat"],"place":"Carriageworks","start":"08:30","getThere":"Train to Redfern, then an 8 minute walk through Little Eveleigh St.","goodFor":["date","friends","family","solo"]},
      {"id":"parramatta","name":"Parramatta River & Eat Street","area":"Parramatta","cat":"Neighbourhood","dur":3.5,"w":[2,2,1,1],"days":null,"place":"Lennox Bridge, Church St","start":"15:00","getThere":"T1 train to Parramatta, or the slow, scenic F3 ferry up the river from Circular Quay.","goodFor":["date","friends","family","solo"]},
      {"id":"leura","name":"Leura Village & Gardens","area":"Blue Mountains","cat":"Neighbourhood","dur":4,"w":[2,2,1,2],"days":null,"place":"Leura Mall","start":"10:00","getThere":"Blue Mountains Line to Leura. The village starts at the station.","goodFor":["date","friends","family"]}
    ].forEach((a) => { this.ACTS[a.id] = a; });
    const addId = this.ACTS[p.activity] ? p.activity : "manly";
    this.state = {
      month: "2026-10", selected: "2026-10-03",
      plan: {
        "2026-10-03": [{ id: "bondi-coogee", start: "08:30" }, { id: "rocks-markets", start: "13:00" }],
        "2026-10-04": [{ id: "three-sisters", start: "08:30" }],
        "2026-10-05": [{ id: "taronga", start: "09:30" }],
        "2026-10-07": [{ id: "chinatown", start: "18:30" }],
        "2026-10-10": [{ id: "carriageworks", start: "08:30" }, { id: "newtown", start: "10:00" }],
        "2026-10-14": [{ id: "agnsw", start: "17:30" }]
      },
      forecast: { "2026-10-03": "sun", "2026-10-04": "rain", "2026-10-05": "cloud", "2026-10-07": "cloud" },
      sheet: p.sheet === "add" ? "add" : null,
      focus: null,
      exp: { scope: "day", target: "apple", remind: "1d", directions: true, done: false },
      add: { id: addId, date: "2026-10-03", slot: "suggested", done: false }
    };
  }

  componentDidUpdate(prev) {
    const p = this.props || {};
    if (prev && prev.activity !== p.activity && this.ACTS[p.activity]) this.setState({ add: Object.assign({}, this.state.add, { id: p.activity, done: false }) });
  }

  // ---- Shared behaviour. Do not change the logic. ----
  baseVals() {
    const s = this.state, WX = this.WX, FIT = this.FIT, A = this.ACTS, self = this;
    const pad = (n) => (n < 10 ? "0" : "") + n;
    const iso = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
    const parts = (d) => d.split("-").map(Number);
    const dow = (d) => { const [y, m, dd] = parts(d); return (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7; }; // 0 = Monday
    const addDays = (d, n) => { const [y, m, dd] = parts(d); const t = new Date(Date.UTC(y, m - 1, dd + n)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
    const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const clock = (m) => { const h = Math.floor(m / 60), mm = m % 60, h12 = ((h + 11) % 12) + 1; return h12 + (mm ? ":" + pad(mm) : "") + (h < 12 ? "am" : "pm"); };
    const short = (d) => { const [, m, dd] = parts(d); return this.DAYS[dow(d)].slice(0, 3) + " " + dd + " " + this.MONTHS[m - 1].slice(0, 3); };
    const long = (d) => { const [, m, dd] = parts(d); return this.DAYS[dow(d)] + " " + dd + " " + this.MONTHS[m - 1]; };
    const rel = (d) => {
      const diff = Math.round((Date.UTC(...parts(d).map((v, i) => (i === 1 ? v - 1 : v))) - Date.UTC(...parts(this.TODAY).map((v, i) => (i === 1 ? v - 1 : v)))) / 86400000);
      if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday";
      if (diff > 1 && diff < 7) return "This " + this.DAYS[dow(d)]; if (diff >= 7 && diff < 14) return "Next " + this.DAYS[dow(d)];
      return diff < 0 ? "Past" : "In " + Math.round(diff / 7) + " weeks";
    };
    const flags = (k) => ({ isSun: k === "sun", isCloud: k === "cloud", isRain: k === "rain", isHot: k === "hot", isUnset: !k });
    const wIdx = (k) => WX.findIndex((w) => w.key === k);
    const setPlan = (date, list) => this.setState({ plan: Object.assign({}, this.state.plan, { [date]: list }) });
    const dayName = (i) => this.DAYS[i];
    const onlyDays = (a) => (a.days ? a.days.map((k) => (k === "sat" ? "Saturdays" : k === "sun" ? "Sundays" : k)).join(" and ") : "");
    const runsOn = (a, d) => !a.days || a.days.indexOf(["mon", "tue", "wed", "thu", "fri", "sat", "sun"][dow(d)]) >= 0;

    // ---- One planned day: items with times, fit, conflicts, Plan B ----
    const dayInfo = (d) => {
      const fk = s.forecast[d] || null, fi = fk ? wIdx(fk) : -1;
      const raw = (s.plan[d] || []).slice().sort((x, y) => mins(x.start) - mins(y.start));
      const used = {};
      Object.keys(s.plan).forEach((k) => s.plan[k].forEach((it) => { used[it.id] = true; }));
      const items = raw.map((it, i) => {
        const a = A[it.id], st = mins(it.start), en = st + Math.round(a.dur * 60);
        const fit = fi >= 0 ? a.w[fi] : null;
        const clash = raw.find((o, j) => j !== i && mins(o.start) < en && mins(o.start) + Math.round(A[o.id].dur * 60) > st);
        const notToday = !runsOn(a, d);
        let backup = null;
        if (fit === 0) {
          const c = Object.values(A).filter((b) => !used[b.id] && b.w[fi] === 2 && runsOn(b, d) && b.goodFor.some((g) => a.goodFor.indexOf(g) >= 0));
          c.sort((x, y) => ((y.area === a.area) - (x.area === a.area)) || x.name.localeCompare(y.name));
          backup = c[0] || null;
        }
        const warn = notToday ? a.name + " runs on " + onlyDays(a) + " only." : clash ? "Overlaps with " + A[clash.id].name + "." : "";
        return {
          key: d + ":" + it.id, id: it.id, name: a.name, area: a.area, cat: a.cat, place: a.place, index: i, delay: (i * 70) + "ms",
          start: it.start, startLabel: clock(st), endLabel: clock(en), timeLabel: clock(st) + " – " + clock(en), durLabel: a.dur + (a.dur === 1 ? " hr" : " hrs"),
          hasFit: fit !== null, noFit: fit === null, fit: fit === null ? -1 : fit,
          isGreat: fit === 2, isOk: fit === 1, isSkip: fit === 0, fitLabel: fit === null ? "" : FIT[fit].label,
          fitText: fit === null ? "Set the sky to check the fit" : FIT[fit].label + " when " + WX[fi].adj,
          hasWarn: !!warn, warn: warn, hasBackup: !!backup,
          backup: backup ? { name: backup.name, area: backup.area, swap: () => setPlan(d, this.state.plan[d].map((o) => (o.id === it.id ? { id: backup.id, start: o.start } : o))) } : { name: "", area: "", swap: null },
          later: () => setPlan(d, this.state.plan[d].map((o) => (o.id === it.id ? { id: o.id, start: clockIso(mins(o.start) + 30) } : o))),
          earlier: () => setPlan(d, this.state.plan[d].map((o) => (o.id === it.id ? { id: o.id, start: clockIso(Math.max(360, mins(o.start) - 30)) } : o))),
          canEarlier: st > 360, laterAria: "Start " + a.name + " 30 minutes later", earlierAria: "Start " + a.name + " 30 minutes earlier",
          remove: () => { const l = this.state.plan[d].filter((o) => o.id !== it.id); setPlan(d, l); },
          removeAria: "Remove " + a.name + " from " + long(d),
          toCalendar: () => this.setState({ sheet: "export", focus: { date: d, id: it.id }, exp: Object.assign({}, this.state.exp, { scope: "item", done: false }) }),
          toCalendarAria: "Add " + a.name + " to your calendar"
        };
      });
      return { fk, fi, items };
    };
    const clockIso = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);

    // ---- Month grid (Monday first, as in Australia) ----
    const [vy, vm] = s.month.split("-").map(Number);
    const first = iso(vy, vm, 1), startD = addDays(first, -dow(first));
    const daysIn = new Date(Date.UTC(vy, vm, 0)).getUTCDate();
    const rows = Math.ceil((dow(first) + daysIn) / 7);
    const weeks = [];
    for (let r = 0; r < rows; r++) {
      const cells = [];
      for (let c = 0; c < 7; c++) {
        const d = addDays(startD, r * 7 + c), [y, m, dd] = parts(d), fk = s.forecast[d] || null, list = s.plan[d] || [];
        const info = list.length ? dayInfo(d) : { items: [] };
        const warn = info.items.some((x) => x.isSkip || x.hasWarn);
        cells.push(Object.assign(flags(fk), {
          date: d, num: String(dd), inMonth: m === vm, outMonth: m !== vm, isToday: d === this.TODAY, isPast: d < this.TODAY,
          isWeekend: c >= 5, isHoliday: !!this.HOLIDAYS[d], holiday: this.HOLIDAYS[d] || "",
          selected: d === s.selected, notSelected: d !== s.selected, pressed: d === s.selected ? "true" : "false",
          count: list.length, hasPlan: list.length > 0, noPlan: list.length === 0, countLabel: String(list.length),
          dots: list.slice(0, 3).map((x, i) => ({ i })), more: list.length > 3, hasForecast: !!fk, warn: warn,
          chips: info.items.slice(0, 2).map((x) => ({ name: x.name, time: x.startLabel, isSkip: x.isSkip })), extra: list.length > 2 ? "+" + (list.length - 2) + " more" : "", hasExtra: list.length > 2,
          aria: long(d) + (this.HOLIDAYS[d] ? ", " + this.HOLIDAYS[d] : "") + (list.length ? ", " + list.length + (list.length === 1 ? " plan" : " plans") : ", nothing planned") + (fk ? ", " + WX[wIdx(fk)].adj : ""),
          pick: () => this.setState({ selected: d, month: d.slice(0, 7) })
        }));
      }
      weeks.push({ index: r, cells });
    }
    const shiftMonth = (n) => { const t = new Date(Date.UTC(vy, vm - 1 + n, 1)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, 1).slice(0, 7); };
    const canPrev = s.month > "2026-09", canNext = s.month < "2026-12";

    // ---- Selected day ----
    const sel = dayInfo(s.selected);
    const selFk = sel.fk;
    const day = Object.assign(flags(selFk), {
      date: s.selected, title: long(s.selected), rel: rel(s.selected), short: short(s.selected),
      isHoliday: !!this.HOLIDAYS[s.selected], holiday: this.HOLIDAYS[s.selected] || "",
      holidayNote: this.HOLIDAYS[s.selected] ? "Public holiday: " + this.HOLIDAYS[s.selected] + ". Expect weekend timetables and busier places." : "",
      isPast: s.selected < this.TODAY,
      items: sel.items, hasItems: sel.items.length > 0, isEmpty: sel.items.length === 0,
      countLabel: sel.items.length ? sel.items.length + (sel.items.length === 1 ? " plan" : " plans") : "Nothing planned",
      forecastLabel: selFk ? WX[wIdx(selFk)].label : "Sky not set",
      forecastHint: selFk ? "Forecast you set for this day" : "Set the sky to check each plan's fit",
      skies: WX.map((w) => Object.assign(flags(w.key), {
        key: w.key, label: w.short, selected: selFk === w.key, notSelected: selFk !== w.key, pressed: selFk === w.key ? "true" : "false",
        aria: "Set " + long(s.selected) + " to " + w.adj,
        pick: () => this.setState({ forecast: Object.assign({}, this.state.forecast, { [s.selected]: w.key }) })
      })),
      warnCount: sel.items.filter((x) => x.isSkip || x.hasWarn).length,
      toCalendar: () => this.setState({ sheet: "export", focus: null, exp: Object.assign({}, this.state.exp, { scope: "day", done: false }) }),
      findIdeas: () => this.setState({ sheet: "add", add: Object.assign({}, this.state.add, { date: s.selected, done: false }) })
    });

    // ---- Coming up: the next planned days from today ----
    const upcoming = Object.keys(s.plan).filter((d) => d >= this.TODAY && s.plan[d].length).sort().slice(0, 5).map((d) => {
      const inf = dayInfo(d);
      return Object.assign(flags(inf.fk), { date: d, short: short(d), rel: rel(d), names: inf.items.map((x) => x.name).join(" · "), count: inf.items.length,
        warn: inf.items.some((x) => x.isSkip || x.hasWarn), selected: d === s.selected, pick: () => this.setState({ selected: d, month: d.slice(0, 7) }) });
    });

    // ---- Add to my calendar (export) ----
    const E = s.exp;
    const allUpcoming = Object.keys(s.plan).filter((d) => d >= this.TODAY).sort();
    const evFor = (d, it) => {
      const a = A[it.id], st = mins(it.start), en = st + Math.round(a.dur * 60);
      const stamp = (m) => d.replace(/-/g, "") + "T" + pad(Math.floor(m / 60)) + pad(m % 60) + "00";
      const notes = (E.directions ? "Getting there: " + a.getThere + "\n\n" : "") + "Planned with Sydney Weekend Finder.";
      const g = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(a.name) + "&dates=" + stamp(st) + "/" + stamp(en) +
        "&ctz=Australia%2FSydney&location=" + encodeURIComponent(a.place + ", Sydney NSW") + "&details=" + encodeURIComponent(notes);
      return { key: d + ":" + it.id, title: a.name, when: short(d) + " · " + clock(st) + " – " + clock(en), where: a.place + ", " + a.area,
        notes: E.directions ? a.getThere : "", hasNotes: E.directions, gHref: g, gLabel: "Add " + a.name + " to Google Calendar" };
    };
    let events = [];
    if (E.scope === "item" && s.focus) events = [evFor(s.focus.date, (s.plan[s.focus.date] || []).find((x) => x.id === s.focus.id) || { id: s.focus.id, start: A[s.focus.id].start })];
    else if (E.scope === "day") events = (s.plan[s.selected] || []).slice().sort((x, y) => mins(x.start) - mins(y.start)).map((it) => evFor(s.selected, it));
    else allUpcoming.forEach((d) => s.plan[d].slice().sort((x, y) => mins(x.start) - mins(y.start)).forEach((it) => events.push(evFor(d, it))));
    const n = events.length, isGoogle = E.target === "google";
    const fileName = "sydney-plans-" + (E.scope === "all" ? "upcoming" : (E.scope === "item" && s.focus ? s.focus.date : s.selected)) + ".ics";
    const pickOpt = (list, cur, key) => list.map((o) => ({ key: o.key, label: o.label, selected: cur === o.key, notSelected: cur !== o.key, pressed: cur === o.key ? "true" : "false",
      pick: () => this.setState({ exp: Object.assign({}, this.state.exp, { [key]: o.key, done: false }) }) }));
    const scopes = [{ key: "item", label: "This activity" }, { key: "day", label: "This day" }, { key: "all", label: "Everything coming up" }].filter((o) => o.key !== "item" || !!s.focus);
    const exp = {
      open: s.sheet === "export", closed: s.sheet !== "export",
      scopes: pickOpt(scopes, E.scope, "scope"), targets: pickOpt(this.TARGETS, E.target, "target"), reminders: pickOpt(this.REMINDERS, E.remind, "remind"),
      directions: E.directions, directionsPressed: E.directions ? "true" : "false",
      toggleDirections: () => this.setState({ exp: Object.assign({}, this.state.exp, { directions: !this.state.exp.directions, done: false }) }),
      events: events, count: n, hasEvents: n > 0, noEvents: n === 0, countLabel: n + (n === 1 ? " event" : " events"),
      isGoogle: isGoogle, isFile: !isGoogle, oneGoogle: isGoogle && n === 1, manyGoogle: isGoogle && n > 1,
      firstHref: n ? events[0].gHref : "",
      primaryLabel: isGoogle ? (n === 1 ? "Open in Google Calendar" : "Add each event to Google Calendar") : "Download calendar file",
      fileName: fileName,
      targetNote: isGoogle ? "Google opens one event at a time and uses your default reminders." : (E.target === "apple" ? "Opens in Calendar on iPhone, iPad and Mac." : "Opens in Outlook on desktop, web and phone."),
      remindNote: isGoogle ? "" : (E.remind === "none" ? "No reminder" : "Reminder " + this.REMINDERS.find((r) => r.key === E.remind).label),
      done: E.done, notDone: !E.done,
      doneTitle: isGoogle ? "Opened in Google Calendar" : "Calendar file ready",
      doneNote: isGoogle ? "Save each event in the Google tab that opened." : "Open " + fileName + " to add " + n + (n === 1 ? " event" : " events") + " with times, place and directions.",
      download: () => this.setState({ exp: Object.assign({}, this.state.exp, { done: true }) }),
      close: () => this.setState({ sheet: null, focus: null, exp: Object.assign({}, this.state.exp, { done: false }) }),
      title: E.scope === "item" && s.focus ? "Add to your calendar" : E.scope === "day" ? "Add " + short(s.selected) + " to your calendar" : "Add your plans to your calendar"
    };

    // ---- Add an activity to any day ----
    const AD = s.add, aa = A[AD.id] || A.manly, aFk = s.forecast[AD.date] || null, aFi = aFk ? wIdx(aFk) : -1;
    const slot = this.SLOTS.find((x) => x.key === AD.slot) || this.SLOTS[0];
    const aStart = slot.time || aa.start, aSt = mins(aStart), aEn = aSt + Math.round(aa.dur * 60);
    const aClash = (s.plan[AD.date] || []).find((o) => o.id !== aa.id && mins(o.start) < aEn && mins(o.start) + Math.round(A[o.id].dur * 60) > aSt);
    const already = (s.plan[AD.date] || []).some((o) => o.id === aa.id);
    const quick = [0, 1, 2, 3, 4].map((k) => addDays(this.TODAY, k));
    if (quick.indexOf(AD.date) < 0) quick.push(AD.date);
    const aFit = aFi >= 0 ? aa.w[aFi] : null;
    const aWarn = !runsOn(aa, AD.date) ? aa.name + " runs on " + onlyDays(aa) + " only. Pick another day." : aClash ? "Overlaps with " + A[aClash.id].name + " (" + clock(mins(aClash.start)) + "). You can still add it." : "";
    const addMonthWeeks = weeks.map((w) => ({ index: w.index, cells: w.cells.map((c) => Object.assign({}, c, {
      selected: c.date === AD.date, notSelected: c.date !== AD.date, pressed: c.date === AD.date ? "true" : "false", disabled: c.isPast, enabled: !c.isPast,
      blocked: !runsOn(aa, c.date), pick: () => this.setState({ add: Object.assign({}, this.state.add, { date: c.date, done: false }) })
    })) }));
    const add = {
      open: s.sheet === "add", closed: s.sheet !== "add",
      id: aa.id, name: aa.name, area: aa.area, cat: aa.cat, place: aa.place, durLabel: aa.dur + (aa.dur === 1 ? " hr" : " hrs"),
      date: AD.date, dateTitle: long(AD.date), dateRel: rel(AD.date), dateShort: short(AD.date),
      quick: quick.map((d, i) => Object.assign(flags(s.forecast[d] || null), { date: d, top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : this.DAYS[dow(d)].slice(0, 3), num: String(parts(d)[2]),
        isHoliday: !!this.HOLIDAYS[d], selected: d === AD.date, notSelected: d !== AD.date, pressed: d === AD.date ? "true" : "false", blocked: !runsOn(aa, d),
        aria: long(d) + (this.HOLIDAYS[d] ? ", " + this.HOLIDAYS[d] : "") + (!runsOn(aa, d) ? ", not running" : ""),
        pick: () => this.setState({ add: Object.assign({}, this.state.add, { date: d, done: false }) }) })),
      weeks: addMonthWeeks, monthLabel: this.MONTHS[vm - 1] + " " + vy,
      slots: this.SLOTS.map((o) => ({ key: o.key, label: o.label, time: clock(mins(o.time || aa.start)), selected: AD.slot === o.key, notSelected: AD.slot !== o.key, pressed: AD.slot === o.key ? "true" : "false",
        pick: () => this.setState({ add: Object.assign({}, this.state.add, { slot: o.key, done: false }) }) })),
      timeLabel: clock(aSt) + " – " + clock(aEn), suggestedNote: "Suggested start for " + aa.name + ": " + clock(mins(aa.start)),
      hasFit: aFit !== null, noFit: aFit === null, isGreat: aFit === 2, isOk: aFit === 1, isSkip: aFit === 0,
      fitText: aFit === null ? "No sky set for " + short(AD.date) + " yet" : this.FIT[aFit].label + " when " + WX[aFi].adj,
      hasWarn: !!aWarn, warn: aWarn, blocked: !runsOn(aa, AD.date), canAdd: runsOn(aa, AD.date) && !already, already: already,
      confirmLabel: !runsOn(aa, AD.date) ? "Not running on " + short(AD.date) : already ? "Already on " + short(AD.date) : "Add to " + short(AD.date) + ", " + clock(aSt),
      confirm: () => {
        if (!runsOn(aa, AD.date) || already) return;
        const l = (this.state.plan[AD.date] || []).concat([{ id: aa.id, start: aStart }]);
        this.setState({ plan: Object.assign({}, this.state.plan, { [AD.date]: l }), add: Object.assign({}, this.state.add, { done: true }), selected: AD.date, month: AD.date.slice(0, 7) });
      },
      done: AD.done, notDone: !AD.done,
      doneTitle: "Added to " + long(AD.date),
      toCalendar: () => this.setState({ sheet: "export", focus: { date: AD.date, id: aa.id }, exp: Object.assign({}, this.state.exp, { scope: "item", done: false }) }),
      close: () => this.setState({ sheet: null, add: Object.assign({}, this.state.add, { done: false }) }),
      openSheet: () => this.setState({ sheet: "add", add: Object.assign({}, this.state.add, { done: false }) })
    };

    return Object.assign(flags(selFk), {
      today: this.TODAY, todayLabel: long(this.TODAY),
      monthLabel: this.MONTHS[vm - 1] + " " + vy, monthShort: this.MONTHS[vm - 1],
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((l, i) => ({ label: l, letter: l[0], full: dayName(i), isWeekend: i >= 5 })),
      weeks: weeks, canPrev: canPrev, canNext: canNext, cantPrev: !canPrev, cantNext: !canNext,
      prevMonth: () => { if (canPrev) this.setState({ month: shiftMonth(-1) }); },
      nextMonth: () => { if (canNext) this.setState({ month: shiftMonth(1) }); },
      goToday: () => this.setState({ selected: this.TODAY, month: this.TODAY.slice(0, 7) }),
      day: day, upcoming: upcoming, hasUpcoming: upcoming.length > 0,
      planCount: String(Object.keys(s.plan).filter((d) => d >= this.TODAY).reduce((t, d) => t + s.plan[d].length, 0)),
      exp: exp, add: add, sheetOpen: !!s.sheet, noSheet: !s.sheet,
      weather: selFk || "sun"
    });
  }

  // ---- Direction-specific values (Sky Mode palette per weather, per-item styles). ----
  themeVals(v) {
    return {};
  }

  renderVals() {
    const v = this.baseVals();
    return Object.assign(v, this.themeVals(v));
  }
}
