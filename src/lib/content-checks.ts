import type { Activity } from "~/content/schema";

/**
 * Checks that span fields or files, which the per-file schema can't express (spec §5, AC 15).
 * Returns human-readable problems; an empty list means the content is good. Any problem blocks
 * publishing in the admin.
 */
export function checkActivities(list: Activity[], fileIds?: string[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  list.forEach((a, i) => {
    if (ids.has(a.id)) problems.push(`${a.id}: duplicate id`);
    ids.add(a.id);
    if (fileIds && fileIds[i] !== a.id) problems.push(`${a.id}: id doesn't match its file name (${fileIds[i]})`);
  });
  const p = (a: Activity, m: string) => problems.push(`${a.id}: ${m}`);

  for (const a of list) {
    // The real map's places (spec §3.2 item 3, §4.3): the pins and the list share these numbers.
    const places = a.geo.places;
    places.forEach((q, i) => {
      if (q.n !== i + 1) p(a, `map places must be numbered 1..n in order (found ${q.n} at position ${i + 1})`);
    });
    const starts = places.filter((q) => q.type === "start").length;
    if (!starts) p(a, "the map needs a start place");
    if (starts > 1) p(a, "the map has more than one start place");
    if (places.filter((q) => q.type === "end").length > 1) p(a, "the map has more than one end place");
    // The way back is drawn only with Getting back's words next to it (AC 17).
    if (a.geo.back && !a.routes.pt.back.text.trim()) p(a, "the map draws a way back, but Getting back has no text");
    const d = a.routes.dest;
    // The map's tiles: greater Sydney plus the day trips by train, Newcastle to Kiama.
    if (d.lng < 150 || d.lng > 152 || d.lat < -35 || d.lat > -32.5) p(a, `directions point outside the Sydney map (${d.lat}, ${d.lng})`);
    for (const pr of a.pairings) {
      if (pr.activityId === a.id) p(a, "pairs with itself");
      else if (!ids.has(pr.activityId)) p(a, `pairing "${pr.name}" points to "${pr.activityId}", which isn't an activity`);
    }
    if (a.costs.extras.some((e, i, arr) => arr.findIndex((x) => x.id === e.id) !== i)) p(a, "duplicate cost extra ids");
  }
  return problems;
}

/** The launch mix in spec §5. Reported, not enforced, until the content track (C1) is done. */
export function launchMixReport(list: Activity[]): string[] {
  const notes: string[] = [];
  if (list.length < 40) notes.push(`${list.length} activities; launch needs 40`);
  const rainy = list.filter((a) => a.weatherFit.rainy === 2).length;
  if (rainy < 10) notes.push(`${rainy} activities are great in rain; launch needs 10`);
  const free = list.filter((a) => a.cost === "Free").length;
  if (free < 10) notes.push(`${free} free activities; launch needs 10`);
  for (const g of ["date", "friends", "family", "solo"] as const)
    for (const w of ["sunny", "cloudy", "rainy", "hot"] as const) {
      const n = list.filter((a) => a.goodFor.includes(g) && a.weatherFit[w] >= 1).length;
      if (n < 12) notes.push(`${g} + ${w}: ${n} activities with fit ≥ 1; launch needs 12`);
    }
  return notes;
}

/** The date six calendar months before `today` (YYYY-MM-DD), clamped to the month's last day. */
export function sixMonthsBefore(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const total = y * 12 + (m - 1) - 6;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/**
 * A verified activity that hasn't been checked against official sources in the last 6 months needs
 * re-checking (spec §5). Drafts aren't flagged: they haven't been checked at all yet.
 */
export function needsRecheck(status: "draft" | "verified", lastVerified: string | null, today: string): boolean {
  return status === "verified" && (!lastVerified || lastVerified < sixMonthsBefore(today));
}
