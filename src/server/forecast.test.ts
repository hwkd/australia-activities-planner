import { describe, expect, it } from "vitest";
import { testDb } from "../../tests/unit/d1";
import { readForecast, refreshForecasts } from "./forecast";

const day = (rain: number, temp = 22, cloud = 20) => ({ rain, temp, cloud });
function openMeteo(days: Record<string, ReturnType<typeof day>>) {
  const dates = Object.keys(days);
  return {
    daily: {
      time: dates,
      precipitation_probability_max: dates.map((d) => days[d].rain),
      precipitation_sum: dates.map(() => 0),
      temperature_2m_max: dates.map((d) => days[d].temp),
      cloud_cover_mean: dates.map((d) => days[d].cloud),
    },
  };
}
const now = new Date("2026-10-01T02:00:00Z"); // 12pm in Sydney

describe("forecast job (spec §11.1)", () => {
  it("stores each area's days as skies and serves today onwards", async () => {
    const db = testDb();
    const fetcher = (async (url: string) =>
      new Response(JSON.stringify(openMeteo(url.includes("150.3119") ? { "2026-10-01": day(80), "2026-10-02": day(10, 31) } : { "2026-09-30": day(0), "2026-10-01": day(10), "2026-10-02": day(10, 22, 90) })))) as typeof fetch;
    const r = await refreshForecasts(db, fetcher, now);
    expect(r.failed).toEqual([]);
    const fc = await readForecast(db, now);
    expect(fc.updatedAt).toBe(now.toISOString());
    expect(fc.areas.city).toEqual({ "2026-10-01": { sky: "sunny", rain: 10 }, "2026-10-02": { sky: "cloudy", rain: 10 } });
    expect(fc.areas["blue-mountains"]).toEqual({ "2026-10-01": { sky: "rainy", rain: 80 }, "2026-10-02": { sky: "hot", rain: 10 } });
  });
  it("keeps an area's last forecast when its fetch fails, and updates the rest", async () => {
    const db = testDb();
    await refreshForecasts(db, (async () => new Response(JSON.stringify(openMeteo({ "2026-10-01": day(10) })))) as typeof fetch, now);
    const later = new Date("2026-10-01T05:00:00Z");
    const r = await refreshForecasts(db, (async (url: string) => (url.includes("150.3119") ? new Response("down", { status: 503 }) : new Response(JSON.stringify(openMeteo({ "2026-10-01": day(70) }))))) as typeof fetch, later);
    expect(r.failed).toEqual(["blue-mountains: HTTP 503"]);
    const fc = await readForecast(db, later);
    expect(fc.areas["blue-mountains"]?.["2026-10-01"].sky).toBe("sunny");
    expect(fc.areas.city?.["2026-10-01"].sky).toBe("rainy");
    expect(fc.updatedAt).toBe(now.toISOString()); // the oldest area sets the age shown
  });
  it("is empty before the first run", async () => {
    expect(await readForecast(testDb(), now)).toEqual({ updatedAt: null, areas: {} });
  });
});
