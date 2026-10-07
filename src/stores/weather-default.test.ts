import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Discover's default sky (D16, spec §3.1, AC 35): no forecast, so a first visit opens on Sunny and a
 * later visit on the last sky picked. Each "visit" is a fresh module load over the same storage.
 */
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

/** A fresh page load over the same storage (the stores install their storage engine on load). */
async function visit() {
  vi.stubGlobal("localStorage", fakeStorage);
  vi.stubGlobal("window", { localStorage: fakeStorage, addEventListener() {}, removeEventListener() {} });
  vi.resetModules();
  return import("./weather");
}

describe("Discover's default sky (D16)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    store.clear();
  });

  it("opens on Sunny on a first visit, then on the last sky picked", async () => {
    const first = await visit();
    expect(first.$weather.get()).toBe("sunny");
    first.chooseWeather("rainy");
    expect(store.get("swf.weather")).toBe("rainy");
    const later = await visit();
    expect(later.$weather.get()).toBe("rainy");
  });

  it("falls back to Sunny when the saved sky isn't one of ours", async () => {
    store.set("swf.weather", "stormy");
    const { $weather } = await visit();
    expect($weather.get()).toBe("sunny");
  });

  it("clears the old 'picked by hand' flag the forecast used", async () => {
    store.set("swf.skyPickedOn", "2026-10-01");
    await visit();
    expect(store.has("swf.skyPickedOn")).toBe(false);
  });
});
