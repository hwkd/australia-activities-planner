import { AREAS, isAreaId, openMeteoUrl, parseOpenMeteo, skyFromDaily, type ForecastData } from "~/lib/forecast";
import { addDays, todayInSydney } from "~/lib/dates";
import type { Weather } from "~/stores/weather";
import type { Db } from "./db";

/**
 * The live forecast in D1 (spec §11.1, tracker M16). `refreshForecasts` runs from the Worker's Cron
 * Trigger (src/worker.ts); `readForecast` serves /data/forecast.json.
 */

/** Fetches every area and stores what came back; an area that fails keeps its previous rows. */
export async function refreshForecasts(db: Db, fetcher: typeof fetch = fetch, now = new Date()): Promise<{ areas: number; days: number; failed: string[] }> {
  const fetchedAt = now.toISOString();
  const failed: string[] = [];
  let days = 0;
  const writes = [];
  for (const area of AREAS) {
    try {
      const res = await fetcher(openMeteoUrl(area), { headers: { "User-Agent": "sydney-weekend-finder (forecast job)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = parseOpenMeteo(await res.json());
      if (!rows.length) throw new Error("no usable days");
      for (const r of rows) {
        writes.push(
          db
            .prepare(
              `INSERT INTO forecasts (area, date, sky, rain_chance, rain_mm, temp_max, cloud, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (area, date) DO UPDATE SET sky = excluded.sky, rain_chance = excluded.rain_chance, rain_mm = excluded.rain_mm,
                 temp_max = excluded.temp_max, cloud = excluded.cloud, fetched_at = excluded.fetched_at`
            )
            .bind(area.id, r.date, skyFromDaily(r), Math.round(r.rainChance), r.rainMm, r.tempMax, r.cloud, fetchedAt)
        );
        days++;
      }
    } catch (e) {
      failed.push(`${area.id}: ${(e as Error).message}`);
    }
  }
  // Old days are of no use to anyone.
  writes.push(db.prepare("DELETE FROM forecasts WHERE date < ?").bind(addDays(todayInSydney(now), -1)));
  await db.batch(writes);
  return { areas: AREAS.length - failed.length, days, failed };
}

/** Today's and later days for every area, plus when they were fetched. */
export async function readForecast(db: Db, now = new Date()): Promise<ForecastData> {
  const { results } = await db
    .prepare("SELECT area, date, sky, rain_chance, fetched_at FROM forecasts WHERE date >= ? ORDER BY area, date")
    .bind(todayInSydney(now))
    .all<{ area: string; date: string; sky: Weather; rain_chance: number; fetched_at: string }>();
  const out: ForecastData = { updatedAt: null, areas: {} };
  for (const r of results) {
    if (!isAreaId(r.area)) continue;
    (out.areas[r.area] ??= {})[r.date] = { sky: r.sky, rain: r.rain_chance };
    if (!out.updatedAt || r.fetched_at < out.updatedAt) out.updatedAt = r.fetched_at;
  }
  return out;
}
