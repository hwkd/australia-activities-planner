import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";

// A throwaway admin for this run only, in a separate local D1 (.wrangler/e2e), so tests never touch
// development data. The password is random per run and only lives in this process's environment.
process.env.E2E_ADMIN_EMAIL ??= "e2e-owner@example.test";
process.env.E2E_ADMIN_PASSWORD ??= randomBytes(18).toString("base64url");
const state = ".wrangler/e2e";

export default defineConfig({
  testDir: "tests/e2e",
  // One local preview server (workerd + D1) serves every engine; more than four browsers at once
  // starves it and pages time out (seen with Firefox). CI runners have fewer cores anyway.
  workers: process.env.CI ? undefined : 4,
  // On CI: one retry (a pass on retry is still reported as flaky), a trace of the retry, and an HTML
  // report for the workflow's playwright-report artifact.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // Browsers run on Sydney time whatever the machine's zone (CI runners are UTC). Tests freeze time with
  // page.clock, whose fake Date constructor returns plain Dates, so TZDate (a Date subclass) loses its
  // zone and reads the device's instead; on a UTC device 8:30am in Sydney came out as 5pm.
  use: { baseURL: "http://localhost:4329", timezoneId: "Australia/Sydney", trace: "on-first-retry" },
  // Always a fresh build and a freshly seeded database on its own port (Astro's background preview
  // server is shared per project, so reusing one could test a stale build).
  webServer: {
    command: [
      `SWF_STATE=${state} npm run build`,
      `SWF_STATE=${state} npx tsx scripts/db/reset.ts`,
      `SWF_STATE=${state} ADMIN_PASSWORD="$E2E_ADMIN_PASSWORD" npx tsx scripts/db/create-user.ts --email "$E2E_ADMIN_EMAIL" --name "E2E Owner" --role owner`,
      // Map tiles (spec §11.2), when .map-data/ has them; map tests skip otherwise (e.g. in CI).
      `SWF_STATE=${state} npx tsx scripts/map/upload.ts`,
      `SWF_STATE=${state} npx astro preview --port 4329 --ignore-lock`,
    ].join(" && "),
    url: "http://localhost:4329",
    reuseExistingServer: false,
    timeout: 240_000,
    env: { E2E_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD },
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] }, testIgnore: /admin\.spec\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 960 } }, testIgnore: /admin\.spec\.ts/ },
    // Other engines (spec §7 Browsers, tracker M12.3): Safari on a phone and Firefox on desktop.
    // Screenshot baselines are Chromium's, so the visual comparison stays on the Chromium projects.
    // Reduced motion here: headless Firefox and WebKit draw the animated skies and blurred glass on
    // the CPU, and several at once starve the run. Motion is covered in Chromium (and AC 11 sets its own).
    { name: "phone-safari", use: { ...devices["iPhone 15"], reducedMotion: "reduce" }, testIgnore: /(admin|visual)\.spec\.ts/ },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" }, testIgnore: /(admin|visual)\.spec\.ts/ },
    // The admin tests change content, so they run after the visitor tests, one at a time.
    { name: "admin", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }, testMatch: /admin\.spec\.ts/, dependencies: ["phone", "desktop", "phone-safari", "desktop-firefox"], fullyParallel: false },
  ],
});
