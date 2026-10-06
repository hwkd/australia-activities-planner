// How long a tap on a Discover card takes to show the activity page (from the tap to the new page's
// first contentful paint), on a throttled phone: Pixel 7, 150 ms latency, 1.6 Mbps, 4x CPU.
//   node scripts/perf/navigation.mjs [baseUrl] [runs]   (default http://localhost:4330, 5)
// DESKTOP=1: a 1440 px desktop that points at the link for 300 ms before clicking.
// Service workers are blocked so the throttled network applies to every request (as on a first visit).
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4330";
const runs = Number(process.argv[3] ?? 5);
const browser = await chromium.launch();
const desktop = !!process.env.DESKTOP;
const ctx = await browser.newContext({
  ...(desktop ? { viewport: { width: 1440, height: 900 } } : devices["Pixel 7"]),
  serviceWorkers: "block",
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: 1.6e6 / 8,
  uploadThroughput: 750e3 / 8,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const results = [];
for (let i = 0; i < runs; i++) {
  await page.goto(base + "/?w=sunny", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const link = page.locator('main a[href^="/a/"]').nth(i);
  await link.scrollIntoViewIfNeeded();
  const href = await link.getAttribute("href");
  let t0;
  if (desktop) {
    await link.hover();
    await page.waitForTimeout(300);
    t0 = Date.now();
    await link.click();
  } else {
    t0 = Date.now();
    await link.tap();
  }
  await page.waitForURL("**" + href);
  const fcp = await page.evaluate(
    () =>
      new Promise((res) => {
        const done = (e) => res(performance.timeOrigin + e.startTime);
        const now = performance.getEntriesByName("first-contentful-paint")[0];
        if (now) return done(now);
        new PerformanceObserver((l) => done(l.getEntries()[0])).observe({ type: "paint", buffered: true });
      }),
  );
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return { ttfb: Math.round(n.responseStart - n.startTime), transfer: n.transferSize };
  });
  results.push({ href, tapToPaintMs: Math.round(fcp - t0), ...nav });
}
console.table(results);
const v = results.map((r) => r.tapToPaintMs).sort((a, b) => a - b);
console.log(`tap to first paint: median ${v[Math.floor(v.length / 2)]} ms, worst ${v[v.length - 1]} ms`);
await browser.close();
