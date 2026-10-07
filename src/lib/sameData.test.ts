import { describe, expect, it } from "vitest";
import { sameData } from "./sameData";

describe("sameData", () => {
  it("ignores key order, at every depth", () => {
    expect(
      sameData({ id: "a", state: "nsw", geo: { lat: 1, lng: 2 } }, { geo: { lng: 2, lat: 1 }, id: "a", state: "nsw" }),
    ).toBe(true);
  });
  it("treats a key set to undefined like no key, as saved JSON does", () => {
    expect(sameData({ a: 1, detail: undefined }, { a: 1 })).toBe(true);
    expect(sameData([{ line: undefined }], [{}])).toBe(true);
  });
  it("sees real differences: values, missing keys, array order, types", () => {
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameData({ a: 1 }, { a: 1, b: null })).toBe(false);
    expect(sameData([1, 2], [2, 1])).toBe(false);
    expect(sameData([1], { 0: 1 })).toBe(false);
    expect(sameData(null, {})).toBe(false);
  });
});
