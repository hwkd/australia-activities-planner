/**
 * Analytics events (spec §7). The browser sends each one to our own endpoint (`/api/event`), which
 * writes it to Cloudflare Workers Analytics Engine (D7: Cloudflare only; the app loads no analytics
 * script, and Cloudflare adds its Web Analytics beacon at the edge for page views). An event is its
 * name and a few fixed properties: nothing that identifies a visitor, no cookies, and the endpoint
 * stores no IP address or user agent.
 */
export type AnalyticsEvent =
  | { name: "filter_change"; props: { filter: string; value: string } }
  | { name: "activity_view"; props: { id: string } }
  | { name: "plan_add"; props: { source: "card" | "detail" | "calendar"; dayType: "weekend" | "weekday" | "holiday" } }
  | { name: "plan_change"; props: { kind: "time" | "day" } }
  | { name: "plan_b_swap"; props: Record<string, never> }
  | { name: "plan_share"; props: { scope: "day" | "fortnight" } }
  | { name: "surprise_pick"; props: { fallback: "yes" | "no" } }
  | { name: "calendar_export"; props: { target: "ics" | "google"; scope: "item" | "day" | "all" } };

const EVENT_ENDPOINT = "/api/event";

/** A short lower-case token: activity ids (at most 60, as the content schema allows) and filter values ("rainy", "true"). */
const TOKEN = /^[a-z0-9][a-z0-9_-]{0,59}$/;
const oneOf = (...values: string[]) => (v: string) => values.includes(v);
const token = (v: string) => TOKEN.test(v);

/**
 * Each event's properties, in the order they're stored (blob2, blob3, … in Analytics Engine; blob1 is
 * the event name). Anything not listed here is refused, so the dataset only ever holds these.
 */
export const EVENT_SCHEMA: Record<AnalyticsEvent["name"], [key: string, ok: (v: string) => boolean][]> = {
  // The filters Discover and the activity page report (FilterBar, Set the sky, weather tiles, reset).
  filter_change: [["filter", oneOf("weather", "group", "duration", "free", "pram", "stepFree", "reset")], ["value", token]],
  activity_view: [["id", token]],
  plan_add: [["source", oneOf("card", "detail", "calendar")], ["dayType", oneOf("weekend", "weekday", "holiday")]],
  plan_change: [["kind", oneOf("time", "day")]],
  plan_b_swap: [],
  plan_share: [["scope", oneOf("day", "fortnight")]],
  surprise_pick: [["fallback", oneOf("yes", "no")]],
  calendar_export: [["target", oneOf("ics", "google")], ["scope", oneOf("item", "day", "all")]],
};

/** The event's name and property values in stored order, or null if it isn't one of ours exactly. */
export function eventFields(input: unknown): string[] | null {
  if (!input || typeof input !== "object") return null;
  const { name, props } = input as { name?: unknown; props?: unknown };
  if (typeof name !== "string" || !Object.hasOwn(EVENT_SCHEMA, name)) return null;
  const p = (props ?? {}) as Record<string, unknown>;
  if (typeof p !== "object" || Array.isArray(p)) return null;
  const schema = EVENT_SCHEMA[name as AnalyticsEvent["name"]];
  if (Object.keys(p).length !== schema.length) return null;
  const values: string[] = [];
  for (const [key, ok] of schema) {
    const v = p[key];
    if (typeof v !== "string" || !ok(v)) return null;
    values.push(v);
  }
  return [name, ...values];
}

/**
 * Sends an event without waiting for it, and never lets analytics break the page. Browsers driven by
 * automation (tests, the perf scripts in scripts/perf) don't count.
 */
export function track(e: AnalyticsEvent): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function" || navigator.webdriver) return;
  try {
    navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(e));
  } catch {
    /* analytics must never break the UI */
  }
}
