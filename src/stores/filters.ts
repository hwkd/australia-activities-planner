import "./storage";
import { persistentAtom } from "@nanostores/persistent";
import { DEFAULT_FILTER_STATE, normalizeFilters, parseDiscoverQuery, type FilterState } from "~/lib/discoverQuery";
import { isBackForward } from "./navigation";

/** Discover's group, duration and Free only filters, saved so they come back next time (spec §3.1). */
export const $filters = persistentAtom<FilterState>("swf.filters", DEFAULT_FILTER_STATE, {
  encode: JSON.stringify,
  decode: (s) => {
    try {
      return normalizeFilters(JSON.parse(s));
    } catch {
      return DEFAULT_FILTER_STATE;
    }
  },
});

// A Discover URL is the whole view: it wins over the saved filters, except after Back/Forward.
// (The weather store reads `?w` itself; `$planningDate` reads `?day`.)
if (typeof location !== "undefined" && !isBackForward()) {
  const q = parseDiscoverQuery(location.search);
  if (q.filters && JSON.stringify(q.filters) !== JSON.stringify($filters.get())) $filters.set(q.filters);
}
