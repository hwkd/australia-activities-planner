/* global window */
// Drawing work per sky on a page (Discover by default): milliseconds per second the compositor is busy, while scrolling and
// at rest. CPU throttling (weather-switch.mjs, scroll.mjs) can't see GPU cost such as blurs, blends and
// big animated layers; headless Chromium draws in software, so here that cost shows up as compositor
// time, roughly in proportion to what a phone's GPU has to do. Compare builds, not absolute numbers.
//   node scripts/perf/compositor.mjs [url] [css-to-add]   (default http://localhost:4330/)
// The optional CSS is added to the page, to try turning one effect off, e.g. ".grain{display:none}".
import { chromium, devices } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2] ?? "http://localhost:4330/";
const css = process.argv[3] ?? "";
const dir = mkdtempSync(join(tmpdir(), "compositor-"));
const trace = join(dir, "trace.json");

const browser = await chromium.launch();
const rows = [];
for (const mode of ["scroll", "rest"]) {
  const row = { mode };
  for (const w of ["sunny", "cloudy", "rainy", "hot"]) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await ctx.newPage();
    await page.goto(`${url}?w=${w}`, { waitUntil: "networkidle" });
    if (css) await page.addStyleTag({ content: css });
    // The sky's loops start once the page has gone idle (`sky-live`).
    await page.waitForFunction(() => document.documentElement.classList.contains("sky-live"), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await browser.startTracing(page, { path: trace, categories: ["toplevel", "viz"] });
    const t0 = Date.now();
    if (mode === "scroll")
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const end = performance.now() + 3000;
            const tick = (now) => {
              window.scrollBy(0, 14); // about 840 px a second
              if (now < end) requestAnimationFrame(tick);
              else resolve();
            };
            requestAnimationFrame(tick);
          }),
      );
    else await page.waitForTimeout(3000);
    const secs = (Date.now() - t0) / 1000;
    await browser.stopTracing();
    const events = JSON.parse(readFileSync(trace, "utf8")).traceEvents;
    const threads = new Map();
    for (const e of events) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args.name);
    let busy = 0;
    for (const e of events)
      if (e.ph === "X" && e.name === "ThreadControllerImpl::RunTask" && threads.get(`${e.pid}:${e.tid}`) === "VizCompositorThread")
        busy += e.dur / 1000;
    row[w] = Math.round(busy / secs);
    await ctx.close();
  }
  rows.push(row);
}
console.log("Compositor busy, ms per second (lower is better):");
console.table(rows);
await browser.close();
rmSync(dir, { recursive: true, force: true });
