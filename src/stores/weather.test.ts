import { describe, expect, it } from "vitest";
import { isWeather, WEATHERS } from "./weather";

describe("weather keys", () => {
  it("uses the spec's keys", () => {
    expect(WEATHERS).toEqual(["sunny", "cloudy", "rainy", "hot"]);
  });
  it("rejects prototype keys and junk", () => {
    expect(isWeather("rainy")).toBe(true);
    expect(isWeather("rain")).toBe(false);
    expect(isWeather(null)).toBe(false);
  });
});
