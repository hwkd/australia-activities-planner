import { parseFireDanger, RFS_FEED, type FireDanger } from "~/lib/alerts";

/**
 * The RFS feed, fetched by the Worker and kept for 15 minutes per instance (spec §11.2). Null when
 * the feed fails, so the page says "check the official site" instead of showing stale data.
 */
let cached: { at: number; value: FireDanger | null } | null = null;

export async function fireDanger(fetcher: typeof fetch = fetch): Promise<FireDanger | null> {
  if (cached && Date.now() - cached.at < 15 * 60_000) return cached.value;
  let value: FireDanger | null = null;
  try {
    const res = await fetcher(RFS_FEED, { headers: { "User-Agent": "sydney-weekend-finder" }, signal: AbortSignal.timeout(3000) });
    if (res.ok) value = parseFireDanger(await res.text());
  } catch {
    /* feed down or slow: say so on the page */
  }
  // A failure is remembered for a minute only, so the next visitor tries again soon.
  cached = { at: value ? Date.now() : Date.now() - 14 * 60_000, value };
  return value;
}
