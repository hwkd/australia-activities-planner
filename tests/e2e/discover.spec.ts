import { idle, open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

/** The content the build used, to check the page against (fit, groups). */
const acts = readdirSync("db/seed/activities").map(
  (f) =>
    JSON.parse(readFileSync(`db/seed/activities/${f}`, "utf8")) as {
      name: string;
      weatherFit: Record<string, number>;
      goodFor: string[];
      seasonal?: unknown;
    },
);
const byName = new Map(acts.map((a) => [a.name, a]));
const names = (page: Page) =>
  page.getByRole("list", { name: "Ranked results" }).getByRole("heading", { level: 3 }).allTextContents();
const title = (page: Page) => page.getByRole("heading", { level: 2 }).first();

test("AC 1: Rainy hides every activity whose rainy fit is 0, and says how many", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("button", { name: "Rainy" }).click();
  const zero = acts.filter((a) => a.weatherFit.rainy === 0 && !a.seasonal).length;
  await expect(page.getByText(`${zero} more are better saved for another day`)).toBeVisible();
  const shown = await names(page);
  expect(shown.length).toBe(acts.length - zero);
  for (const n of shown) expect(byName.get(n)?.weatherFit.rainy, n).toBeGreaterThan(0);
  await expect(title(page)).toHaveText(`${shown.length} ideas for a rainy day`);
});

