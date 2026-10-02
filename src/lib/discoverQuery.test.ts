import { describe, expect, it } from "vitest";
import { DEFAULT_FILTER_STATE, discoverQuery, normalizeFilters, parseDiscoverQuery } from "./discoverQuery";

describe("Discover URL (spec §3.1, AC 2)", () => {
  it("round-trips a view", () => {
    const f = { group: "family", duration: "half", freeOnly: true, pram: false, stepFree: false } as const;
    const q = discoverQuery("rainy", f);
    expect(q).toBe("?w=rainy&g=family&free=1&d=half");
    expect(parseDiscoverQuery(q)).toEqual({ weather: "rainy", filters: f });
  });
  it("round-trips the access filters (spec §11.6)", () => {
    const f = { ...DEFAULT_FILTER_STATE, pram: true, stepFree: true };
    expect(discoverQuery("sunny", f)).toBe("?w=sunny&pram=1&step=1");
    expect(parseDiscoverQuery("?step=1").filters).toEqual({ ...DEFAULT_FILTER_STATE, stepFree: true });
    expect(normalizeFilters({ pram: true })).toEqual({ ...DEFAULT_FILTER_STATE, pram: true });
  });
  it("omits defaults but always includes the weather", () => {
    expect(discoverQuery("sunny", DEFAULT_FILTER_STATE)).toBe("?w=sunny");
    expect(parseDiscoverQuery("?w=sunny")).toEqual({ weather: "sunny", filters: DEFAULT_FILTER_STATE });
  });
  it("no Discover parameters → saved filters apply", () => {
    expect(parseDiscoverQuery("")).toEqual({});
    expect(parseDiscoverQuery("?utm_source=x")).toEqual({});
  });
  it("ignores invalid values", () => {
    expect(parseDiscoverQuery("?w=hail&g=cats&d=forever&free=yes&day=2026-02-30")).toEqual({ filters: DEFAULT_FILTER_STATE });
    expect(parseDiscoverQuery("?day=2026-10-07").day).toBe("2026-10-07");
  });
  it("normalizes stored filters", () => {
    expect(normalizeFilters({ group: "family", duration: "nope", freeOnly: "true" })).toEqual({ ...DEFAULT_FILTER_STATE, group: "family" });
    expect(normalizeFilters(null)).toEqual(DEFAULT_FILTER_STATE);
  });
});
