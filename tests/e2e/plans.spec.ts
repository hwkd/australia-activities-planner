import { fakeClipboard, idle, open, themeChange } from "./helpers";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const act = (id: string) => JSON.parse(readFileSync(`db/seed/activities/${id}.json`, "utf8")) as { name: string; weatherFit: Record<string, number>; days?: string[]; suggestedStart: string };

/** Thu 1 Oct 2026, 10am in Sydney (AEST, before daylight saving starts on the 4th). */
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
});

async function seed(page: Page, key: string, value: unknown) {
  await page.goto("/404");
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(value)] as const);
}
const plan = (days: Record<string, { sky?: string; items: { id: string; start: string }[] }>) => ({
  v: 2,
  updatedAt: "2026-10-01T00:00:00.000Z",
  days: Object.fromEntries(Object.entries(days).map(([d, e]) => [d, { skySource: "manual", ...e }])),
});
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("swf.plan.v2") ?? "null"));
const sheet = (page: Page) => page.getByRole("dialog");
const dayPanel = (page: Page) => page.locator('section[aria-labelledby="cal-day"]');

test("AC 4: Add to a day from the activity page (Wed 7 Oct, Evening)", async ({ page }) => {
  const a = act("agnsw");
  await open(page, "/a/agnsw");
  await idle(page);
  await page.getByRole("button", { name: `Add to a day: ${a.name}` }).click();
  await sheet(page).getByText("Pick a date").click();
  await sheet(page).getByRole("button", { name: /^Wednesday 7 October/ }).click();
  await sheet(page).getByRole("button", { name: /^Evening/ }).click();
  await sheet(page).getByRole("button", { name: "Add to Wed 7 Oct, 6pm" }).click();
  await expect(sheet(page).getByRole("heading", { name: "Added to Wednesday 7 October" })).toBeVisible();
  expect((await stored(page)).days["2026-10-07"].items).toEqual([{ id: "agnsw", start: "18:00" }]);
  await sheet(page).getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: /Planned · Wed 7 Oct/ })).toBeVisible();
  await open(page, "/");
  await expect(page.locator(".tab-badge")).toContainText("1");
  await expect(page.getByText("Planned · Wed 7 Oct")).toBeVisible();
  await open(page, "/plan?d=2026-10-07");
  await expect(dayPanel(page).getByRole("heading", { name: a.name })).toBeVisible();
  await expect(dayPanel(page).getByText("6pm", { exact: true })).toBeVisible();
});

test("AC 5: Add from a card offers the quick days and stays on Discover", async ({ page }) => {
  await open(page, "/?w=sunny");
  await idle(page);
  const first = page.getByRole("list", { name: "Ranked results" }).getByRole("listitem").first();
  await first.getByRole("button", { name: /to a day$/ }).click();
  const quick = sheet(page).getByRole("group", { name: "Quick days" }).getByRole("button");
  await expect(quick).toHaveCount(5);
  await expect(quick.nth(0)).toHaveAccessibleName(/^Thursday 1 October/);
  await expect(quick.nth(1)).toHaveAccessibleName(/^Friday 2 October/);
  await expect(quick.nth(2)).toHaveAccessibleName(/^Saturday 3 October/);
  await expect(quick.nth(3)).toHaveAccessibleName(/^Sunday 4 October/);
  await expect(quick.nth(4)).toHaveAccessibleName(/^Monday 5 October, Labour Day/);
  await quick.nth(2).click();
  await sheet(page).getByRole("button", { name: /^Add to Sat 3 Oct/ }).click();
  await expect(sheet(page).getByText("Added to Saturday 3 October")).toBeVisible();
  await expect(page).toHaveURL((u) => u.pathname === "/");
  await expect(page.locator(".tab-badge")).toHaveText(/^1/);
});

test("the My plans count is there from the first paint, so the Discover | My plans switch never changes size", async ({ page }) => {
  await seed(page, "swf.plan.v2", plan({ "2026-09-30": { items: [{ id: "agnsw", start: "10:00" }] }, "2026-10-04": { items: [{ id: "three-sisters", start: "09:00" }, { id: "agnsw", start: "14:00" }] } }));
  // The switch's geometry as the page is parsed (before islands or module scripts run), then once settled.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const links = [...document.querySelectorAll(".tabbar a")].map((a) => a.getBoundingClientRect());
      (window as unknown as { first: number[][] }).first = links.map((r) => [r.left, r.width]);
    });
  });
  const shapes: number[][][] = [];
  for (const path of ["/?w=sunny", "/plan"]) {
    await open(page, path);
    await idle(page);
    const badge = page.locator(".tab-badge");
    await expect(badge).toHaveText(/^2/); // yesterday's plan isn't coming up
    const [first, last] = await page.evaluate(() => [
      (window as unknown as { first: number[][] }).first,
      [...document.querySelectorAll(".tabbar a")].map((a) => [a.getBoundingClientRect().left, a.getBoundingClientRect().width]),
    ]);
    expect(first, path).toEqual(last);
    shapes.push(last);
  }
  // Same tabs on both pages (where the switch sits follows each page's right edge: responsive.spec).
  expect(shapes[0].map(([, w]) => w), "the same tabs on both pages").toEqual(shapes[1].map(([, w]) => w));
});

