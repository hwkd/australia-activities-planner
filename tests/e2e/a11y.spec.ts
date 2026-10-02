import { idle, open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * M10.6: axe (WCAG 2.2 A and AA rules) on every screen, in a light and a dark sky. Colour contrast
 * over the animated, translucent sky is covered by the theme contrast test (AC 12) instead, because
 * axe can't see through backdrop blur. An activity map's small numbered pins are exempt from target
 * size: the full-size list of the same places sits under the map (WCAG 2.5.8's equivalent exception).
 */
async function scan(page: Page, what: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).disableRules(["color-contrast"]).analyze();
  const pinOnly = (v: (typeof r.violations)[number]) => v.id === "target-size" && v.nodes.every((n) => n.html.includes("map-pin--sm"));
  const found = r.violations.filter((v) => !pinOnly(v)).map((v) => `${what}: ${v.id} (${v.impact}) ${v.nodes.length}× e.g. ${v.nodes[0].target.join(" ")} — ${v.help}`);
  expect(found).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const w of ["sunny", "cloudy"]) {
  test(`axe: Discover, activity and My plans (${w})`, async ({ page }) => {
    await open(page, `/?w=${w}`);
    await scan(page, "Discover");
    await open(page, `/a/royal-np?w=${w}`);
    for (const id of ["h-wx", "h-map", "h-go", "h-cost"]) await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
    await scan(page, "Activity");
    await page.goto("/404");
    await page.evaluate(() => localStorage.setItem("swf.plan.v2", JSON.stringify({ v: 2, updatedAt: "x", days: { "2026-10-04": { skySource: "manual", sky: "rainy", items: [{ id: "three-sisters", start: "09:00" }, { id: "agnsw", start: "09:30" }] } } })));
    await open(page, "/plan?d=2026-10-04");
    await scan(page, "My plans");
  });
}

test("axe: Add to a day and Add to your calendar sheets", async ({ page }) => {
  await open(page, "/a/agnsw");
  await idle(page);
  await page.getByRole("button", { name: /to a day/ }).click();
  await page.getByRole("dialog").getByText("Pick a date").click();
  await scan(page, "Add to a day");
  await page.getByRole("dialog").getByRole("button", { name: /^Add to / }).click();
  await scan(page, "Added");
  await page.getByRole("button", { name: "Add to my calendar too" }).click();
  await expect(page.getByText(/Preview · 1 event/)).toBeVisible();
  await scan(page, "Add to your calendar");
});
