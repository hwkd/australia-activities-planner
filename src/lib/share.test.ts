import { describe, expect, it } from "vitest";
import { cardMap, cards } from "../../tests/unit/cards";
import { addItem, emptyPlan, setSky } from "./plan";
import { fromBase64Url, MAX_URL, readShare, shareUrl, toBase64Url } from "./share";
import { addDays } from "./dates";

const SAT = "2026-10-03";
const ORIGIN = "https://example.com";
const param = (url: string) => new URL(url).searchParams.get("s")!;

describe("share links (spec §6.5)", () => {
  it("round-trips a plan, in start order, with the sky", () => {
    let p = addItem(addItem(emptyPlan(), SAT, "rocks-markets", "13:00"), SAT, "bondi-coogee", "08:30");
    p = setSky(addItem(p, "2026-10-07", "chinatown", "18:30"), SAT, "sunny");
    const r = shareUrl(p, [SAT, "2026-10-07"], ORIGIN);
    expect(JSON.parse(fromBase64Url(param(r.url)))).toEqual({ v: 2, d: { [SAT]: { s: "sunny", i: [["bondi-coogee", "08:30"], ["rocks-markets", "13:00"]] }, "2026-10-07": { i: [["chinatown", "18:30"]] } } });
    expect(readShare(param(r.url), cardMap, "2026-10-01")).toEqual({ [SAT]: p.days[SAT], "2026-10-07": p.days["2026-10-07"] });
    expect(r.trimmed).toBe(false);
  });
  it("stays under 2,000 characters with 8 items a day for 14 days", () => {
    let p = emptyPlan();
    const ids = [...cards].sort((a, b) => b.id.length - a.id.length).slice(0, 10).map((c) => c.id);
    const dates = Array.from({ length: 16 }, (_, i) => addDays(SAT, i));
    for (const d of dates) ids.forEach((id, i) => (p = addItem(p, d, id, `${String(8 + i).padStart(2, "0")}:00`)));
    const r = shareUrl(p, dates, ORIGIN);
    expect(r.url.length).toBeLessThan(MAX_URL);
    expect(r.trimmed).toBe(true);
    expect(r.dates.length).toBeLessThanOrEqual(14);
    const back = readShare(param(r.url), cardMap, SAT)!;
    expect(Object.values(back).every((d) => d.items.length <= 8)).toBe(true);
  });
  it("drops unknown ids, bad dates and times, past days, without an error", () => {
    const s = toBase64Url(JSON.stringify({ v: 2, d: { [SAT]: { s: "hail", i: [["bondi-coogee", "08:30"], ["nope", "09:00"], ["agnsw", "9am"]] }, "2026-02-30": { i: [["agnsw", "10:00"]] }, "2026-09-01": { i: [["agnsw", "10:00"]] } } }));
    expect(readShare(s, cardMap, "2026-10-01")).toEqual({ [SAT]: { skySource: "manual", items: [{ id: "bondi-coogee", start: "08:30" }] } });
    expect(readShare("!!!", cardMap, SAT)).toBeNull();
    expect(readShare(toBase64Url('{"v":3}'), cardMap, SAT)).toBeNull();
  });
  it("opens old v1 weekend links", () => {
    const s = toBase64Url(JSON.stringify({ v: 1, w: SAT, sat: { f: "sunny", i: ["bondi-coogee"] }, sun: { f: "rainy", i: ["three-sisters"] } }));
    const r = readShare(s, cardMap, "2026-10-01")!;
    expect(r[SAT].sky).toBe("sunny");
    expect(r["2026-10-04"].items.map((i) => i.id)).toEqual(["three-sisters"]);
  });
  it("base64url handles any text", () => expect(fromBase64Url(toBase64Url("Café ✓ ?/+"))).toBe("Café ✓ ?/+"));
});
