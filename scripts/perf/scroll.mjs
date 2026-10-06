/* global window */
// Frame times while scrolling Discover's results on a throttled phone (Pixel 7, 4x CPU): a steady
// touch-like scroll through the list, with every frame's duration recorded.
//   node scripts/perf/scroll.mjs [url] [cpuRate]   (default http://localhost:4330/?w=sunny, 4)
import { chromium, devices } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:4330/?w=sunny";
const rate = Number(process.argv[3] ?? 4);
const browser = await chromium.launch({ args: ["--enable-gpu-rasterization"] });
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate });
const frames = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const times = [];
      let last = performance.now();
      const end = last + 4000;
      const tick = (now) => {
        times.push(now - last);
        last = now;
        window.scrollBy(0, 14); // about 840 px a second at 60 fps
        if (now < end && window.scrollY + window.innerHeight < document.documentElement.scrollHeight)
          requestAnimationFrame(tick);
        else resolve(times.slice(1));
      };
      requestAnimationFrame(tick);
    }),
);
const sorted = [...frames].sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(1);
const dropped = frames.filter((f) => f > 20).length;
console.log(
  `frames ${frames.length}, median ${pct(0.5)} ms, p95 ${pct(0.95)} ms, worst ${pct(1)} ms, over 20 ms: ${dropped} (${((dropped / frames.length) * 100).toFixed(0)}%)`,
);
await browser.close();
