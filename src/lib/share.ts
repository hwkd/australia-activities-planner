import { isWeather } from "~/stores/weather";
import { isDateStr, isTimeStr, type DateStr } from "./dates";
import { weekendToDays, type DayEntry, type Plan } from "./plan";
import { sortItems, type PlanCard } from "./planDays";

/** Share links (spec §6.5): `/plan?s=<base64url(JSON)>`, at most 8 items a day and 14 days, under 2,000 characters. */
export const MAX_ITEMS_PER_DAY = 8;
export const MAX_DAYS = 14;
export const MAX_URL = 2000;

interface SharedV2 {
  v: 2;
  d: Record<DateStr, { s?: string; i: [string, string][] }>;
}

export function toBase64Url(s: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export interface ShareResult {
  url: string;
  /** Days actually in the link. */
  dates: DateStr[];
  /** True when days or items were left out to stay within the limits; the UI says so. */
  trimmed: boolean;
}

/**
 * Builds a share URL for the given days (one day, or the next 14). Days without plans are left out.
 * If the link would be too long, later days are dropped.
 */
export function shareUrl(plan: Plan, dates: readonly DateStr[], origin: string): ShareResult {
  const withItems = [...dates].sort().filter((d) => plan.days[d]?.items.length);
  let trimmed = withItems.length > MAX_DAYS;
  let keep = withItems.slice(0, MAX_DAYS);
  const build = (ds: DateStr[]) => {
    const d: SharedV2["d"] = {};
    for (const date of ds) {
      const e = plan.days[date];
      const items = sortItems(e.items);
      if (items.length > MAX_ITEMS_PER_DAY) trimmed = true;
      d[date] = { ...(e.sky ? { s: e.sky } : {}), i: items.slice(0, MAX_ITEMS_PER_DAY).map((it) => [it.id, it.start]) };
    }
    return `${origin.replace(/\/$/, "")}/plan?s=${toBase64Url(JSON.stringify({ v: 2, d } satisfies SharedV2))}`;
  };
  let url = build(keep);
  while (url.length >= MAX_URL && keep.length > 1) {
    keep = keep.slice(0, -1);
    trimmed = true;
    url = build(keep);
  }
  return { url, dates: keep, trimmed };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Reads a share parameter (v2, or an old v1 weekend link). Unknown activities, invalid dates or
 * times and days before today are dropped without an error (spec §3.4). Null if it can't be read.
 */
export function readShare(param: string, cards: ReadonlyMap<string, PlanCard>, today: DateStr): Record<DateStr, DayEntry> | null {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(param));
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;
  let days: Record<DateStr, DayEntry> = {};
  if (raw.v === 2 && isObj(raw.d)) {
    for (const [d, e] of Object.entries(raw.d)) {
      if (!isDateStr(d) || !isObj(e)) continue;
      const items: DayEntry["items"] = [];
      for (const pair of Array.isArray(e.i) ? e.i : []) {
        if (!Array.isArray(pair)) continue;
        const [id, start] = pair as unknown[];
        if (typeof id !== "string" || !cards.has(id) || !isTimeStr(start) || items.some((x) => x.id === id)) continue;
        items.push({ id, start });
      }
      days[d] = { skySource: "manual", items: sortItems(items).slice(0, MAX_ITEMS_PER_DAY), ...(isWeather(e.s) ? { sky: e.s } : {}) };
    }
  } else if (raw.v === 1 && isDateStr(raw.w)) {
    const side = (x: unknown) =>
      isObj(x) ? { sky: isWeather(x.f) ? x.f : undefined, ids: (Array.isArray(x.i) ? x.i : []).filter((id): id is string => typeof id === "string" && cards.has(id)) } : undefined;
    days = weekendToDays(raw.w, { sat: side(raw.sat), sun: side(raw.sun) }, cards);
  } else return null;
  const out: Record<DateStr, DayEntry> = {};
  for (const d of Object.keys(days).sort()) {
    if (d < today || !days[d].items.length) continue;
    if (Object.keys(out).length === MAX_DAYS) break;
    out[d] = days[d];
  }
  return out;
}
