/**
 * Analytics events (spec §7). Sent to Plausible when its script is on the page
 * (PUBLIC_PLAUSIBLE_DOMAIN set at build); otherwise a no-op, including in dev and tests.
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

type PlausibleFn = (name: string, opts?: { props?: Record<string, string | number> }) => void;

export function track(e: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const plausible = (window as unknown as { plausible?: PlausibleFn }).plausible;
  if (!plausible) return;
  try {
    plausible(e.name, { props: e.props as Record<string, string> });
  } catch {
    /* analytics must never break the UI */
  }
}
