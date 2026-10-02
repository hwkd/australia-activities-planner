import { describe, expect, it } from "vitest";
import { applyForecast, forecastAge, forecastFor, nearestArea, NO_FORECAST, parseOpenMeteo, restoreForecastSky, skyFromDaily, type ForecastData } from "./forecast";
import { addItem, emptyPlan, setSky } from "./plan";

describe("forecast mapping (spec §11.1)", () => {
  const base = { rainChance: 10, rainMm: 0, tempMax: 24, cloud: 20 };
  it("applies rainy, hot, cloudy, sunny in that order", () => {
    expect(skyFromDaily(base)).toBe("sunny");
    expect(skyFromDaily({ ...base, cloud: 70 })).toBe("cloudy");
    expect(skyFromDaily({ ...base, cloud: 90, tempMax: 30 })).toBe("hot");
    expect(skyFromDaily({ ...base, tempMax: 33, rainChance: 50 })).toBe("rainy");
    expect(skyFromDaily({ ...base, rainChance: 20, rainMm: 2 })).toBe("rainy");
    expect(skyFromDaily({ ...base, rainChance: 49, rainMm: 1.9, tempMax: 29.9, cloud: 69 })).toBe("sunny");
  });
  it("finds the nearest area", () => {
    expect(nearestArea({ lat: -33.7148, lng: 150.3115 })).toBe("blue-mountains"); // Katoomba
    expect(nearestArea({ lat: -33.5966, lng: 151.3233 })).toBe("northern-beaches"); // Palm Beach
    expect(nearestArea({ lat: -34.0566, lng: 151.1523 })).toBe("royal-np"); // Cronulla
    expect(nearestArea({ lat: -33.8915, lng: 151.2767 })).toBe("city"); // Bondi
    expect(nearestArea({ lat: -33.8148, lng: 151.0017 })).toBe("city"); // Parramatta
  });
  it("parses Open-Meteo's daily block and skips incomplete days", () => {
    const json = {
      daily: {
        time: ["2026-10-01", "2026-10-02"],
        precipitation_probability_max: [60, null],
        precipitation_sum: [3.2, 0],
        temperature_2m_max: [21, 25],
        cloud_cover_mean: [80, 10],
      },
    };
    expect(parseOpenMeteo(json)).toEqual([{ date: "2026-10-01", rainChance: 60, rainMm: 3.2, tempMax: 21, cloud: 80 }]);
    expect(parseOpenMeteo({})).toEqual([]);
  });
});

describe("forecast skies in the plan (spec §11.1)", () => {
  const fc: ForecastData = {
    updatedAt: "2026-10-01T00:00:00Z",
    areas: {
      city: { "2026-09-30": { sky: "sunny", rain: 0 }, "2026-10-03": { sky: "sunny", rain: 10 }, "2026-10-04": { sky: "cloudy", rain: 20 } },
      "blue-mountains": { "2026-10-03": { sky: "rainy", rain: 80 } },
    },
  };
  const cards = new Map([
    ["walk", { weatherFit: { sunny: 2, cloudy: 2, rainy: 0, hot: 1 } as const, forecastArea: "blue-mountains" as const }],
    ["museum", { weatherFit: { sunny: 2, cloudy: 2, rainy: 2, hot: 2 } as const, forecastArea: "city" as const }],
  ]);
  it("pre-sets forecast days as auto, using the first plan's area, and skips the past", () => {
    const p = addItem(emptyPlan(), "2026-10-03", "walk", "10:00");
    const { plan, alerts } = applyForecast(p, fc, cards, "2026-10-01");
    expect(plan.days["2026-10-03"]).toEqual({ items: [{ id: "walk", start: "10:00" }], sky: "rainy", skySource: "auto" });
    expect(plan.days["2026-10-04"]).toEqual({ items: [], sky: "cloudy", skySource: "auto" });
    expect(plan.days["2026-09-30"]).toBeUndefined();
    expect(plan.updatedAt).toBe(p.updatedAt);
    expect(alerts).toEqual([]); // no earlier sky, so nothing "changed"
  });
  it("never overwrites a sky the user chose", () => {
    const p = setSky(addItem(emptyPlan(), "2026-10-03", "walk", "10:00"), "2026-10-03", "sunny");
    expect(applyForecast(p, fc, cards, "2026-10-01").plan.days["2026-10-03"]).toMatchObject({ sky: "sunny", skySource: "manual" });
  });
  it("alerts when an auto sky changes and turns a plan into a Skip", () => {
    const p0 = addItem(emptyPlan(), "2026-10-03", "walk", "10:00");
    const p1 = { ...p0, days: { ...p0.days, "2026-10-03": { ...p0.days["2026-10-03"], sky: "sunny" as const, skySource: "auto" as const } } };
    const { alerts } = applyForecast(p1, fc, cards, "2026-10-01");
    expect(alerts).toEqual([{ date: "2026-10-03", sky: "rainy", count: 1 }]);
  });
  it("returns the same plan when nothing changes, and does nothing without a forecast", () => {
    const once = applyForecast(emptyPlan(), fc, cards, "2026-10-01").plan;
    expect(applyForecast(once, fc, cards, "2026-10-01").plan).toBe(once);
    const p = emptyPlan();
    expect(applyForecast(p, NO_FORECAST, cards, "2026-10-01").plan).toBe(p);
  });
  it("falls back to the city's forecast, and Use forecast goes back to auto", () => {
    expect(forecastFor(fc, "2026-10-04", "blue-mountains")).toEqual({ sky: "cloudy", rain: 20, area: "city" });
    const p = setSky(emptyPlan(), "2026-10-04", "hot");
    expect(restoreForecastSky(p, "2026-10-04", "cloudy").days["2026-10-04"]).toEqual({ items: [], sky: "cloudy", skySource: "auto" });
  });
});

describe("forecast age", () => {
  const at = "2026-10-01T00:00:00Z";
  it("reads naturally", () => {
    expect(forecastAge(at, new Date("2026-10-01T00:03:00Z"))).toBe("updated just now");
    expect(forecastAge(at, new Date("2026-10-01T00:25:00Z"))).toBe("updated 25 min ago");
    expect(forecastAge(at, new Date("2026-10-01T02:10:00Z"))).toBe("updated 2 h ago");
    expect(forecastAge(at, new Date("2026-10-04T00:00:00Z"))).toBe("updated 3 days ago");
  });
});
