import { describe, expect, it } from "vitest";
import { tipParts } from "./tips";

describe("tipParts", () => {
  it("leaves text without a tip alone", () => {
    expect(tipParts("Parking near the beach is metered.")).toEqual([
      { text: "Parking near the beach is metered.", tip: false },
    ]);
  });
  it("labels a whole-text tip and capitalises it", () => {
    expect(tipParts("Our tip: the car park fills by 9am on warm weekends.")).toEqual([
      { text: "The car park fills by 9am on warm weekends.", tip: true },
    ]);
  });
  it("splits a fact from the tip that follows it", () => {
    expect(tipParts("Parking near the beach is metered. Our tip: it fills by 9am.")).toEqual([
      { text: "Parking near the beach is metered.", tip: false },
      { text: "It fills by 9am.", tip: true },
    ]);
  });
});
