import { fakeClipboard, idle, open } from "./helpers";
import { eventFields } from "../../src/lib/analytics";
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
  // The list re-ranks a frame after the sky changes (spec §3.5): read it once it has.
  await expect(page.getByRole("heading", { level: 2 }).first()).toContainText("rainy day");
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
  // track() skips automated browsers (so tests and perf scripts stay out of the counts); this walk
  // through is the one place that wants the events, so it looks like an ordinary browser.
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  // The events the pages send to our endpoint (D7: Workers Analytics Engine), and what it answered.
  const events: [string, Record<string, string>][] = [];
  const statuses: number[] = [];
  context.on("request", (r) => {
    if (r.method() !== "POST" || !r.url().endsWith("/api/event")) return;
    const e = JSON.parse(r.postData() ?? "{}") as { name: string; props?: Record<string, string> };
    events.push([e.name, e.props ?? {}]);
  });
  context.on("response", (r) => {
    if (r.url().endsWith("/api/event")) statuses.push(r.status());
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
  await expect.poll(() => events.some(([n]) => n === "calendar_export")).toBe(true);
  const has = (n: string, props: Record<string, string>) => expect(events, n).toContainEqual([n, props]);
  has("filter_change", { filter: "group", value: "family" });
  has("plan_add", { source: "card", dayType: "weekend" });
  has("activity_view", { id: "three-sisters" });
  has("plan_change", { kind: "time" });
  has("plan_share", { scope: "day" });
  has("calendar_export", { target: "ics", scope: "day" });
  if (events.some(([n]) => n === "plan_b_swap")) has("plan_b_swap", {});
  // Every event is one the endpoint accepts, and every answer seen is a 204 (WebKit doesn't report the
  // answer to a beacon sent just before the page navigates, so not every request has one here).
  expect(events.filter(([name, props]) => !eventFields({ name, props })), "events the endpoint would refuse").toEqual([]);
  await expect.poll(() => statuses.length).toBeGreaterThan(0);
  expect(statuses.filter((s) => s !== 204), "events the endpoint refused").toEqual([]);
});

test("D7: the event endpoint takes only the app's own events, from this site", async ({ request, baseURL }) => {
  const post = (data: unknown, origin = baseURL!) =>
    request.post("/api/event", { data: typeof data === "string" ? data : JSON.stringify(data), headers: { Origin: origin, "Content-Type": "text/plain" } });
  expect((await post({ name: "plan_share", props: { scope: "day" } })).status()).toBe(204);
  expect((await post({ name: "plan_b_swap", props: {} })).status()).toBe(204);
  expect((await post({ name: "filter_change", props: { filter: "stepFree", value: "true" } })).status(), "access filter").toBe(204);
  expect((await post("x".repeat(2048))).status(), "too big").toBe(413);
  expect((await post({ name: "page_view", props: {} })).status(), "unknown event").toBe(400);
  expect((await post({ name: "plan_share", props: { scope: "week" } })).status(), "value not allowed").toBe(400);
  expect((await post({ name: "plan_share", props: { scope: "day", email: "a@b.c" } })).status(), "extra property").toBe(400);
  expect((await post({ name: "activity_view", props: { id: "<script>" } })).status(), "not a token").toBe(400);
  expect((await post("not json")).status()).toBe(400);
  expect((await post({ name: "plan_share", props: { scope: "day" } }, "https://evil.example")).status(), "another site (Astro's origin check)").toBe(403);
  const json = await request.post("/api/event", { data: { name: "plan_share", props: { scope: "day" } }, headers: { Origin: "https://evil.example" } });
  expect(json.status(), "JSON (which Astro's origin check doesn't cover) is refused").toBe(415);
  expect((await request.get("/api/event")).status(), "GET").toBe(404);
});

test("no page's first load includes MapLibre's stylesheet (it comes with the map code)", async ({ request }) => {
  for (const path of ["/", "/a/bondi-coogee", "/plan"]) {
    const html = await (await request.get(path)).text();
    const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
    expect(sheets.filter((s) => /maplibre|MapView/i.test(s)), path).toEqual([]);
  }
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
  // A loose guard: headless WebKit and Firefox paint the whole sky change without a GPU. Since colours
  // switch in one frame (no per-element transitions), that frame is heavier: 1.3 s on a shared CI
  // runner, about 150 ms in WebKit locally. Real-device timing is part of M3.8.
  expect(ms.ms).toBeLessThan(process.env.CI ? 2500 : 1200);
  await expect.poll(running, { timeout: 3000 }).toBe(0);
  await ctx.close();
});

test("M10.4: reduced transparency makes glass solid", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Chromium-only media emulation");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await open(page, "/?w=sunny");
  const glass = await page
    .locator(".rc.glass") // an activity card: a real panel (the state pill has its own rules)
    .first()
    .evaluate((el) => ({ bf: getComputedStyle(el).backdropFilter, bg: getComputedStyle(el).backgroundColor, img: getComputedStyle(el).backgroundImage }));
  expect(glass.bf).toBe("none");
  // Solid: the heavier fill (--glass2) over the sky's base colour (--bg, opaque).
  expect(glass.bg).toBe("rgb(27, 75, 200)");
  expect(glass.img).toContain("rgba(8, 24, 80, 0.76)");
});
