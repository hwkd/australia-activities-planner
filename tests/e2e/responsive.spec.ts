import { expect, test } from "@playwright/test";

// M8.5: no horizontal scroll at any width from 360 to 2560 px.
const WIDTHS = [360, 390, 600, 768, 1023, 1024, 1280, 1440, 1920, 2560];
const PAGES = ["/?w=sunny", "/a/bondi-coogee", "/a/royal-np", "/plan"];

test.describe.configure({ mode: "parallel" });
for (const path of PAGES) {
  test(`no horizontal scroll: ${path}`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough for the width sweep");
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForFunction(() => !document.querySelector('astro-island[client="load"][ssr]'));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}

// Discover's results (A · Sky Mode): one column of cards on phones, tiles on tablets and desktops,
// three columns at the artboard's 1440 px (no Coming up rail since 3 Oct 2026) and more on wider screens.
test("Discover's result columns follow the width", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project is enough for the width sweep");
  const expected: [number, number][] = [
    [390, 1],
    [820, 2],
    [1024, 2],
    [1280, 3],
    [1440, 3],
    [1920, 4],
  ];
  for (const [width, cols] of expected) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?w=sunny");
    await page.waitForFunction(() => !document.querySelector('astro-island[client="load"][ssr]'));
    const got = await page.evaluate(() => {
      const items = [...document.querySelectorAll('ol[aria-label="Ranked results"] > li')].slice(0, 4);
      return new Set(items.map((li) => Math.round(li.getBoundingClientRect().top))).size === 1
        ? items.length
        : new Set(items.map((li) => Math.round(li.getBoundingClientRect().left))).size;
    });
    expect(got, `columns at ${width}px`).toBe(cols);
  }
});

// The Discover | My plans switch keeps to the page's right edge, also once the page stops growing
// (Discover at 1760 px, My plans at 1400 px).
test("the desktop switch lines up with the content's right edge", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project is enough for the width sweep");
  const pages: [string, string][] = [
    ["/?w=sunny", 'ol[aria-label="Ranked results"]'],
    ["/plan?d=2026-10-04", 'section[aria-labelledby="cal-day"]'],
  ];
  // One load per page, then resize in place (each load also warms the offline copies, which is heavy).
  for (const [path, content] of pages) {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(path);
    await page.locator(content).waitFor();
    for (const width of [1024, 1280, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      const [nav, edge] = await page.evaluate((sel) => {
        // Settle the cards' entrance animation (it scales them a little).
        document.getAnimations().forEach((a) => a.effect?.getTiming().iterations !== Infinity && a.finish());
        return [document.querySelector(".tabbar")!, document.querySelector(sel)!].map((e) => Math.round(e.getBoundingClientRect().right));
      }, content);
      expect(nav, `${path} at ${width}px`).toBe(edge);
    }
  }
});