// With motion on in every engine (the WebKit and Firefox projects otherwise reduce motion): a new sky
// switches the colours at once, and no element runs its own colour transition (spec §3.5).
test.describe("sky changes with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("My plans: setting a day's sky starts no per-element colour transitions", async ({ page }) => {
    await seed(page, "swf.plan.v2", plan({ "2026-10-04": { items: [{ id: "agnsw", start: "10:00" }] } }));
    await open(page, "/plan?d=2026-10-04");
    const panel = dayPanel(page);
    const { transitions } = await themeChange(page, "rainy", () =>
      panel.getByRole("group", { name: /Set the sky/ }).getByRole("button", { name: /Rainy/ }).click(),
    );
    expect(transitions).toBeLessThanOrEqual(4);
  });

  test("Add to a day: picking a date with another sky re-themes the sheet without colour transitions", async ({ page }) => {
    await seed(page, "swf.plan.v2", plan({ "2026-10-03": { sky: "cloudy", items: [{ id: "agnsw", start: "10:00" }] } }));
    await open(page, "/?w=sunny");
    await idle(page);
    const first = page.getByRole("list", { name: "Ranked results" }).getByRole("listitem").first();
    await first.getByRole("button", { name: /to a day$/ }).click();
    const saturday = sheet(page).getByRole("group", { name: "Quick days" }).getByRole("button", { name: /^Saturday 3 October/ });
    await expect(saturday).toBeVisible();
    const { transitions } = await themeChange(page, "cloudy", () => saturday.click(), ".sheet-root");
    expect(transitions).toBeLessThanOrEqual(2);
  });
});

