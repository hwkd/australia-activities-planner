import { open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

/**
 * The map view (spec §11.2, tracker M17). Needs the Sydney tiles uploaded to the test R2
 * (.map-data/, see scripts/map/); skipped when they aren't, e.g. in CI.
 */
test.beforeEach(async ({ page }, info) => {
  // Software-rendered WebGL is heavy: four engines at once starve the rest of the suite. The map
  // runs on Chromium (phone and desktop) here; Safari and Firefox are checked on devices.
  test.skip(!["phone", "desktop"].includes(info.project.name), "map tests run on the Chromium projects");
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
});
async function needsTiles(page: Page) {
  const res = await page.request.get("/map/sydney.pmtiles", { headers: { Range: "bytes=0-126" } });
  test.skip(res.status() !== 206, "no map tiles in the test R2 (.map-data/ missing)");
}
/** The map, or the no-WebGL message (some headless engines have no WebGL). */
async function mapOrFallback(page: Page, name: string | RegExp) {
  const map = page.getByRole("region", { name });
  const fallback = page.getByText("The map can't be shown on this device.");
  await expect(map.or(fallback)).toBeVisible({ timeout: 15000 });
  return (await map.count()) > 0;
}

test("Discover's Map shows the ranked results as labelled pins; a pin shows its card", async ({ page }) => {
  await needsTiles(page);
  await open(page, "/?w=sunny");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Map", exact: true })).toHaveAttribute("aria-pressed", "true");
  if (!(await mapOrFallback(page, /^Map of \d+ ideas for a sunny day$/))) return;
  // MapLibre's stylesheet comes with the map code (not a render-blocking link on every page), once,
  // and styles the map. (That it loads before the map is created is the module's top-level await.)
  await expect(page.locator("link[data-maplibre-css]")).toHaveCount(1);
  expect(await page.locator(".maplibregl-canvas").evaluate((c) => getComputedStyle(c).position)).toBe("absolute");
  const pin = page.getByRole("button", { name: /^Balmoral Beach: Perfect when sunny$/ });
  await expect(pin).toHaveText("Perfect");
  // By keyboard (pins are real buttons); MapLibre keeps nudging pins while tiles load, so a pointer
  // click would wait for them to settle.
  await pin.focus();
  await page.keyboard.press("Enter");
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 3, name: "Balmoral Beach" })).toBeVisible();
  // Tiles and fonts come from our own R2, through /map/.
  const tile = await page.request.get("/map/sydney.pmtiles", { headers: { Range: "bytes=0-126" } });
  expect(tile.headers()["content-range"]).toMatch(/^bytes 0-126\/\d+$/);
  expect((await page.request.get("/map/fonts/Noto%20Sans%20Regular/0-255.pbf")).status()).toBe(200);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("list", { name: "Ranked results" })).toBeVisible();
});

test("My plans maps the selected day's plans, numbered in time order", async ({ page }) => {
  await needsTiles(page);
  await page.goto("/404");
  await page.evaluate(() =>
    localStorage.setItem(
      "swf.plan.v2",
      JSON.stringify({ v: 2, updatedAt: "x", days: { "2026-10-03": { skySource: "manual", items: [{ id: "agnsw", start: "13:00" }, { id: "bondi-coogee", start: "09:00" }] } } })
    )
  );
  await open(page, "/plan?d=2026-10-03");
  await page.getByRole("button", { name: "Show this day on a map" }).click();
  if (!(await mapOrFallback(page, "Map of the plans for Saturday 3 October"))) return;
  await expect(page.getByRole("button", { name: /^1\. Bondi to Coogee Coastal Walk, 9am$/ })).toHaveText("1");
  await expect(page.getByRole("button", { name: /^2\. Art Gallery of NSW, 1pm$/ })).toHaveText("2");
});

test("Bondi to Coogee: the real map's numbered pins match the list both ways, and the source is credited", async ({ page }) => {
  await needsTiles(page);
  await open(page, "/a/bondi-coogee");
  await page.locator("#h-map").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('astro-island[component-url*="RouteMap"][ssr]'));
  if (!(await mapOrFallback(page, "Bondi to Coogee Coastal Walk: map of the places, the walk and the trip from the city"))) return;
  const map = page.getByRole("region", { name: /map of the places/ });
  await expect(map.getByRole("button", { name: /^\d\. / })).toHaveCount(8);
  // A pin selects the place in the list and shows its note…
  const bronte = map.getByRole("button", { name: "4. Bronte Beach & Baths" });
  await bronte.focus();
  await page.keyboard.press("Enter");
  await expect(bronte).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list").getByRole("button", { name: /Bronte Beach & Baths/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Free ocean baths, park, toilets and cafés.")).toBeVisible();
  // …and the list selects the pin.
  await page.getByRole("list").getByRole("button", { name: /Coogee Beach/ }).click();
  await expect(map.getByRole("button", { name: "8. Coogee Beach" })).toHaveAttribute("aria-pressed", "true");
  await expect(bronte).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(/^Map © OpenStreetMap contributors\. Places and lines: .+; (checked \d+ \w+ \d{4}|not yet checked)\.$/)).toBeVisible();
  // There's no schematic map any more (D15).
  await expect(page.getByRole("button", { name: "Schematic" })).toHaveCount(0);
});

test("without the map, an activity page still has its list, notes and directions", async ({ page }) => {
  // MapLibre's code fails to load (as it would offline before it was cached): the card says so.
  await page.route(/\/_astro\/MapView[^/]*\.js$/, (r) => r.abort());
  await open(page, "/a/bondi-coogee");
  await page.locator("#h-map").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('astro-island[component-url*="RouteMap"][ssr]'));
  await expect(page.getByText("The map can't be shown on this device. Everything on it is in the list.")).toBeVisible({ timeout: 15000 });
  await page.getByRole("list").getByRole("button", { name: /Clovelly Beach/ }).click();
  await expect(page.getByText("Calm, sheltered inlet. Good for a snorkel.")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Directions from where you are/ })).toBeVisible();
});
