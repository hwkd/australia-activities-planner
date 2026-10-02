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

// Discover's results (A · Sky Mode): one column of cards on phones and narrow desktops, tiles on
// tablets and desktops, two columns at the artboard's 1440 px and more on wider screens.
test("Discover's result columns follow the width", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project is enough for the width sweep");
  const expected: [number, number][] = [
    [390, 1],
    [820, 2],
    [1024, 1],
    [1280, 2],
    [1440, 2],
    [1920, 3],
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
