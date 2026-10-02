// Lighthouse budgets (tracker M10.7): Performance and Accessibility 90+ on Discover, an activity and
// My plans (mobile emulation), plus the transfer budgets in budget.json.
//   npm run build && npx astro preview --port 4331 --ignore-lock &   then   node scripts/perf/lighthouse.mjs http://localhost:4331
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer, request as httpRequest } from "node:http";
import { gzipSync } from "node:zlib";

let base = process.argv[2] ?? "http://localhost:4331";

// Cloudflare compresses responses in production, but the local workerd preview doesn't. For a local
// target, put a gzip proxy in front so the transfer budgets measure what visitors actually download.
let proxy = null;
if (/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) {
  const target = new URL(base);
  proxy = createServer((req, res) => {
    const up = httpRequest({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: { ...req.headers, host: target.host, "accept-encoding": "identity" } }, (r) => {
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => {
        let body = Buffer.concat(chunks);
        const headers = { ...r.headers };
        delete headers["content-length"];
        delete headers["transfer-encoding"];
        if (/text|javascript|json|css|svg|xml/.test(headers["content-type"] ?? "") && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
          body = gzipSync(body);
          headers["content-encoding"] = "gzip";
        }
        headers["content-length"] = String(body.length);
        res.writeHead(r.statusCode ?? 200, headers);
        res.end(body);
      });
    });
    req.pipe(up);
  });
  await new Promise((r) => proxy.listen(0, r));
  base = `http://localhost:${proxy.address().port}`;
}
// budget.json is in Lighthouse's format: [{ path, resourceSizes: [{ resourceType, budget (KB) }] }].
const budget = Object.fromEntries(JSON.parse(readFileSync("budget.json", "utf8"))[0].resourceSizes.map((r) => [r.resourceType, r.budget]));
for (const k of ["script", "font", "total"]) if (typeof budget[k] !== "number") throw new Error(`budget.json has no ${k} budget`);
const pages = ["/", "/a/bondi-coogee", "/plan"];
let failed = false;
for (const path of pages) {
  // Async: the gzip proxy below runs in this process and must keep serving while Lighthouse runs.
  const { stdout: out } = await promisify(execFile)("npx", ["lighthouse", base + path, "--quiet", "--chrome-flags=--headless=new", "--only-categories=performance,accessibility,best-practices,seo", "--output=json", "--output-path=stdout"], {
    env: { ...process.env, CHROME_PATH: chromium.executablePath() },
    maxBuffer: 64 * 1024 * 1024,
  });
  const r = JSON.parse(out);
  const score = (k) => Math.round(r.categories[k].score * 100);
  const items = r.audits["resource-summary"].details.items;
  const kb = (type) => Math.round((items.find((i) => i.resourceType === type)?.transferSize ?? 0) / 1024);
  const row = { path, performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), seo: score("seo"), scriptKB: kb("script"), fontKB: kb("font"), totalKB: kb("total") };
  const problems = [
    row.performance < 90 && "performance < 90",
    row.accessibility < 90 && "accessibility < 90",
    row.scriptKB > budget.script && `script ${row.scriptKB} KB > ${budget.script}`,
    row.fontKB > budget.font && `font ${row.fontKB} KB > ${budget.font}`,
    row.totalKB > budget.total && `total ${row.totalKB} KB > ${budget.total}`,
  ].filter(Boolean);
  console.log(JSON.stringify(row), problems.length ? `FAIL: ${problems.join(", ")}` : "ok");
  if (problems.length) failed = true;
}
proxy?.close();
process.exit(failed ? 1 : 0);
