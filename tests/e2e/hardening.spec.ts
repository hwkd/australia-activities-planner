import { fakeClipboard, idle, open } from "./helpers";
import { expect, test } from "@playwright/test";

test("AC 14: after the first visit, the app and the saved plan load with no network", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Playwright's WebKit can't emulate offline under a service worker; Safari is checked on a device (M10.6)");
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
  await open(page, "/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // An activity opened once (online, with the service worker in control) is cached for offline use.
  await page.reload();
  await open(page, "/a/bondi-coogee");
  await open(page, "/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.evaluate(() =>
    localStorage.setItem("swf.plan.v2", JSON.stringify({ v: 2, updatedAt: "x", days: { "2026-10-03": { skySource: "manual", items: [{ id: "agnsw", start: "10:00" }] } } }))
  );
  // Let the service worker finish precaching.
  await page.waitForFunction(async () => (await caches.keys()).some((k) => k.includes("precache")) && (await (await caches.open((await caches.keys()).find((k) => k.includes("precache"))!)).keys()).length > 10, null, { timeout: 20000 });
  await context.setOffline(true);
  await page.goto("/plan?d=2026-10-03");
  await expect(page.getByRole("heading", { name: "Art Gallery of NSW" })).toBeVisible();
  await page.goto("/?w=rainy");
  await expect(page.getByRole("heading", { level: 2 }).first()).toContainText("rainy day");
  await page.goto("/a/bondi-coogee");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bondi to Coogee Coastal Walk");
  await context.setOffline(false);
});

test("AC 33: after one visit to Discover, every published activity page opens offline", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Playwright's WebKit can't emulate offline under a service worker; Safari is checked on a device (M10.6)");
  test.setTimeout(90_000);
  await open(page, "/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The pages are fetched in the background, 10 s after load, once the service worker is ready.
  await page.reload();
  await page.waitForFunction(() => Number(document.documentElement.dataset.offlineWarm) > 20, null, { timeout: 60000 });
  const ids = Object.keys(await (await page.request.get("/data/export.json")).json());
  await context.setOffline(true);
  for (const id of ["three-sisters", "royal-np", ids[ids.length - 1]]) {
    await page.goto(`/a/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Couldn't load right now");
  }
  await context.setOffline(false);
});

test("AC 13: with localStorage blocked the app works for the whole session", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "/");
  await idle(page);
  await page.getByRole("button", { name: "Rainy" }).click();
  const first = page.getByRole("list", { name: "Ranked results" }).getByRole("listitem").first();
  const name = (await first.getByRole("heading", { level: 3 }).textContent())!.trim();
  await first.getByRole("button", { name: `Add ${name} to a day` }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Add to / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  // Another page in the same session still has the plan and the weather.
  await open(page, "/plan?d=2026-10-01");
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-weather", /.+/);
  expect(errors).toEqual([]);
  await context.close();
});

test("AC 13: with all storage blocked nothing breaks", async ({ browser, browserName }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    for (const k of ["localStorage", "sessionStorage"]) Object.defineProperty(window, k, { get() { throw new Error("blocked"); } });
  });
  const page = await context.newPage();
  const errors: string[] = [];
  // Playwright's WebKit reports requests cut off by the next navigation (the forecast, sw.js) as page
  // errors; they aren't the app's.
  const cutOff = /due to access control checks|load failed/;
  page.on("pageerror", (e) => (browserName === "webkit" && cutOff.test(e.message) ? null : errors.push(e.message)));
  for (const path of ["/", "/a/agnsw", "/plan"]) await open(page, path);
  await idle(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  expect(errors).toEqual([]);
  await context.close();
});

test("M10.3: every analytics event in spec §7 fires with the right properties", async ({ page, context }) => {
  test.setTimeout(60_000); // a long walk through every screen; slower in Firefox on a busy run
  await fakeClipboard(context);
  await context.addInitScript(() => {
    const w = window as unknown as { plausible: unknown; __events: unknown[] };
    w.__events = JSON.parse(sessionStorage.getItem("__events") ?? "[]");
    w.plausible = (name: string, opts?: { props?: unknown }) => {
      w.__events.push([name, opts?.props ?? {}]);
      sessionStorage.setItem("__events", JSON.stringify(w.__events));
    };
  });
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
  await open(page, "/");
  await idle(page);
  await page.getByRole("button", { name: "Family" }).click();
  const first = page.getByRole("list", { name: "Ranked results" }).getByRole("listitem").first();
  const name = (await first.getByRole("heading", { level: 3 }).textContent())!.trim();
  await first.getByRole("button", { name: `Add ${name} to a day` }).click();
  await page.getByRole("dialog").getByRole("group", { name: "Quick days" }).getByRole("button", { name: /^Saturday 3 October/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Add to Sat 3 Oct/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  await open(page, "/a/three-sisters");
  await open(page, "/plan?d=2026-10-03");
  await idle(page);
  const panel = page.locator('section[aria-labelledby="cal-day"]');
  await panel.getByRole("button", { name: /30 minutes later/ }).first().click();
  await panel.getByRole("group", { name: /Set the sky/ }).getByRole("button", { name: /Rainy/ }).click();
  const swap = panel.getByRole("button", { name: /^Swap / });
  if (await swap.count()) await swap.first().click();
  await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
  await panel.getByRole("button", { name: "Share this day" }).click();
  await page.getByRole("button", { name: "Add Sat 3 Oct to my calendar" }).click();
  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download calendar file" }).click()]);
  const events = (await page.evaluate(() => (window as unknown as { __events: [string, Record<string, string>][] }).__events)) as [string, Record<string, string>][];
  const has = (n: string, props: Record<string, string>) => expect(events, n).toContainEqual([n, props]);
  has("filter_change", { filter: "group", value: "family" });
  has("plan_add", { source: "card", dayType: "weekend" });
  has("activity_view", { id: "three-sisters" });
  has("plan_change", { kind: "time" });
  has("plan_share", { scope: "day" });
  has("calendar_export", { target: "ics", scope: "day" });
  if (events.some(([n]) => n === "plan_b_swap")) has("plan_b_swap", {});
});

test("AC 11: weather re-themes at once; with reduced motion nothing loops and the change is instant", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await open(page, "/?w=sunny");
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  // 1 ms animations under reduced motion; polled, because a busy headless WebKit can take a while to
  // tick (on a shared CI runner, hundreds were still running after 3 s).
  await expect.poll(running, { timeout: 10_000 }).toBe(0);
  const ms = await page.evaluate(async () => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent === "Rainy")!;
    const t0 = performance.now();
    b.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    const sky = getComputedStyle(document.querySelector(".sky-rainy")!).opacity;
    return { ms: performance.now() - t0, sky, theme: document.documentElement.dataset.weather };
  });
  expect(ms.theme).toBe("rainy");
  expect(ms.sky).toBe("1");
  expect(ms.ms).toBeLessThan(1200);
  await expect.poll(running, { timeout: 3000 }).toBe(0);
  await ctx.close();
});

test("M10.4: reduced transparency makes glass solid", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Chromium-only media emulation");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await open(page, "/?w=sunny");
  const glass = await page.locator(".glass").first().evaluate((el) => ({ bf: getComputedStyle(el).backdropFilter, bg: getComputedStyle(el).backgroundColor }));
  expect(glass.bf).toBe("none");
  expect(glass.bg).toBe("rgba(8, 24, 80, 0.76)");
});
