import { describe, expect, it } from "vitest";
import { quickDays } from "./quickDays";

describe("quick days (spec §3.3, AC 5)", () => {
  it("Thu 1 Oct 2026: today, tomorrow, Sat, Sun and Labour Day", () => {
    expect(quickDays("2026-10-01")).toEqual([
      { date: "2026-10-01", label: "Today", holiday: null },
      { date: "2026-10-02", label: "Tomorrow", holiday: null },
      { date: "2026-10-03", label: "Sat", holiday: null },
      { date: "2026-10-04", label: "Sun", holiday: null },
      { date: "2026-10-05", label: "Mon", holiday: "Labour Day" },
    ]);
  });
  it("on a Saturday, today is the Saturday; no holiday within 14 days is fine", () => {
    const q = quickDays("2026-10-10");
    expect(q.map((d) => d.date)).toEqual(["2026-10-10", "2026-10-11"]);
    expect(q[1].label).toBe("Tomorrow");
  });
  it("adds the chosen date when it isn't a quick day", () => {
    expect(quickDays("2026-10-01", "2026-10-21").at(-1)?.date).toBe("2026-10-21");
  });
});
