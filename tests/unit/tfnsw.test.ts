import { describe, expect, it } from "vitest";
import { nextSaturdayLateMorning, normaliseJourney, publicLine } from "../../scripts/transport/tfnsw.mjs";

describe("Trip Planner response normalising (M9a.1)", () => {
  it("maps product classes to modes and seconds to minutes", () => {
    const json = {
      journeys: [
        {
          legs: [
            { duration: 180, transportation: { product: { class: 100 } }, origin: { name: "Central" }, destination: { name: "Central Station, Platform 24" } },
            { duration: 720, transportation: { product: { class: 1 }, disassembledName: "T4" }, destination: { name: "Bondi Junction Station" } },
            { duration: 720, transportation: { product: { class: 5 }, disassembledName: "333" }, destination: { name: "Bondi Beach stop" } },
          ],
        },
      ],
    };
    expect(normaliseJourney(json)).toEqual({
      totalMins: 27,
      legs: [
        { mode: "walk", line: undefined, mins: 3, from: "Central", to: "Central Station, Platform 24" },
        { mode: "train", line: "T4", mins: 12, from: undefined, to: "Bondi Junction Station" },
        { mode: "bus", line: "333", mins: 12, from: undefined, to: "Bondi Beach stop" },
      ],
    });
    expect(normaliseJourney({ journeys: [] })).toBeNull();
  });
  it("gives private services no line name (the Bundeena ferry's internal code BUNC never reaches the map)", () => {
    const ferry = { product: { id: 12, class: 9, name: "Private ferry and fast ferry services" }, disassembledName: "BUNC" };
    expect(publicLine(ferry)).toBeUndefined();
    expect(publicLine({ product: { class: 9, name: "Sydney Ferries Network" }, disassembledName: "F1" })).toBe("F1");
    const json = { journeys: [{ legs: [{ duration: 1740, transportation: ferry, destination: { name: "Bundeena Wharf" } }] }] };
    expect(normaliseJourney(json)!.legs[0]).toEqual({ mode: "ferry", line: undefined, mins: 29, from: undefined, to: "Bundeena Wharf" });
  });
  it("asks for the next Saturday at 10:30", () => {
    expect(nextSaturdayLateMorning(new Date("2026-10-01T00:00:00Z"))).toEqual({ itdDate: "20261003", itdTime: "1030" });
    expect(nextSaturdayLateMorning(new Date("2026-10-03T00:00:00Z"))).toEqual({ itdDate: "20261010", itdTime: "1030" });
  });
});