test("AC 2: filters update the list and the URL at once; reloading restores the view", async ({
  page,
  browserName,
}) => {
  await open(page, "/");
  // Measured inside the page: click → URL and list updated, and → the next frame painted.
  const { update, frame } = await page.evaluate(async () => {
    const btn = (label: string) =>
      [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)!;
    const title = () => document.querySelector("main h2")?.textContent;
    const update: number[] = [],
      frame: number[] = [];
    for (const label of ["Cloudy", "Friends", "Free only", "Half day"]) {
      const before = [location.search, title()].join();
      const t0 = performance.now();
      btn(label).click();
      await new Promise<void>((r) => {
        const check = () => ([location.search, title()].join() !== before ? r() : setTimeout(check, 0));
        check();
      });
      update.push(performance.now() - t0);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      frame.push(performance.now() - t0);
      // Let the previous change finish painting, so each click is measured on its own.
      await new Promise((r) => setTimeout(r, 250));
    }
    return { update: Math.max(...update), frame: Math.max(...frame) };
  });
  // Headless Firefox and WebKit paint without a GPU (70–200 ms a frame here, and the URL effect runs
  // after paint), so the timing is checked in Chromium; the other engines check the behaviour, and
  // Safari's timing is part of the device checks (M3.8).
  if (browserName === "chromium") {
    expect(update).toBeLessThan(100);
    expect(frame).toBeLessThan(100);
  }
  await expect(page).toHaveURL(/\?w=cloudy&g=friends&free=1&d=half$/);
  const before = await names(page);
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('astro-island[client="load"][ssr]'));
  await expect(page.getByRole("button", { name: "Friends", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Free only" })).toHaveAttribute("aria-pressed", "true");
  expect(await names(page)).toEqual(before);
});

test("AC 2: last-used filters come back when the app opens with no query string", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("button", { name: "Solo" }).click();
  await open(page, "/");
  await expect(page.getByRole("button", { name: "Solo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/g=solo/);
});

test("AC 3: Family shows only activities good for families", async ({ page }) => {
  await open(page, "/?w=sunny&g=family");
  await expect(page.getByRole("button", { name: "Family" })).toHaveAttribute("aria-pressed", "true");
  // The filters and the results are separate islands; wait for the list to catch up.
  await expect.poll(async () => (await names(page)).every((n) => byName.get(n)?.goodFor.includes("family"))).toBe(true);
  const shown = await names(page);
  expect(shown.length).toBeGreaterThan(0);
  for (const n of shown) expect(byName.get(n)?.goodFor, n).toContain("family");
});

test("empty state resets the filters", async ({ page }) => {
  await open(page, "/?w=rainy&g=date&free=1&d=full");
  await expect(page.getByRole("button", { name: "Full day" })).toHaveAttribute("aria-pressed", "true");
  const empty = page.getByText("Nothing fits those filters yet.");
  if (await empty.isVisible()) {
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page).toHaveURL(/\?w=rainy$/);
    expect((await names(page)).length).toBeGreaterThan(0);
  }
});

test("a card opens its activity page; Add opens Add to a day", async ({ page }) => {
  await open(page, "/");
  await idle(page);
  const first = page.getByRole("list", { name: "Ranked results" }).getByRole("listitem").first();
  const name = (await first.getByRole("heading", { level: 3 }).textContent())!.trim();
  await first.getByRole("button", { name: `Add ${name} to a day` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/(\?.*)?$/); // still on Discover
  await expect(first.getByRole("link", { name })).toHaveAttribute("href", /^\/a\//);
});

test("Surprise me picks a Perfect idea for the sky, never the last three again, and adds it to a day", async ({
  page,
}) => {
  await open(page, "/?w=rainy");
  await page.getByRole("button", { name: "Surprise me" }).click();
  const pick = page.locator('section[aria-labelledby="surprise-title"]');
  await expect(pick).toBeFocused();
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const name = (await pick.getByRole("heading", { level: 3 }).textContent())!.trim();
    expect(byName.get(name)?.weatherFit.rainy).toBe(2);
    expect(seen).not.toContain(name);
    seen.push(name);
    if (i < 2) await pick.getByRole("button", { name: "Another one" }).click();
  }
  await pick.getByRole("button", { name: "Add to a day" }).click();
  await expect(page.getByRole("dialog")).toContainText(seen[2]);
  await page.keyboard.press("Escape");
  await pick.getByRole("button", { name: "Close the surprise pick" }).click();
  await expect(pick).toHaveCount(0);
});

// A · Sky Mode — Desktop: no top bar; the Coming up rail shows each planned day in its own sky, with
// its sky picker, its plans and Open My plans, and a plan can be removed there (with Undo).
test("desktop Coming up rail: days in their own sky, remove with undo, no top bar", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("desktop"), "the rail is desktop-only");
  await page.clock.setFixedTime(new Date("2026-10-02T01:00:00Z"));
  await page.addInitScript(() => {
    localStorage.setItem(
      "swf.plan.v2",
      JSON.stringify({
        v: 2,
        updatedAt: new Date().toISOString(),
        days: {
          "2026-10-03": { sky: "sunny", skySource: "auto", items: [{ id: "bondi-coogee", start: "09:00" }] },
          "2026-10-04": { sky: "rainy", skySource: "manual", items: [{ id: "three-sisters", start: "10:00" }] },
        },
      }),
    );
  });
  await page.goto("/?w=sunny");
  const rail = page.getByRole("complementary", { name: "Coming up" });
  await expect(rail.getByRole("link", { name: "Open My plans" })).toHaveAttribute("href", "/plan");
  await expect(page.getByRole("navigation", { name: /main/i })).toBeHidden();
  await expect(rail.getByText("2 activities. Each day reads its own forecast.")).toBeVisible();
  const sat = rail.getByRole("region", { name: "Tomorrow, Sat 3 Oct" });
  await expect(sat).toHaveAttribute("data-weather", "sunny");
  await expect(sat.getByText("Sat 3 Oct · Sunny forecast")).toBeVisible();
  const sun = rail.getByRole("region", { name: "Sunday, Sun 4 Oct" });
  await expect(sun.getByText("Sun 4 Oct · Rainy, your pick")).toBeVisible();
  await expect(sun.getByRole("button", { name: "Rainy" })).toHaveAttribute("aria-pressed", "true");
  await sat.getByRole("button", { name: "Remove Bondi to Coogee Coastal Walk from Sat 3 Oct" }).click();
  await expect(rail.getByText("1 activity. Each day reads its own forecast.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(rail.getByText("2 activities. Each day reads its own forecast.")).toBeVisible();
});
