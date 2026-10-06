// Layout shifts on a page, with the elements that moved (where from, where to), on a throttled phone
// (Pixel 7, slow 4G, 4x CPU) and a 1440 px desktop. Use it to find what makes a page jump while it loads.
//   node scripts/perf/layout-shift.mjs [url]   (default https://sydney.hwkd.com.au/)
// FORECAST_FROM=https://sydney.hwkd.com.au/data/forecast.json answers /data/forecast.json with that
// forecast, e.g. to test a local build (whose database has none) with today's real one.
// SCROLL=1 then scrolls slowly to the bottom, so sections that load when they come into view (the
// map, the cost estimate) are included.
/* global window */
import { chromium, devices } from "@playwright/test";
const url = process.argv[2] ?? "https://sydney.hwkd.com.au/";
const browser = await chromium.launch();
for (const [name, ctxOpts] of [
  ["phone", { ...devices["Pixel 7"] }],
  ["desktop", { viewport: { width: 1440, height: 900 } }],
]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__shifts.push({
          t: Math.round(e.startTime),
          v: +e.value.toFixed(4),
          input: e.hadRecentInput,
          sources: (e.sources || []).map((s) => ({
            node: s.node
              ? (
                  s.node.tagName +
                  "." +
                  String(s.node.className || "")
                    .split(" ")
                    .slice(0, 3)
                    .join(".") +
                  (s.node.id ? "#" + s.node.id : "")
                ).slice(0, 80)
              : "?",
            from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)],
            to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)],
          })),
        });
    }).observe({ type: "layout-shift", buffered: true });
  });
  if (process.env.FORECAST_FROM) {
    const fc = await (await fetch(process.env.FORECAST_FROM)).json();
    await page.route("**/data/forecast.json", (r) => r.fulfill({ json: fc }));
  }
  const client = await ctx.newCDPSession(page);
  if (name === "phone") {
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 1.6e6 / 8,
      uploadThroughput: 750e3 / 8,
    });
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (process.env.SCROLL) {
    for (let y = 0; y < 12000; y += 300) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2500);
    const seen = await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      maps: document.querySelectorAll(".maplibregl-map").length,
    }));
    console.log(`  (${name}: scrolled to ${seen.scrollY} px, maps drawn: ${seen.maps})`);
  }
  const shifts = await page.evaluate(() => window.__shifts);
  console.log(
    `== ${name}: CLS ${shifts
      .filter((s) => !s.input)
      .reduce((a, s) => a + s.v, 0)
      .toFixed(3)}`,
  );
  for (const s of shifts) console.log(`  t=${s.t}ms ${s.v}`, JSON.stringify(s.sources));
  await ctx.close();
}
await browser.close();
