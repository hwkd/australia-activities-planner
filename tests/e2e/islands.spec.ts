import { idle, open, tab, themeChange } from "./helpers";
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

// With motion on in every engine (the WebKit and Firefox projects otherwise reduce motion), so the
// sky fade is running.
test.describe("sky changes with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  // Spec §3.5: a sky change switches the colours at once, fades only the sky and re-ranks the list in
  // place. The cards keep their elements (no entrance replay) and no element runs its own colour
  // transition: hundreds of those, plus every card replaying its entrance, made phones drop frames and
  // left text the same grey as the sky halfway through.
  test("a sky change re-ranks the same cards and starts no colour transitions", async ({ page }) => {
    await open(page, "/?w=sunny");
    await idle(page);
    const cards = page.locator('ol[aria-label="Ranked results"] > li');
    // Let the first entrance finish, then tag every card's element with its activity.
    await expect
      .poll(() =>
        page.evaluate(
          () => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "card-up").length,
        ),
      )
      .toBe(0);
    await cards.evaluateAll((lis) =>
      lis.forEach(
        (li) => ((li as HTMLElement & { kept?: string }).kept = li.querySelector("a")!.getAttribute("href")!),
      ),
    );
    const before = await cards.first().evaluate((li) => li.querySelector("a")!.getAttribute("href"));

    const { transitions } = await themeChange(page, "rainy", () => page.getByRole("button", { name: "Rainy" }).click());
    expect(transitions).toBeLessThanOrEqual(4); // the two sky segments' own press feedback at most
    await expect(title(page)).toContainText("rainy day");
    const after = await cards.evaluateAll((lis) =>
      lis.map((li) => ({
        href: li.querySelector("a")!.getAttribute("href"),
        kept: (li as HTMLElement & { kept?: string }).kept,
      })),
    );
    expect(
      after.filter((c) => c.kept !== c.href),
      "cards rebuilt",
    ).toEqual([]);
    expect(after[0].href, "the list re-ranked").not.toBe(before);
    const replays = await page.evaluate(
      () => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "card-up").length,
    );
    expect(replays, "card entrances replayed").toBe(0);
  });

  // Spec §3.5: theme-change motion is opacity and transform only (a blur on the headline word was
  // redrawn every frame on iPhones), and the sky fade is front-loaded: the colours switch at once, so a
  // slow-starting fade left the new text on the old sky.
  test("a sky change animates only opacity and transform, and the sky fade is front-loaded", async ({ page }) => {
    await open(page, "/?w=sunny");
    await idle(page);
    await page.getByRole("button", { name: "Rainy" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-weather", "rainy");
    const offending = await page.evaluate(() => {
      const meta = new Set(["offset", "computedOffset", "easing", "composite"]);
      const motion = new Set(["opacity", "transform"]);
      // Buttons may fade their own colours when their state changes (the tapped sky segments).
      const press = new Set(["background-color", "color", "border-color"]);
      const out: string[] = [];
      for (const a of document.getAnimations()) {
        const el = (a.effect as KeyframeEffect).target as Element;
        const props =
          a instanceof CSSTransition
            ? [a.transitionProperty]
            : (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !meta.has(p)));
        for (const p of props)
          if (!motion.has(p) && !(press.has(p) && el.matches(".press")))
            out.push(`${p} on ${el.tagName.toLowerCase()}.${el.classList[0] ?? ""}`);
      }
      return [...new Set(out)];
    });
    expect(offending).toEqual([]);
    const curve = await page.evaluate(() => getComputedStyle(document.querySelector(".sky")!).transitionTimingFunction);
    const [, y1] = (curve.match(/cubic-bezier\(([^)]+)\)/)?.[1] ?? "0,0").split(",").map(Number);
    expect(y1, `the sky fade (${curve}) does most of its change early`).toBeGreaterThanOrEqual(0.5);
  });

  test("a sky being faded out keeps moving until its own fade ends, even when switching twice", async ({ page }) => {
    await open(page, "/?w=rainy");
    await idle(page);
    // The loops start a while after load (`sky-live`); slow on a busy machine, and only a precondition.
    await expect(page.locator("html")).toHaveClass(/sky-live/, { timeout: 15_000 });
    const playing = (sel: string) =>
      page.evaluate((sel) => document.querySelector(sel)!.getAnimations()[0]?.playState, sel);
    const rain = ".sky-rainy .f1";
    const sunRays = ".sky-sunny .spin60";
    expect(await playing(rain)).toBe("running");
    // Rainy → Sunny → Hot within the fade, the second tap once Sunny shows (on a busy page its fade
    // can take a few frames to start; before that there's nothing on screen to keep moving). Each
    // outgoing sky is checked right after the tap that sends it away, while its fade surely runs.
    const [rainAfterSunny, raysAfterHot] = await page.evaluate(async () => {
      const seg = (n: string) =>
        [...document.querySelectorAll("button[aria-pressed]")].find((b) =>
          b.textContent?.trim().startsWith(n),
        ) as HTMLElement;
      const state = (sel: string) => document.querySelector(sel)!.getAnimations()[0]?.playState;
      seg("Sunny").click();
      const rain = state(".sky-rainy .f1");
      const sunny = document.querySelector(".sky-sunny")!;
      while (Number(getComputedStyle(sunny).opacity) < 0.2) await new Promise((r) => requestAnimationFrame(r));
      seg("30").click();
      return [rain, state(".sky-sunny .spin60")];
    });
    expect(rainAfterSunny, "rain still falling while it fades").toBe("running");
    expect(raysAfterHot, "sun rays still turning while they fade").toBe("running");
    await expect.poll(() => playing(rain)).toBe("paused");
    await expect.poll(() => playing(sunRays)).toBe("paused");
  });

  // The entrance starts with the server HTML; on a slow phone it ends before the island hydrates.
  test("cards whose entrance ended before hydration don't replay it on a re-rank", async ({ page }) => {
    let delayed = 0;
    await page.route(/\/_astro\/DiscoverExplorer\.[^/]+\.js$/, async (route) => {
      delayed++;
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await open(page, "/?w=sunny");
    await idle(page);
    expect(delayed, "the results island's script was held back").toBeGreaterThan(0);
    await page.getByRole("button", { name: "Rainy" }).click();
    await expect(title(page)).toContainText("rainy day");
    const replays = await page.evaluate(
      () => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "card-up").length,
    );
    expect(replays).toBe(0);
  });

  // Spec §3.5: the change never blocks input; a tap while the sky fades lands on the page.
  test("a tap during the sky fade still reaches the page", async ({ page }) => {
    await open(page, "/?w=sunny");
    await idle(page);
    // A long fade, so the tap lands during it however slow the engine is (the length isn't the point).
    await page.addStyleTag({ content: ".sky { transition-duration: 5s !important; }" });
    const date = page.getByRole("button", { name: "Date", exact: true });
    const box = (await date.boundingBox())!;
    const fading = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .some(
            (a) =>
              a instanceof CSSTransition && ((a.effect as KeyframeEffect).target as Element).classList.contains("sky"),
          ),
      );
    await page.getByRole("button", { name: "Rainy" }).click();
    // Tap the chip by position while the sky fades (a locator click could wait it out).
    await expect.poll(fading, { intervals: [10] }).toBe(true);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await fading(), "the tap landed mid-fade").toBe(true);
    await expect(date).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-weather", "rainy");
  });
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
