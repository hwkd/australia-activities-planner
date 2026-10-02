import { useSyncExternalStore } from "react";
import { todayInSydney, type DateStr } from "~/lib/dates";

const noop = () => () => {};
/**
 * Today in Sydney, or null while hydrating (the HTML was built on another day). Re-checks on each
 * render, so a page left open past midnight catches up on the next interaction.
 */
export function useToday(): DateStr | null {
  return useSyncExternalStore(noop, todayInSydney, () => null);
}
