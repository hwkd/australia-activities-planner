import { open, tab } from "./helpers";
import { expect, test } from "@playwright/test";

const title = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 2 }).first();

// M0.10: separate islands share state through nanostores, and the theme follows.
test("Set the sky re-themes the page and re-ranks the results island", async ({ page }) => {
  await open(page, "/");
  await expect(title(page)).toContainText("sunny day");
  await page.getByRole("button", { name: "Rainy" }).click();
  await expect(title(page)).toContainText("rainy day");
  await expect(page.locator("html")).toHaveAttribute("data-weather", "rainy");
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('astro-island[client="load"][ssr]'));
  await expect(page.locator("html")).toHaveAttribute("data-weather", "rainy");
});

test("blocked storage doesn't break the page", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const page = await context.newPage();
  await open(page, "/");
  await page.getByRole("button", { name: "30°+" }).click();
  await expect(title(page)).toContainText("hot day");
  await context.close();
});

// AC 24: each segment is a button with aria-pressed, reachable by keyboard, and only the selected one is filled.
test("Set the sky: aria-pressed, keyboard, one filled segment", async ({ page }) => {
  await open(page, "/");
  const group = page.getByRole("group", { name: "Weather" });
  const buttons = group.getByRole("button");
  await expect(buttons).toHaveCount(4);
  await expect(group.getByRole("button", { name: "Sunny" })).toHaveAttribute("aria-pressed", "true");
  await group.getByRole("button", { name: "Sunny" }).focus();
  await tab(page);
  await expect(group.getByRole("button", { name: "Cloudy" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-weather", "cloudy");
  const filled = await buttons.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage !== "none"));
  expect(filled).toEqual([false, true, false, false]);
  await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
});

test("a weather in the URL wins over the saved one, with no hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await open(page, "/");
  await page.getByRole("button", { name: "Rainy" }).click();
  await open(page, "/?w=hot");
  await expect(title(page)).toContainText("hot day");
  await expect(page.locator("html")).toHaveAttribute("data-weather", "hot");
  // The server-rendered strip says Sunny; after hydration it must show the real sky.
  await expect(page.getByRole("button", { name: "30°+" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Sunny" })).toHaveAttribute("aria-pressed", "false");
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});
