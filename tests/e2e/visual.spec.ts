import { open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

const WEATHERS = ["sunny", "cloudy", "rainy", "hot"] as const;

/** Font metrics of every visible text element, keyed by its DOM path and text. */
async function typography(page: Page) {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    const path = (el: Element) => {
      const parts: string[] = [];
      for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) parts.unshift(`${e.tagName}${[...(e.parentElement?.children ?? [])].indexOf(e)}`);
      return parts.join(">");
    };
    for (const el of document.querySelectorAll("h1,h2,h3,p,a,button,li,dt,dd,span,legend,label")) {
      // Selection is shown with weight on purpose (spec §3.1: the chosen sky's label turns bold); that's
      // UI state, not the weather changing typography.
      if (el.closest('[aria-pressed], ul[aria-label="Fit for each sky"]')) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join(" ").trim();
      if (!own) continue;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const s = getComputedStyle(el);
      out[`${path(el)}|${own}`] = [s.fontFamily, s.fontSize, s.fontWeight, s.fontVariationSettings, s.fontStretch, s.letterSpacing, s.lineHeight, Math.round(r.width)].join(" ; ");
    }
    return out;
  });
}

// AC 23: switching between all four weathers never changes any text's font, size, width, weight or
// letter spacing. Compared for every text element present in all four skies.
for (const path of ["/", "/a/bondi-coogee"]) {
  test(`AC 23: typography doesn't change with the weather on ${path}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    const runs: Record<string, string>[] = [];
    for (const w of WEATHERS) {
      await open(page, `${path}?w=${w}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300); // the results re-render once after hydration
      runs.push(await typography(page));
    }
    const common = Object.keys(runs[0]).filter((k) => runs.every((r) => k in r));
    expect(common.length).toBeGreaterThan(40);
    const diffs = common.filter((k) => runs.some((r) => r[k] !== runs[0][k])).map((k) => `${k.split("|")[1]}: ${runs.map((r) => r[k]).join("  vs  ")}`);
    expect(diffs).toEqual([]);
  });
}

// M10.5: pixel baselines for Discover, an activity and My plans in four skies, phone and desktop.
// Opt-in (VISUAL=1), because baselines are per platform: `VISUAL=1 npx playwright test visual --update-snapshots`.
test.describe("visual regression", () => {
  test.skip(!process.env.VISUAL, "set VISUAL=1 to compare screenshots");
  for (const w of WEATHERS)
    for (const [label, path] of [["discover", "/"], ["activity", "/a/bondi-coogee"], ["plans", "/plan?d=2026-10-03"]] as const) {
      test(`${label} · ${w}`, async ({ page }) => {
        await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/404");
        await page.evaluate((weather) => {
          localStorage.setItem("swf.weather", weather);
          localStorage.setItem("swf.plan.v2", JSON.stringify({ v: 2, updatedAt: "x", days: { "2026-10-03": { skySource: "manual", sky: weather, items: [{ id: "agnsw", start: "10:00" }, { id: "chinatown", start: "18:00" }] } } }));
        }, w);
        await open(page, path.startsWith("/plan") ? path : `${path}?w=${w}`);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        // The real map (WebGL tiles) isn't pixel-stable, so it's masked; the rest of the page is compared.
        await expect(page).toHaveScreenshot(`${label}-${w}.png`, { animations: "disabled", maxDiffPixelRatio: 0.01, mask: [page.locator(".map-view")] });
      });
    }
});
