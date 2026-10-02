import { describe, expect, it } from "vitest";
import { pickSurprise } from "./surprise";

const c = (id: string, rainy: 0 | 1 | 2) => ({ id, weatherFit: { sunny: 2, cloudy: 2, hot: 1, rainy } as const });
const results = [c("a", 2), c("b", 2), c("c", 2), c("d", 2), c("e", 1), c("f", 1)];
const first = () => 0;

describe("Surprise me (spec §11.5)", () => {
  it("picks from fit-2 results at random", () => {
    expect(pickSurprise(results, "rainy", { random: first })).toEqual({ card: results[0], fallback: false });
    expect(pickSurprise(results, "rainy", { random: () => 0.99 })?.card.id).toBe("d");
  });
  it("leaves out planned activities and the last three picks", () => {
    expect(pickSurprise(results, "rainy", { random: first, planned: new Set(["a"]), recent: ["b", "c"] })?.card.id).toBe("d");
    expect(pickSurprise(results, "rainy", { random: first, recent: ["a", "b", "c"] })?.card.id).toBe("d");
    // Only the last three count: "a" is four picks ago.
    expect(pickSurprise(results, "rainy", { random: first, recent: ["a", "b", "c", "d"] })?.card.id).toBe("a");
  });
  it("allows recent picks again when they're all there is, but never the same one twice in a row", () => {
    const two = [c("a", 2), c("b", 2)];
    expect(pickSurprise(two, "rainy", { random: first, recent: ["a", "b"] })?.card.id).toBe("a");
    expect(pickSurprise(two, "rainy", { random: first, recent: ["b", "a"] })?.card.id).toBe("b");
  });
  it("falls back to fit 1 and says so when nothing is at fit 2", () => {
    expect(pickSurprise(results, "hot", { random: first })).toEqual({ card: results[0], fallback: true });
    expect(pickSurprise([c("a", 2), c("e", 1)], "rainy", { random: first, planned: new Set(["a"]) })).toEqual({ card: c("e", 1), fallback: true });
  });
  it("returns null when everything is planned", () => {
    expect(pickSurprise(results, "rainy", { planned: new Set(results.map((r) => r.id)) })).toBeNull();
    expect(pickSurprise([], "sunny")).toBeNull();
  });
});
