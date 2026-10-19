import { parseFireDanger, RFS_FEED, SYDNEY_DISTRICT, type District, type FireDanger } from "~/lib/alerts";

/**
 * The RFS feed, fetched by the Worker and kept for 15 minutes per instance and district (spec
 * §11.2). Null when the feed fails, so the page says "check the official site" instead of showing
 * stale data.
 */
const cached = new Map<District, { at: number; value: FireDanger | null }>();

export async function fireDanger(district: District = SYDNEY_DISTRICT, fetcher: typeof fetch = fetch): Promise<FireDanger | null> {
  const hit = cached.get(district);
  if (hit && Date.now() - hit.at < 15 * 60_000) return hit.value;
  let value: FireDanger | null = null;
  try {
    const res = await fetcher(RFS_FEED, { headers: { "User-Agent": "sydney-weekend-finder" }, signal: AbortSignal.timeout(3000) });
    if (res.ok) value = parseFireDanger(await res.text(), district);
  } catch {
    /* feed down or slow: say so on the page */
  }
  // A failure is remembered for a minute only, so the next visitor tries again soon.
  cached.set(district, { at: value ? Date.now() : Date.now() - 14 * 60_000, value });
  return value;
}
