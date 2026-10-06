// Samples each sky scene's lightest and darkest points (tracker M3.6) and writes
// src/theme/scene-samples.json for the contrast test (M3.7). Re-run whenever a scene changes:
//   npm run build && npx astro preview --port 4330 &   then   node scripts/theme/sample-scenes.mjs http://localhost:4330
// Uses a still frame (reduced motion) with everything but the scene hidden.
// - "glass": the whole viewport (panels scroll everywhere). Glass panels don't blur what's behind them
//   (a backdrop blur over the moving sky was redrawn every frame and made phones stutter), so this is
//   the scene itself, with the same 2 px blur as below.
// - "skyText": where the headline, eyebrow and intro sit, which is a layout rule: sky text stays left of
//   the sun (phone: within x ≤ 290 at 390 wide; desktop: the 540 px header column, x ≤ 444).
//   Both are sampled with a 2 px blur so hairline rain streaks and sun rays count as texture, not
//   background.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:4330";
const VIEWS = {
  phone: { width: 390, height: 844, skyText: { x: 16, y: 16, w: 274, h: 384 } },
  desktop: { width: 1440, height: 960, skyText: { x: 56, y: 38, w: 388, h: 412 } },
};
const WEATHERS = ["sunny", "cloudy", "rainy", "hot"];

const browser = await chromium.launch();
const out = {};
for (const w of WEATHERS) {
  out[w] = {};
  for (const [name, v] of Object.entries(VIEWS)) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, reducedMotion: "reduce" });
    await page.goto(`${base}/?w=${w}`);
    await page.addStyleTag({ content: "body > :not(.scene), astro-dev-toolbar { visibility: hidden !important }" });
    await page.waitForTimeout(300);
    const png = (await page.screenshot()).toString("base64");
    // Decode in the page with a canvas and find the 0.5th / 99.5th luminance percentiles per region.
    const stats = await page.evaluate(
      async ({ png, regions }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + png;
        await img.decode();
        const draw = (px) => {
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.filter = `blur(${px}px)`;
          ctx.drawImage(img, 0, 0);
          return ctx;
        };
        const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        const hex = (r, g, b) => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
        const res = {};
        for (const [key, r] of Object.entries(regions)) {
          const d = draw(2).getImageData(r.x, r.y, r.w, r.h).data;
          const px = [];
          for (let i = 0; i < d.length; i += 4 * 3) px.push([0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]), d[i], d[i + 1], d[i + 2]]);
          px.sort((a, b) => a[0] - b[0]);
          const at = (q) => px[Math.min(px.length - 1, Math.floor(q * px.length))];
          const lo = at(0.005), hi = at(0.995);
          res[key] = { dark: hex(lo[1], lo[2], lo[3]), light: hex(hi[1], hi[2], hi[3]) };
        }
        return res;
      },
      { png, regions: { glass: { x: 0, y: 0, w: v.width, h: v.height }, skyText: v.skyText } }
    );
    out[w][name] = stats;
    await page.close();
  }
}
await browser.close();
writeFileSync("src/theme/scene-samples.json", JSON.stringify({ sampled: new Date().toISOString().slice(0, 10), ...out }, null, 2) + "\n");
console.log(JSON.stringify(out, null, 1));
