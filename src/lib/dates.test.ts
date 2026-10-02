import { describe, expect, it } from "vitest";
import { addDays, lastPlannableDate, clockLabel, dayType, effectiveStart, endOf, instantOf, isDateStr, monthGrid, relativeLabel, shortLabel, todayInSydney, weekday } from "./dates";

describe("dates in Sydney", () => {
  it("works out today in Sydney regardless of the machine's zone (tests run with TZ=UTC)", () => {
    // 2026-10-01 15:30 UTC is already 2 Oct 01:30 in Sydney (AEST, +10).
    expect(todayInSydney(new Date("2026-10-01T15:30:00Z"))).toBe("2026-10-02");
    expect(todayInSydney(new Date("2026-10-01T13:59:00Z"))).toBe("2026-10-01");
  });
  it("validates date strings", () => {
    expect(isDateStr("2026-10-03")).toBe(true);
    expect(isDateStr("2026-02-30")).toBe(false);
    expect(isDateStr("3 Oct")).toBe(false);
  });
  it("builds a Monday-first month grid", () => {
    const g = monthGrid("2026-10");
    expect(g[0][0]).toBe("2026-09-28");
    expect(g.length).toBe(5);
    expect(g[4][6]).toBe("2026-11-01");
    expect(weekday("2026-10-03")).toBe(5); // Saturday
  });
  it("labels dates", () => {
    expect(shortLabel("2026-10-03")).toBe("Sat 3 Oct");
    expect(relativeLabel("2026-10-03", "2026-10-01")).toBe("This Saturday");
    expect(relativeLabel("2026-10-10", "2026-10-01")).toBe("Next Saturday");
    expect(relativeLabel("2026-10-02", "2026-10-01")).toBe("Tomorrow");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("classifies days for Opal caps", () => {
    expect(dayType("2026-10-05")).toBe("holiday"); // Labour Day
    expect(dayType("2026-10-07")).toBe("weekday");
    expect(dayType("2026-10-03")).toBe("weekend");
  });
});

describe("daylight saving (AC 26)", () => {
  it("keeps 10am as 10am Sydney time on the day clocks go forward", () => {
    expect(instantOf("2026-10-04", "10:00").toISOString()).toBe("2026-10-04T10:00:00.000+11:00");
  });
  it("moves a start in the skipped hour to 3:00am", () => {
    expect(effectiveStart("2026-10-04", "02:30")).toBe("03:00");
    expect(effectiveStart("2026-10-04", "01:30")).toBe("01:30");
  });
  it("keeps real durations across the change", () => {
    // 1am + 3 real hours = 5am wall-clock when clocks jump forward an hour.
    expect(endOf("2026-10-04", "01:00", 180)).toEqual({ date: "2026-10-04", time: "05:00" });
    // 1am + 3 real hours on the day clocks go back (5 Apr 2026, 3am → 2am) = 3am wall-clock.
    expect(endOf("2026-04-05", "01:00", 180)).toEqual({ date: "2026-04-05", time: "03:00" });
  });
  it("formats clock labels", () => {
    expect(clockLabel("08:30")).toBe("8:30am");
    expect(clockLabel("13:00")).toBe("1pm");
    expect(clockLabel("00:15")).toBe("12:15am");
  });
});

describe("plannable range", () => {
  it("runs to the end of the month six months ahead", () => {
    expect(lastPlannableDate("2026-10-01")).toBe("2027-04-30");
    expect(lastPlannableDate("2026-08-31")).toBe("2027-02-28");
  });
});
