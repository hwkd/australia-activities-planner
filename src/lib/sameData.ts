/**
 * Whether two JSON values hold the same data, whatever the order of their keys. Stored copies can differ
 * only in key order (a migration's `json_set` appends a key; the server re-parses in schema order), and
 * that isn't a change anyone made. As in JSON, a key set to `undefined` is the same as no key (the
 * editor's copy keeps such keys; the saved one drops them).
 */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b || Array.isArray(a) !== Array.isArray(b)) return false;
  const defined = (o: object) => Object.keys(o).filter((k) => (o as Record<string, unknown>)[k] !== undefined);
  const ka = defined(a);
  const kb = defined(b);
  return (
    ka.length === kb.length &&
    ka.every(
      (k) => Object.hasOwn(b, k) && sameData((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    )
  );
}
