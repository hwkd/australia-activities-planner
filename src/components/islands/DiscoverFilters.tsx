import { $filters } from "~/stores/filters";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { DEFAULT_FILTER_STATE, type FilterState } from "~/lib/discoverQuery";
import { track } from "~/lib/analytics";
import FilterBar from "~/components/discover/FilterBar";

/**
 * Discover's group, Free only, duration and access filters (`client:load`); results re-rank through
 * `$filters`. `accessFilters` is true once any published activity has access facts (spec §11.6).
 */
export default function DiscoverFilters({ accessFilters = false }: { accessFilters?: boolean }) {
  const filters = useHydratedStore($filters, DEFAULT_FILTER_STATE);
  const change = (next: FilterState, changed: { filter: string; value: string }) => {
    $filters.set(next);
    track({ name: "filter_change", props: changed });
  };
  return <FilterBar value={filters} onChange={change} accessFilters={accessFilters} />;
}
