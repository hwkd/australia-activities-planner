import { describe, expect, it } from "vitest";
import { holidayOn, nswHolidays } from "./holidays";

// The NSW Government table for 2026 and 2027 (https://www.nsw.gov.au/about-nsw/public-holidays, read 1 Oct 2026).
const official: Record<number, string[]> = {
  2026: ["2026-01-01", "2026-01-26", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06", "2026-04-25", "2026-04-27", "2026-06-08", "2026-10-05", "2026-12-25", "2026-12-26", "2026-12-28"],
  2027: ["2027-01-01", "2027-01-26", "2027-03-26", "2027-03-27", "2027-03-28", "2027-03-29", "2027-04-25", "2027-04-26", "2027-06-14", "2027-10-04", "2027-12-25", "2027-12-26", "2027-12-27", "2027-12-28"]
};

describe("NSW public holidays", () => {
  for (const y of [2026, 2027])
    it(`match the NSW Government table for ${y}`, () => {
      expect(nswHolidays(y).map((h) => h.date)).toEqual(official[y]);
    });
  it("names Labour Day 2026 and leaves the Bank Holiday out", () => {
    expect(holidayOn("2026-10-05")).toBe("Labour Day");
    expect(holidayOn("2026-08-03")).toBeNull();
  });
  it("moves Australia Day off a weekend", () => {
    // 26 Jan 2025 was a Sunday; the holiday was Monday 27 Jan.
    expect(holidayOn("2025-01-26")).toBeNull();
    expect(holidayOn("2025-01-27")).toBe("Australia Day");
  });
});
