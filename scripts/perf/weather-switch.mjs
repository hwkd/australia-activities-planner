// Lab check for tracker M3.8 / AC 11: frame times during a weather switch on a throttled phone.
// Not a substitute for the real mid-range Android check, but catches regressions.
//   npm run build && npx astro preview --port 4330 --ignore-lock &   then   node scripts/perf/weather-switch.mjs http://localhost:4330 [cpuRate]
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4330";
const rate = Number(process.argv[3] ?? 4);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate });
await page.goto(base + "/");
await page.waitForTimeout(1500);

const results = [];
for (const name of ["Rainy", "30°+", "Cloudy", "Sunny"]) {
  const r = await page.evaluate(async (label) => {
    const btn = [...document.querySelectorAll("fieldset button")].find((b) => b.textContent === label);
    const frames = [];
    let last = performance.now();
    let longest = 0;
    const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => (longest = Math.max(longest, e.duration))));
    obs.observe({ type: "longtask", buffered: false });
    const t0 = performance.now();
    btn.click();
    const inputDelay = await new Promise((res) => requestAnimationFrame(() => res(performance.now() - t0)));
    await new Promise((res) => {
      const tick = (t) => {
        frames.push(t - last);
        last = t;
        if (t - t0 < 1200) requestAnimationFrame(tick);
        else res();
      };
      requestAnimationFrame(tick);
    });
    obs.disconnect();
    frames.shift();
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    return { to: label, fps: +(1000 / avg).toFixed(1), p95ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1), worstMs: +sorted.at(-1).toFixed(1), firstFrameMs: +inputDelay.toFixed(1), longestTaskMs: +longest.toFixed(1) };
  }, name);
  results.push(r);
  await page.waitForTimeout(600);
}
console.table(results);
await browser.close();
