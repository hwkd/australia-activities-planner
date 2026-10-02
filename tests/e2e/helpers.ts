import type { BrowserContext, Page } from "@playwright/test";

/** Waits until every `client:load` island has hydrated (Astro drops the `ssr` attribute then), so clicks aren't lost. */
export async function ready(page: Page) {
  await page.waitForFunction(() => !document.querySelector('astro-island[client="load"][ssr]'));
}

/** goto + wait for islands. */
export async function open(page: Page, url: string) {
  await page.goto(url);
  await ready(page);
}

/** Also waits for `client:idle` islands (the activity page's Add to a day, the sheet host). */
export async function idle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('astro-island[client="idle"][ssr]'));
}

/**
 * Tab to the next control. WebKit on macOS, like Safari's default setting, skips buttons on Tab, so
 * this uses Option+Tab there, which is how Safari keyboard users reach every control.
 */
export async function tab(page: Page) {
  await page.keyboard.press(page.context().browser()?.browserType().name() === "webkit" ? "Alt+Tab" : "Tab");
}

/**
 * A clipboard that works in every engine (only Chromium lets tests grant clipboard permissions): the
 * app's `navigator.clipboard.writeText` calls are kept, and `readText` returns the last one.
 */
export async function fakeClipboard(context: BrowserContext) {
  await context.addInitScript(() => {
    let text = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t: string) => void (text = t), readText: async () => text },
    });
  });
}
