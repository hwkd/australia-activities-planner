import { describe, expect, it } from "vitest";
import { activities } from "../../tests/unit/cards";
import { directionsHref, drivingNote, lastStretch, linesInWords, wayIn } from "./route";

const a = (id: string) => activities.find((x) => x.id === id)!;

describe("Getting there, derived from the trip (spec §4.3, D14)", () => {
  it("the way-in strip is the train, bus and ferry legs without the walks", () => {
    expect(wayIn(a("bondi-coogee").routes.pt.legs).map((w) => w.label)).toEqual(["T4", "333"]);
    expect(wayIn(a("royal-np").routes.pt.legs)).toEqual([
      { mode: "train", kind: "train", label: "T4" },
      { mode: "ferry", kind: "ferry", label: "Ferry" },
    ]);
    expect(wayIn(a("chinatown").routes.pt.legs)).toEqual([]);
  });
  it("the last stretch runs from the last vehicle leg to the door; a walk-only trip is its walk", () => {
    const legs = a("bondi-coogee").routes.pt.legs;
    expect(lastStretch(legs).map((l) => l.title)).toEqual(["Bus to Bondi Beach", "Walk to the start at the south end"]);
    expect(lastStretch(a("chinatown").routes.pt.legs)).toEqual(a("chinatown").routes.pt.legs);
  });
  it("directions open Google Maps transit directions to dest", () => {
    expect(directionsHref(a("bondi-coogee").routes.dest)).toBe("https://www.google.com/maps/dir/?api=1&destination=-33.8915,151.2767&travelmode=transit");
  });
});

describe("the Driving? note (spec §3.2 item 4, AC 20)", () => {
  it("Bondi to Coogee: time from the city, parking per car marked est., tips and the rideshare line", () => {
    const d = drivingNote(a("bondi-coogee").routes);
    expect(d).toMatchObject({ canDrive: true, time: "≈ 25 min", cost: "Parking, 3 hrs: $15–30 per car, est." });
    if (d.canDrive) expect(d.notes.length).toBeGreaterThan(0);
    expect(d.ride).toBe(a("bondi-coogee").routes.ride);
  });
  it("Cockatoo Island says you can't drive there and why", () => {
    expect(drivingNote(a("cockatoo").routes)).toEqual({ canDrive: false, reason: a("cockatoo").routes.unavailable!.drive, ride: null });
  });
  it("a label that already says est. doesn't say it twice", () => {
    expect(drivingNote(a("featherdale").routes)).toMatchObject({ cost: "M4 toll. Parking is free: $0–12 per car, est." });
  });
  it("a rideshare line only where the content has one", () => {
    expect(drivingNote(a("agnsw").routes).ride).toBeNull();
  });
});

describe("the lines under the map (spec §3.2 item 3, AC 17)", () => {
  it("names the trip's lines, and the way back only when it's drawn", () => {
    const g = a("bondi-coogee").geo;
    expect(linesInWords(g, false)).toBe("On the map: T4 train, bus 333, walk");
    expect(linesInWords(g, true)).toBe("On the map: T4 train, bus 333, walk; way back: bus 374");
    expect(linesInWords({}, true)).toBeNull();
  });
});
