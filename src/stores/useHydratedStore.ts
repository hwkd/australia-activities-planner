import { useCallback, useSyncExternalStore } from "react";
import type { ReadableAtom } from "nanostores";

/**
 * Reads a store in a server-rendered island. Hydration uses `serverValue` (what the HTML was built
 * with), then React re-renders with the real client value. Without this, a persisted value that
 * differs from the build-time default (e.g. a saved or linked weather) leaves stale attributes such
 * as `aria-pressed`, because React 19 doesn't patch attribute mismatches during hydration.
 */
export function useHydratedStore<T>(store: ReadableAtom<T>, serverValue: T): T {
  const subscribe = useCallback((cb: () => void) => store.listen(cb), [store]);
  return useSyncExternalStore(subscribe, store.get, () => serverValue);
}