test("AC 6 and 7: a rainy Sunday gets a Plan B that runs that day; Swap keeps the time; no duplicates", async ({ page }) => {
  await seed(page, "swf.plan.v2", plan({ "2026-10-04": { items: [{ id: "three-sisters", start: "09:00" }, { id: "bondi-coogee", start: "14:00" }] } }));
  await open(page, "/plan?d=2026-10-04");
  const panel = dayPanel(page);
  await panel.getByRole("group", { name: /Set the sky/ }).getByRole("button", { name: /Rainy/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-weather", "rainy");
  await expect(panel.getByText(/2 plans need a look/)).toBeVisible();
  const swaps = panel.getByRole("button", { name: /^Swap / });
  await expect(swaps).toHaveCount(2);
  const names = await swaps.evaluateAll((b) => b.map((x) => x.getAttribute("aria-label")!.match(/ for (.+), keeping/)![1]));
  expect(new Set(names).size).toBe(2);
  await swaps.first().click();
  const items = (await stored(page)).days["2026-10-04"].items as { id: string; start: string }[];
  const swapped = items.find((i) => i.start === "09:00")!;
  expect(swapped.id).not.toBe("three-sisters");
  const b = act(swapped.id);
  expect(b.weatherFit.rainy).toBe(2);
  expect(!b.days || b.days.includes("sun")).toBe(true);
});

test("AC 8: +30 min re-sorts, persists, shows in the share link and can be undone; overlaps are flagged", async ({ page, context }) => {
  await fakeClipboard(context);
  await seed(page, "swf.plan.v2", plan({ "2026-10-07": { items: [{ id: "agnsw", start: "10:00" }, { id: "chinatown", start: "10:30" }] } }));
  await open(page, "/plan?d=2026-10-07");
  const panel = dayPanel(page);
  await expect(panel.getByText(/^Overlaps with/)).toHaveCount(2);
  const agnsw = act("agnsw"), china = act("chinatown");
  await panel.getByRole("button", { name: `Start ${agnsw.name} 30 minutes later` }).click();
  await panel.getByRole("button", { name: `Start ${agnsw.name} 30 minutes later` }).click();
  await expect(page.getByRole("status")).toContainText("Moved to 11am");
  const order = await panel.getByRole("list", { name: /Plans for/ }).getByRole("heading", { level: 3 }).allTextContents();
  expect(order).toEqual([china.name, agnsw.name]);
  await page.reload();
  await expect(panel.getByRole("list", { name: /Plans for/ }).getByRole("heading", { level: 3 })).toHaveText([china.name, agnsw.name]);
  await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
  await panel.getByRole("button", { name: "Share this day" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const s = new URL(url).searchParams.get("s")!;
  expect(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()).toContain('["agnsw","11:00"]');
  await panel.getByRole("button", { name: `Start ${agnsw.name} 30 minutes earlier` }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  expect((await stored(page)).days["2026-10-07"].items.find((i: { id: string }) => i.id === "agnsw").start).toBe("11:00");
});

test("AC 9: Carriageworks can't be added on a Sunday; Change day or time keeps the time", async ({ page }) => {
  const c = act("carriageworks");
  await open(page, "/a/carriageworks");
  await idle(page);
  await page.getByRole("button", { name: `Add to a day: ${c.name}` }).click();
  const sun = sheet(page).getByRole("group", { name: "Quick days" }).getByRole("button", { name: /^Sunday 4 October/ });
  await expect(sun).toHaveAccessibleName(/not running/);
  await expect(sun).toContainText("Closed");
  await sun.click();
  await expect(sheet(page).getByRole("button", { name: "Not running on Sun 4 Oct" })).toBeDisabled();
  await page.keyboard.press("Escape");

  await seed(page, "swf.plan.v2", plan({ "2026-10-07": { items: [{ id: "agnsw", start: "10:30" }] } }));
  await open(page, "/plan?d=2026-10-07");
  await idle(page);
  await dayPanel(page).getByRole("button", { name: `Change day or time for ${act("agnsw").name}` }).click();
  // 7 Oct isn't a quick day, so Pick a date is already open.
  await sheet(page).getByRole("button", { name: /^Friday 9 October/ }).click();
  await sheet(page).getByRole("button", { name: "Move to Fri 9 Oct, 10:30am" }).click();
  const days = (await stored(page)).days;
  expect(days["2026-10-07"]).toBeUndefined();
  expect(days["2026-10-09"].items).toEqual([{ id: "agnsw", start: "10:30" }]);
});

test("AC 10: a shared day opens in a fresh browser and saves; a v1 weekend link still opens", async ({ page, browser }) => {
  const share = Buffer.from(JSON.stringify({ v: 2, d: { "2026-10-03": { s: "sunny", i: [["bondi-coogee", "08:30"], ["icebergs", "12:00"]] } } })).toString("base64url");
  const fresh = await browser.newContext();
  const p2 = await fresh.newPage();
  await p2.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
  await p2.goto(`/plan?s=${share}`);
  await expect(p2.getByText("Shared with you")).toBeVisible();
  await expect(p2.getByText("8:30am")).toBeVisible();
  await p2.getByRole("button", { name: "Save to my plans" }).click();
  const saved = await p2.evaluate(() => JSON.parse(localStorage.getItem("swf.plan.v2")!));
  expect(saved.days["2026-10-03"].items).toEqual([{ id: "bondi-coogee", start: "08:30" }, { id: "icebergs", start: "12:00" }]);
  expect(saved.days["2026-10-03"].sky).toBe("sunny");
  await fresh.close();

  const v1 = Buffer.from(JSON.stringify({ v: 1, w: "2026-10-03", sat: { f: "sunny", i: ["bondi-coogee"] }, sun: { f: "rainy", i: ["agnsw"] } })).toString("base64url");
  await page.goto(`/plan?s=${v1}`);
  await expect(page.getByText("2 days of plans")).toBeVisible();
});

test("AC 29: a saved v1 weekend plan is migrated with no plans lost", async ({ page }) => {
  await seed(page, "swf.plan.v1", { weekendOf: "2026-10-03", days: { sat: { forecast: "sunny", forecastSource: "manual", items: ["bondi-coogee", "icebergs"] }, sun: { forecast: "rainy", forecastSource: "manual", items: ["agnsw"] } }, updatedAt: "2026-09-30T00:00:00.000Z" });
  await open(page, "/plan");
  // My plans is client-only; on a busy run it can take a few seconds to render.
  await expect(dayPanel(page).getByRole("heading", { name: act("bondi-coogee").name })).toBeVisible({ timeout: 15000 });
  const s = await stored(page);
  expect(s.days["2026-10-03"].items.map((i: { id: string }) => i.id)).toEqual(["bondi-coogee", "icebergs"]);
  expect(s.days["2026-10-04"].items.map((i: { id: string }) => i.id)).toEqual(["agnsw"]);
  expect(await page.evaluate(() => localStorage.getItem("swf.plan.v1"))).toBeNull();
});

test("M8.4: sheets take focus, keep Tab inside, close on Escape and return focus", async ({ page }) => {
  await open(page, "/a/agnsw");
  await idle(page);
  const opener = page.getByRole("button", { name: /to a day/ });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Close" })).toBeFocused();
  for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});
