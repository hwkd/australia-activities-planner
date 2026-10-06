import { idle, open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

/**
 * The live forecast (spec §11.1, tracker M16): My plans and Add to a day only since D16. The forecast endpoint is answered with a fixed
 * forecast here, so the shared test database stays forecast-free for every other test.
 */
const FORECAST = {
  updatedAt: "2026-09-30T22:00:00.000Z",
  areas: {
    city: { "2026-10-01": { sky: "rainy", rain: 60 }, "2026-10-03": { sky: "sunny", rain: 10 }, "2026-10-04": { sky: "cloudy", rain: 30 } },
    "blue-mountains": { "2026-10-03": { sky: "rainy", rain: 85 } },
  },
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z")); // Thu 1 Oct, 10am in Sydney
  await page.route("**/data/forecast.json", (r) => r.fulfill({ json: FORECAST }));
});
const skyButton = (page: Page, name: string) => page.getByRole("group", { name: "Weather" }).getByRole("button", { name });

test("AC 35: Discover shows no forecast; it opens on Sunny, then on the last sky picked (D16)", async ({ page }) => {
  // Today's forecast says rainy, and it still reaches the page (Add to a day uses it), but Discover
  // doesn't follow it: the visitor sets the sky. The checks wait until the forecast has arrived.
  const forecast = page.waitForResponse("**/data/forecast.json");
  await open(page, "/");
  await forecast;
  await idle(page);
  await expect(skyButton(page, "Sunny")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("h1")).toHaveText(/^If it's\s*looking/); // no place in the headline
  await expect(page.getByText(/Forecast:|The forecast says/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use forecast" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Weather data: Open-Meteo" })).toHaveCount(0);

  // A sky that isn't today's forecast, so following the forecast and remembering the pick differ.
  await skyButton(page, "Cloudy").click();
  await expect(page.locator("html")).toHaveAttribute("data-weather", "cloudy");
  const again = page.waitForResponse("**/data/forecast.json");
  await open(page, "/");
  await again;
  await idle(page);
  await expect(skyButton(page, "Cloudy")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-weather", "cloudy");
});

test("My plans pre-sets forecast skies, never over the user's, and flags a change that needs a Plan B", async ({ page }) => {
  await page.goto("/404");
  // The Three Sisters (Blue Mountains, Skip when rainy) was planned when Saturday's auto sky was sunny.
  await page.evaluate(() =>
    localStorage.setItem(
      "swf.plan.v2",
      JSON.stringify({
        v: 2,
        updatedAt: "2026-09-29T00:00:00.000Z",
        days: {
          "2026-10-03": { sky: "sunny", skySource: "auto", items: [{ id: "three-sisters", start: "10:00" }] },
          "2026-10-04": { sky: "hot", skySource: "manual", items: [] },
        },
      })
    )
  );
  await open(page, "/plan?d=2026-10-03");
  await idle(page);
  const banner = page.getByRole("status", { name: "Forecast changes" });
  await expect(banner).toContainText("This Saturday now looks rainy. 1 activity needs a Plan B.");
  const day = page.locator('section[aria-labelledby="cal-day"]');
  await expect(day.getByRole("group", { name: /sky/i }).getByRole("button", { name: "Rainy" })).toHaveAttribute("aria-pressed", "true");
  await expect(day).toContainText("Forecast for the Blue Mountains: rainy, 85% chance of rain");

  // Sunday's sky was the user's own: kept, with the forecast offered.
  await page.getByRole("button", { name: /^Sunday 4 October/ }).click();
  await expect(day.getByRole("button", { name: "30°+" })).toHaveAttribute("aria-pressed", "true");
  await expect(day).toContainText("The forecast says cloudy (30% chance of rain).");
  await day.getByRole("button", { name: "Use forecast" }).click();
  await expect(day.getByRole("button", { name: "Cloudy" })).toHaveAttribute("aria-pressed", "true");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("swf.plan.v2")!).days["2026-10-04"]);
  expect(stored).toMatchObject({ sky: "cloudy", skySource: "auto" });

  await banner.getByRole("button", { name: "Dismiss" }).click();
  await expect(banner).toHaveCount(0);
});
