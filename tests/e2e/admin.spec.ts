import { expect, test, type Browser, type Page } from "@playwright/test";

/** The content admin (tracker M11), against a throwaway D1 and owner created for this run. */
const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Activities" })).toBeVisible();
}

test("sign-in refuses a wrong password, then signs in", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("not the password at all");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("don't match");
  await signIn(page);
  await expect(page.getByRole("link", { name: "Bondi to Coogee Coastal Walk" })).toBeVisible();
});

test("the API refuses visitors and cross-site requests; previews need a session", async ({ page, request }) => {
  expect((await request.get("/api/admin/activities")).status()).toBe(401);
  expect((await request.post("/api/admin/activities", { data: {}, headers: { Origin: "https://evil.example" } })).status()).toBe(403);
  const res = await page.goto("/admin");
  expect(res?.headers()["cache-control"]).toBe("no-store");
  expect(res?.headers()["x-frame-options"]).toBe("DENY");
  expect(res?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("create a draft, validate, save, preview, publish, unpublish, history, delete", async ({ page, browser }) => {
  await signIn(page);
  await page.getByRole("link", { name: "+ New activity" }).click();
  await page.getByLabel("Name").fill("Test Lookout");
  await expect(page.getByLabel("ID (page address)")).toHaveValue("test-lookout");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/activities\/test-lookout$/);
  await expect(page.getByText("Not published")).toBeVisible();

  // Live validation: a too-long blurb blocks saving and says why.
  const blurb = page.getByLabel("Blurb");
  await blurb.fill("x".repeat(95));
  await expect(page.getByText(/fields? needs? fixing/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeDisabled();
  await blurb.fill("A quiet lookout for testing the content admin.");
  await page.getByLabel("Area").fill("Testville");
  await page.locator("fieldset", { hasText: "Rainy" }).first().getByText("Perfect").click();

  // Getting there (D14): one trip from Central, a Driving? note and an optional rideshare sentence.
  await page.getByLabel("Total time").fill("≈ 25 min");
  await page.getByLabel("Why you can't drive there").fill("");
  await expect(page.getByText("drive is null without a reason").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeDisabled();
  await page.getByLabel("You can drive there").check();
  await page.getByLabel("Drive time from the city").fill("≈ 20 min");
  await page.getByLabel("What that covers").fill("Parking, 2 hrs");
  await page.getByLabel("Rideshare (optional)").fill("A short ride from the city, handy late at night.");
  // A new activity's map has one start place, to move to the real start.
  await expect(page.getByLabel("Place 1 name", { exact: true })).toHaveValue("Test Lookout");
  await expect(page.getByLabel("Place 1 type", { exact: true })).toHaveValue("start");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();

  // Unpublished: hidden from visitors, visible to a signed-in preview.
  expect((await page.request.get("/a/test-lookout")).status()).toBe(404);
  const preview = await page.request.get("/a/test-lookout?preview");
  const previewHtml = await preview.text();
  expect(previewHtml).toContain("A quiet lookout for testing the content admin.");
  expect(previewHtml).toContain("A short ride from the city, handy late at night.");
  const visitor = await (await browser.newContext()).newPage();
  expect((await visitor.goto("/a/test-lookout?preview"))?.status()).toBe(404);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
  await visitor.goto("/a/test-lookout");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Test Lookout");
  await visitor.goto("/?w=rainy");
  await expect(visitor.getByRole("heading", { level: 3, name: "Test Lookout" })).toBeVisible();

  // History shows every step; restoring the created version brings back the placeholder blurb.
  await page.getByRole("button", { name: "History" }).click();
  const history = page.getByRole("region", { name: "History" });
  await expect(history.getByText("publish")).toBeVisible();
  await expect(history.getByText("save")).toBeVisible();
  await expect(history.getByText("create")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished.")).toBeVisible();
  expect((await visitor.goto("/a/test-lookout"))?.status()).toBe(404);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete activity" }).click();
  await expect(page.getByRole("heading", { name: "Activities" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Test Lookout" })).toHaveCount(0);
});

test("saved changes stay off the site until published; a stale editor gets a conflict", async ({ page, browser }) => {
  await signIn(page);
  await page.goto("/admin/activities/agnsw");
  const second = await (await browser.newContext()).newPage();
  await signIn(second);
  await second.goto("/admin/activities/agnsw");

  await page.getByLabel("Newcomer tip").fill("Tip edited by the first editor.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();
  expect(await (await page.request.get("/a/agnsw")).text()).not.toContain("Tip edited by the first editor.");

  await second.getByLabel("Newcomer tip").fill("Tip edited by the second editor.");
  await second.getByRole("button", { name: "Save draft" }).click();
  await expect(second.getByRole("alert")).toContainText("Someone else changed this activity");

  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
  expect(await (await page.request.get("/a/agnsw")).text()).toContain("Tip edited by the first editor.");
});

test("AC 30: unpublishing turns pairings to it into plain text; publishing brings the link back", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/activities/clovelly");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished.")).toBeVisible();
  const visitor = await (await page.context().browser()!.newContext()).newPage();
  expect((await visitor.goto("/a/clovelly"))?.status()).toBe(404);
  await visitor.goto("/a/coogee");
  const pairings = visitor.getByRole("region", { name: "Make a day of it" });
  await expect(pairings).toContainText("Clovelly");
  await expect(visitor.locator('a[href="/a/clovelly"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
  await visitor.goto("/a/coogee");
  await expect(visitor.locator('a[href="/a/clovelly"]')).toHaveCount(1);
});

test("M14: access facts entered in the admin turn on the Pram-friendly and Step-free filters", async ({ page }) => {
  const visitor = await (await page.context().browser()!.newContext()).newPage();
  // The Art Gallery's access hasn't been checked: its page says so, and it isn't a Pram-friendly result
  // (other activities can be, from access facts in their own content).
  const results = visitor.getByRole("list", { name: "Ranked results" });
  await visitor.goto("/?w=sunny&pram=1");
  await expect(results.getByRole("heading", { level: 3, name: "Art Gallery of NSW" })).toHaveCount(0);
  await visitor.goto("/a/agnsw");
  await expect(visitor.getByRole("region", { name: "Access" })).toContainText("Not yet checked");

  await signIn(page);
  await page.goto("/admin/activities/agnsw");
  await page.getByLabel("Access has been checked").check();
  await page.getByLabel("Prams").selectOption("yes");
  await page.getByLabel("Step-free").selectOption("yes");
  await page.getByLabel("Accessible toilet").check();
  await page.getByLabel("Access notes (optional)").fill("Lifts to every level from the Art Gallery Road entrance.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();

  await visitor.goto("/?w=sunny");
  await visitor.getByRole("button", { name: "Pram-friendly" }).click();
  await expect(visitor).toHaveURL(/pram=1/);
  await expect(results.getByRole("heading", { level: 3, name: "Art Gallery of NSW" })).toBeVisible();
  await visitor.goto("/a/agnsw");
  const access = visitor.getByRole("region", { name: "Access" });
  await expect(access).toContainText("PramsYes");
  await expect(access).toContainText("Lifts to every level");

  // Back to unchecked, so other tests see the seed content.
  await page.getByLabel("Access has been checked").uncheck();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
});

/** The activity's saved draft (to put back after a test), and helpers to save and publish it over the API. */
async function snapshot(page: Page, id: string) {
  const r = await (await page.request.get(`/api/admin/activities/${id}`)).json();
  return r.draft as unknown;
}
async function restore(page: Page, id: string, draft: unknown) {
  const headers = { Origin: new URL(page.url()).origin };
  const { version } = await (await page.request.get(`/api/admin/activities/${id}`)).json();
  const saved = await page.request.put(`/api/admin/activities/${id}`, { data: { activity: draft, version }, headers });
  expect(saved.ok()).toBe(true);
  const published = await page.request.post(`/api/admin/activities/${id}/publish`, { data: { version: (await saved.json()).version }, headers });
  expect(published.ok()).toBe(true);
}

test("D15: GeoJSON pasted in the admin replaces the walking line, facilities and the trip from Central", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/activities/three-sisters");
  const original = await snapshot(page, "three-sisters");
  const places = await page.getByLabel("Place 1 name", { exact: true }).inputValue();

  const geojson = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[150.3121, -33.7321], [150.3089, -33.7330]] } },
      { type: "Feature", properties: { amenity: "toilets" }, geometry: { type: "Point", coordinates: [150.312, -33.732] } },
    ],
  };
  await page.getByLabel("Paste GeoJSON for the walking line and facilities").fill(JSON.stringify(geojson));
  await page.getByRole("button", { name: "Use this GeoJSON" }).click();
  await expect(page.getByText(/Walking line: 1 part\(s\), 2 points\. Toilets and cafés: 1\./)).toBeVisible();

  const trip = { type: "Feature", properties: { mode: "train", line: "BMT" }, geometry: { type: "LineString", coordinates: [[151.2069, -33.8853], [150.3122, -33.7124]] } };
  await page.getByLabel("Paste GeoJSON for the trip from Central").fill(JSON.stringify(trip));
  await page.getByRole("button", { name: "Use for the trip from Central" }).click();
  await expect(page.getByText(/Trip from Central: train BMT\./)).toBeVisible();
  await page.getByLabel("Trip from Central line 1 mode").selectOption("bus");
  await expect(page.getByText(/Trip from Central: bus BMT\./)).toBeVisible();
  await page.getByLabel("Trip from Central line 1 mode").selectOption("train");

  // Places are kept, and come from the Places editor, not GeoJSON.
  await expect(page.getByLabel("Place 1 name", { exact: true })).toHaveValue(places);
  await page.getByLabel("Source", { exact: true }).fill("Test data");
  await page.getByRole("button", { name: "Map checked today" }).click();
  await expect(page.getByLabel("Map checked")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
  expect(await (await page.request.get("/a/three-sisters")).text()).toContain("Test data");

  await restore(page, "three-sisters", original);
});

test("D15: a place moved and renamed in the Places editor shows on the published page", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/activities/bondi-coogee");
  const original = await snapshot(page, "bondi-coogee");

  // The map (when this browser has WebGL): a numbered pin per place; selecting a row selects its pin.
  const map = page.getByRole("region", { name: "Places map (drag the numbered pins)" });
  await expect(map.or(page.getByText("The map can't be shown in this browser"))).toBeVisible();
  if (await map.isVisible()) {
    await expect(page.getByRole("button", { name: /^Place 1: .* \(drag to move\)$/ })).toBeVisible();
    await page.getByLabel("Place 3 note", { exact: true }).focus();
    await expect(page.getByRole("button", { name: /^Place 3: / })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Place 2: / }).click();
    await expect(page.getByRole("button", { name: /^Place 2: / })).toHaveAttribute("aria-pressed", "true");
  }

  // Positions are checked as you type: a latitude far outside Sydney blocks saving.
  const lat = page.getByLabel("Place 2 latitude", { exact: true });
  await lat.fill("-20");
  await expect(page.getByRole("button", { name: "Save draft" })).toBeDisabled();
  await lat.fill("-33.8952");
  await page.getByLabel("Place 2 longitude", { exact: true }).fill("151.2731");
  await page.getByLabel("Place 2 name", { exact: true }).fill("Renamed Test Beach");
  if (await map.isVisible()) await expect(page.getByRole("button", { name: "Place 2: Renamed Test Beach (drag to move)" })).toBeVisible();

  // Reordering renumbers the places 1..n.
  await page.getByRole("button", { name: "Move place 2 down" }).click();
  await expect(page.getByLabel("Place 3 name", { exact: true })).toHaveValue("Renamed Test Beach");
  await page.getByRole("button", { name: "Move place 3 up" }).click();
  await expect(page.getByLabel("Place 2 name", { exact: true })).toHaveValue("Renamed Test Beach");

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
  const saved = (await snapshot(page, "bondi-coogee")) as { geo: { places: { n: number; name: string; lng: number; lat: number }[] } };
  expect(saved.geo.places[1]).toMatchObject({ n: 2, name: "Renamed Test Beach", lng: 151.2731, lat: -33.8952 });

  const visitor = await (await page.context().browser()!.newContext()).newPage();
  await visitor.goto("/a/bondi-coogee");
  await expect(visitor.getByRole("button", { name: /Renamed Test Beach/ }).first()).toBeVisible();

  await restore(page, "bondi-coogee", original);
});

async function acceptInvite(browser: Browser, link: string, name: string, password: string) {
  const p = await (await browser.newContext()).newPage();
  await p.goto(link);
  await p.getByLabel("Your name").fill(name);
  await p.getByLabel("Password", { exact: true }).fill(password);
  await p.getByLabel("Password again").fill(password);
  await p.getByRole("button", { name: "Create my account" }).click();
  await expect(p.getByText("All set")).toBeVisible();
  return p;
}

test("an owner invites an editor, who can edit but not manage users; disabling signs them out", async ({ page, browser }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Users" }).click();
  await page.getByLabel("Invite someone (email)").fill("editor@example.test");
  await page.getByRole("button", { name: "Create invite link" }).click();
  const link = await page.getByLabel("Link").inputValue();
  expect(link).toMatch(/\/admin\/invite\/[A-Za-z0-9_-]{40,}$/);

  const editorPw = "editor passphrase for tests";
  const ed = await acceptInvite(browser, link, "Ed Itor", editorPw);
  // The link works once.
  const again = await (await browser.newContext()).newPage();
  await again.goto(link);
  await expect(again.getByRole("alert")).toContainText("expired or was already used");

  await signIn(ed, "editor@example.test", editorPw);
  await expect(ed.getByRole("link", { name: "Users" })).toHaveCount(0);
  expect((await ed.request.get("/api/admin/users")).status()).toBe(403);

  await page.reload();
  await page.getByRole("row", { name: /Ed Itor/ }).getByRole("button", { name: "Disable" }).click();
  await expect(page.getByRole("row", { name: /Ed Itor/ }).getByRole("button", { name: "Enable" })).toBeVisible();
  expect((await ed.request.get("/api/admin/me")).status()).toBe(401);
});

/** Today's date in Sydney plus `n` days, as YYYY-MM-DD (admin tests run on the real clock). */
function sydneyDate(n: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

test("M15: an editor writes, publishes, unpublishes and deletes an event; visitors see it On soon", async ({ page, browser }) => {
  await signIn(page);
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Events" }).click();
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  await page.getByRole("link", { name: "+ New event" }).click();
  await page.getByLabel("Name").fill("Test Night Market");
  await expect(page.getByLabel("ID")).toHaveValue("e-test-night-market");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/e-test-night-market$/);
  await expect(page.getByText("Not published")).toBeVisible();

  // A blank event saves as a draft but can't be published until the facts are filled in.
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
  await page.getByLabel("Blurb").fill("Street food stalls and lanterns for testing the events admin.");
  await page.getByLabel("Area").fill("Testville");
  await page.getByLabel("Link URL").fill("https://example.com/test-night-market");
  await page.getByLabel("First day").fill(sydneyDate(1));
  await page.getByLabel("Last day").fill(sydneyDate(3));
  await page.getByLabel("Venue name").fill("Test Park");
  await page.getByLabel("Latitude").fill("-33.8755");
  await page.getByLabel("Longitude").fill("151.2009");
  await page.getByRole("button", { name: "Checked today" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Saved as a draft. The public site still shows the published version.")).toBeVisible();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It's live now.")).toBeVisible();
  expect(await (await page.request.get("/data/export.json")).json()).toHaveProperty(["e-test-night-market"]);
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/?w=sunny");
  await expect(visitor.getByRole("region", { name: "On soon" })).toContainText("Test Night Market");

  // Clean up so other tests see the seed content.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished.")).toBeVisible();
  expect(await (await page.request.get("/data/export.json")).json()).not.toHaveProperty(["e-test-night-market"]);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Test Night Market" })).toHaveCount(0);
});
