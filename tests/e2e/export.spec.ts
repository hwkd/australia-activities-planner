import { idle, open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const act = (id: string) => JSON.parse(readFileSync(`db/seed/activities/${id}.json`, "utf8")) as { name: string; area: string; routes: { dest: { label: string } } };
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
});
async function seed(page: Page, days: Record<string, { id: string; start: string }[]>) {
  await page.goto("/404");
  const plan = { v: 2, updatedAt: "x", days: Object.fromEntries(Object.entries(days).map(([d, items]) => [d, { skySource: "manual", items }])) };
  await page.evaluate((v) => localStorage.setItem("swf.plan.v2", v), JSON.stringify(plan));
}
const sheet = (page: Page) => page.getByRole("dialog", { name: "Add to your calendar" });
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

test("AC 25: a day with two plans downloads one .ics with both events, place, directions and reminder", async ({ page }) => {
  await seed(page, { "2026-10-03": [{ id: "bondi-coogee", start: "08:30" }, { id: "icebergs", start: "13:00" }] });
  await open(page, "/plan?d=2026-10-03");
  await idle(page);
  await page.getByRole("button", { name: "Add Sat 3 Oct to my calendar" }).click();
  await expect(sheet(page).getByText("Preview · 2 events")).toBeVisible();
  await sheet(page).getByRole("button", { name: "1 day before" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download calendar file" }).click()]);
  expect(dl.suggestedFilename()).toBe("sydney-plans-2026-10-03.ics");
  const ics = unfold(readFileSync((await dl.path())!, "utf8"));
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(ics).toContain("DTSTART;TZID=Australia/Sydney:20261003T083000");
  expect(ics).toContain("DTSTART;TZID=Australia/Sydney:20261003T130000");
  expect(ics).toContain(`LOCATION:${act("bondi-coogee").routes.dest.label}\\, ${act("bondi-coogee").area} NSW`);
  expect(ics).toContain("By public transport from Central Station");
  expect(ics.match(/TRIGGER:-P1D/g)).toHaveLength(2);
  expect(ics).toContain("BEGIN:VTIMEZONE");
  await expect(sheet(page).getByText("Calendar file ready")).toBeVisible();
});

test("AC 26: daylight saving start day: 10am stays 10:00 and 2:30am moves to 3:00am", async ({ page }) => {
  await seed(page, { "2026-10-04": [{ id: "botanic", start: "10:00" }, { id: "agnsw", start: "02:30" }] });
  await open(page, "/plan?d=2026-10-04");
  await idle(page);
  await page.getByRole("button", { name: "Add Sun 4 Oct to my calendar" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download calendar file" }).click()]);
  const ics = unfold(readFileSync((await dl.path())!, "utf8"));
  expect(ics).toContain("DTSTART;TZID=Australia/Sydney:20261004T100000");
  expect(ics).toContain("DTSTART;TZID=Australia/Sydney:20261004T030000");
});

test("AC 27: Google Calendar: one link for one plan, one link per plan for several", async ({ page }) => {
  await seed(page, { "2026-10-03": [{ id: "bondi-coogee", start: "08:30" }, { id: "icebergs", start: "13:00" }] });
  await open(page, "/plan?d=2026-10-03");
  await idle(page);
  await page.getByRole("button", { name: `Add ${act("bondi-coogee").name} to my calendar` }).click();
  await sheet(page).getByRole("button", { name: /^Google Calendar/ }).click();
  const one = page.getByRole("link", { name: /Open in Google Calendar/ });
  const u = new URL((await one.getAttribute("href"))!);
  expect(u.searchParams.get("text")).toBe(act("bondi-coogee").name);
  expect(u.searchParams.get("ctz")).toBe("Australia/Sydney");
  expect(u.searchParams.get("dates")).toMatch(/^20261003T083000\/20261003T\d{6}$/);
  expect(u.searchParams.get("location")).toContain(act("bondi-coogee").routes.dest.label);
  expect(u.searchParams.get("details")).toContain("Getting back");
  await sheet(page).getByRole("button", { name: "Sat 3 Oct", exact: true }).click();
  await expect(sheet(page).getByRole("link", { name: /to Google Calendar/ })).toHaveCount(2);
});

test("AC 27: times stay Sydney's on a device set to another time zone", async ({ browser }) => {
  // Browsers run on Sydney time (playwright.config.ts) because page.clock only works there, so this
  // one runs abroad on the real clock, a fortnight ahead.
  const ctx = await browser.newContext({ timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
  const day = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10);
  await seed(page, { [day]: [{ id: "bondi-coogee", start: "08:30" }] });
  await open(page, `/plan?d=${day}`);
  await idle(page);
  await expect(page.getByText("8:30am").filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("button", { name: `Add ${act("bondi-coogee").name} to my calendar` }).click();
  await sheet(page).getByRole("button", { name: /^Google Calendar/ }).click();
  const u = new URL((await page.getByRole("link", { name: /Open in Google Calendar/ }).getAttribute("href"))!);
  const ymd = day.replace(/-/g, "");
  expect(u.searchParams.get("dates")).toMatch(new RegExp(`^${ymd}T083000/${ymd}T\\d{6}$`));
  await ctx.close();
});

test("AC 28: Labour Day is shown and uses the weekend cap; a Wednesday uses the weekday cap", async ({ page }) => {
  await open(page, "/plan?d=2026-10-05");
  await expect(page.getByRole("button", { name: /^Monday 5 October, Labour Day/ })).toBeVisible();
  await expect(page.getByText("Public holiday: Labour Day.")).toBeVisible();

  await open(page, "/a/three-sisters?day=2026-10-05");
  await page.locator("#h-cost").scrollIntoViewIfNeeded();
  await expect(page.getByText("Public holiday (Labour Day): weekend fares.")).toBeVisible();
  await expect(page.getByText(/Opal's weekend cap applies/)).toBeVisible();
  await idle(page);
  await page.getByRole("button", { name: /to a day/ }).click();
  await expect(page.getByRole("dialog").getByText("Public holiday: Labour Day.", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");

  await open(page, "/a/three-sisters?day=2026-10-07");
  await page.locator("#h-cost").scrollIntoViewIfNeeded();
  await expect(page.getByText("Weekday fares. They can be higher at peak times.")).toBeVisible();
});
