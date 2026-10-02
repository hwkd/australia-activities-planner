/**
 * True when this page was reached with Back or Forward. A Discover URL's filters then don't override
 * the saved ones: the user may have changed the weather on an activity page since (spec AC 22).
 */
export function isBackForward(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "back_forward";
  } catch {
    return false;
  }
}
