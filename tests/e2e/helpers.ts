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

/**
 * Runs `act`, waits for `data-weather` on `target` (the page, or a sheet with its own sky) to become
 * `to` and reports what the theme change set off one frame later. Only the sky scene fades; the
 * colours switch at once, so no other element should start a visible CSS transition (hundreds of those
 * made phones drop frames). Fails with a clear message if the sky never changes.
 */
export async function themeChange(page: Page, to: string, act: () => Promise<void>, target = "html") {
  await page.evaluate(
    ([to, target]) => {
      const el = document.querySelector<HTMLElement>(target)!;
      (window as unknown as { themed: Promise<number> }).themed = new Promise((done, fail) => {
        const timer = setTimeout(() => fail(new Error(`data-weather on ${target} never became "${to}"`)), 5000);
        const mo = new MutationObserver(() => {
          if (el.dataset.weather !== to) return;
          mo.disconnect();
          clearTimeout(timer);
          // Longer than 1 ms: under reduced motion every property change is a 1 ms transition (global.css).
          const visible = (a: Animation) =>
            a instanceof CSSTransition &&
            Number(a.effect?.getTiming().duration) > 1 &&
            !((a.effect as KeyframeEffect).target as Element).closest(".scene");
          requestAnimationFrame(() => done(document.getAnimations().filter(visible).length));
        });
        mo.observe(el, { attributes: true, attributeFilter: ["data-weather"] });
      });
    },
    [to, target] as const,
  );
  await act();
  return { transitions: await page.evaluate(() => (window as unknown as { themed: Promise<number> }).themed) };
}
