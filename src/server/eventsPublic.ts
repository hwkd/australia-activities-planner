import type { EventCard } from "~/lib/events";
import type { ExportInfo } from "~/lib/calendarExport";
import { addDays, todayInSydney } from "~/lib/dates";
import { KEEP_PAST_DAYS } from "~/lib/plan";
import type { Db } from "./db";
import type { ContentMode } from "./activities";

/**
 * Published events for visitors (spec §11.4). Events stay in the planning index for 30 days after
 * they end, so past days in My plans still show their names; Discover shows only those on soon.
 * (The admin side is src/server/events.ts.)
 */
export async function publishedEventCards(db: Db, mode: ContentMode, today = todayInSydney()): Promise<EventCard[]> {
  const [{ results }, { results: live }] = await Promise.all([
    db
      .prepare("SELECT published_card FROM events WHERE published_json IS NOT NULL AND published_end >= ? ORDER BY published_end, name COLLATE NOCASE")
      .bind(addDays(today, -KEEP_PAST_DAYS))
      .all<{ published_card: string }>(),
    db.prepare(`SELECT id FROM activities WHERE published_json IS NOT NULL ${mode === "published" ? "AND published_status = 'verified'" : ""}`).all<{ id: string }>(),
  ]);
  // An event links to its activity only while that activity is on the site.
  const liveIds = new Set(live.map((r) => r.id));
  return results.map((r) => {
    const { activityId, ...card } = JSON.parse(r.published_card) as EventCard;
    return activityId && liveIds.has(activityId) ? { ...card, activityId } : card;
  });
}

export async function publishedEventExport(db: Db, today = todayInSydney()): Promise<Record<string, ExportInfo>> {
  const { results } = await db
    .prepare("SELECT id, published_export FROM events WHERE published_json IS NOT NULL AND published_end >= ?")
    .bind(addDays(today, -KEEP_PAST_DAYS))
    .all<{ id: string; published_export: string }>();
  return Object.fromEntries(results.map((r) => [r.id, JSON.parse(r.published_export) as ExportInfo]));
}
