import { idle, open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { tipParts } from "../../src/lib/tips";

type Leg = { mode: string; line?: string; title: string };
type MapLeg = { mode: string; line?: string };
type Act = {
  name: string;
  routes: {
    dest: { lat: number; lng: number; label: string };
    pt: { total: string; changes: number; fare: [number, number]; nonOpal?: [number, number]; nonOpalChild?: [number, number]; legs: Leg[]; back: { text: string } };
    drive: { total: string; perCar: [number, number]; perCarLabel: string; notes: string[] } | null;
    ride?: string;
    unavailable?: { drive?: string };
  };
  geo: { places: { n: number; name: string; note: string }[]; trip?: { legs: MapLeg[] }; back?: { legs: MapLeg[] } };
  pairings: { activityId: string }[];
};
const act = (id: string) => JSON.parse(readFileSync(`db/seed/activities/${id}.json`, "utf8")) as Act;

/** All client:visible islands hydrate only when scrolled to; bring them all into view first. */
async function hydrateAll(page: Page) {
  for (const id of ["h-wx", "h-map", "h-go", "h-cost"]) await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
}
const transport = (page: Page) => page.locator('dl[aria-label="Cost breakdown"] > div').first();
const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const goSection = (page: Page) => page.locator('section[aria-labelledby="h-go"]');
const linesUnderMap = (page: Page) => page.locator("[data-lines] .sr-only");

test("AC 16: one trip from the city centre: summary, way in, last stretch, directions; no pickers", async ({ page }) => {
  const a = act("bondi-coogee");
  await open(page, "/a/bondi-coogee");
  await hydrateAll(page);
  const go = goSection(page);
  await expect(go.getByText("From the city centre")).toBeVisible();
  await expect(go.getByText(a.routes.pt.total, { exact: true })).toBeVisible();
  await expect(go.getByText("1 change", { exact: true })).toBeVisible();
  await expect(go.getByText(`$${a.routes.pt.fare[0]}–${a.routes.pt.fare[1]} each way`)).toBeVisible();
  await expect(go.getByText("Adult Opal fare from the city, est.")).toBeVisible();
  // The way in: the lines ridden, without the walks.
  await expect(go.locator("[data-way-in]")).toHaveText(/T4\s*.*333/);
  // The last stretch: from the last bus to the door.
  await expect(go.getByText("Last stretch")).toBeVisible();
  await expect(go.getByText(a.routes.pt.legs[2].title)).toBeVisible();
  await expect(go.getByText(a.routes.pt.legs[3].title)).toBeVisible();
  await expect(go.getByText(a.routes.pt.legs[1].title)).toHaveCount(0);
  await expect(go.getByText(`Arrive · ${a.routes.dest.label}`)).toBeVisible();
  const dir = go.getByRole("link", { name: /^Directions from where you are/ });
  await expect(dir).toHaveAttribute("target", "_blank");
  const u = new URL((await dir.getAttribute("href"))!);
  expect(u.origin + u.pathname).toBe("https://www.google.com/maps/dir/");
  expect(u.searchParams.get("destination")).toBe(`${a.routes.dest.lat},${a.routes.dest.lng}`);
  expect(u.searchParams.get("travelmode")).toBe("transit");
  // The map names only that trip's lines; there's no origin picker or travel-mode switch.
  await expect(linesUnderMap(page)).toHaveText("On the map: T4 train, bus 333, walk");
  for (const name of ["Central Station", "Circular Quay", "Parramatta", "Transit", "Drive", "Ride"]) await expect(btn(page, name)).toHaveCount(0);
});

test("AC 17: one-way walk shows Getting back, and Way back draws the return and names it under the map", async ({ page }) => {
  const a = act("bondi-coogee");
  await open(page, "/a/bondi-coogee");
  await hydrateAll(page);
  await expect(goSection(page).getByText("Getting back")).toBeVisible();
  await expect(page.getByText(a.routes.pt.back.text)).toBeVisible();
  const back = a.geo.back!.legs.filter((l) => l.mode !== "walk").map((l) => (l.mode === "bus" ? `bus ${l.line}` : `${l.line} ${l.mode}`));
  await expect(linesUnderMap(page)).not.toContainText("way back");
  await btn(page, "Way back").click();
  await expect(btn(page, "Way back")).toHaveAttribute("aria-pressed", "true");
  await expect(linesUnderMap(page)).toContainText(`; way back: ${back.join(", ")}`);
  await btn(page, "Way back").click();
  await expect(linesUnderMap(page)).not.toContainText("way back");
});

test("AC 18: Family on public transport uses the weekend caps; Royal NP adds the uncapped ferry", async ({ page }) => {
  const a = act("bondi-coogee");
  await open(page, "/a/bondi-coogee");
  await hydrateAll(page);
  await btn(page, "Family").click();
  const f = a.routes.pt.fare;
  const end = (i: 0 | 1) => Math.round(2 * Math.min(f[i] * 2, 9.65) + 2 * Math.min(f[i], 4.8));
  await expect(transport(page)).toContainText(`$${end(0)}–${end(1)}`);
  await expect(transport(page)).toContainText("From the city centre.");

  const r = act("royal-np");
  await open(page, "/a/royal-np");
  await hydrateAll(page);
  await btn(page, "Family").click();
  const p = r.routes.pt;
  const ferry = (i: 0 | 1) => Math.round(2 * (Math.min(p.fare[i] * 2, 9.65) + p.nonOpal![i] * 2) + 2 * (Math.min(p.fare[i], 4.8) + (p.nonOpalChild ?? [p.nonOpal![0] / 2, p.nonOpal![1] / 2])[i] * 2));
  await expect(transport(page)).toContainText(`$${ferry(0)}–${ferry(1)}`);
  await expect(page.getByText(/not on Opal/).first()).toBeVisible();
});

test("AC 19: picking a place in the list selects it (and its pin, when the map shows) and shows its note; keyboard works", async ({ page }) => {
  const a = act("bondi-coogee");
  const poi = a.geo.places[1];
  await open(page, "/a/bondi-coogee");
  await hydrateAll(page);
  const item = page.getByRole("list").getByRole("button", { name: new RegExp(`^${poi.n}\\s*${poi.name}`) });
  await item.focus();
  await page.keyboard.press("Enter");
  await expect(item).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(poi.note)).toBeVisible();
  // The map's pin follows when the map is there (it needs the tiles and WebGL; map.spec.ts covers it).
  const pin = page.getByRole("region", { name: /map of the places/ }).getByRole("button", { name: `${poi.n}. ${poi.name}` });
  if (await pin.count()) await expect(pin).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close place details" }).click();
  await expect(page.getByText(poi.note)).toHaveCount(0);
  await expect(item).toHaveAttribute("aria-pressed", "false");
});

test("AC 20: the Driving? note: time, parking per car and tips; why you can't drive; Rideshare only where there's one", async ({ page }) => {
  const a = act("bondi-coogee");
  await open(page, "/a/bondi-coogee");
  await hydrateAll(page);
  const go = goSection(page);
  await expect(go.getByRole("heading", { name: "Driving?" })).toBeVisible();
  await expect(go.getByText(`${a.routes.drive!.total} from the city`)).toBeVisible();
  await expect(go.getByText("Parking, 3 hrs: $15–30 per car, est.")).toBeVisible();
  // Notes show as written, an "Our tip:" sentence with its label instead of the raw prefix.
  for (const n of a.routes.drive!.notes)
    for (const part of tipParts(n)) await expect(go.getByText(part.text, { exact: false }).first()).toBeVisible();
  await expect(go.locator("[data-ride]")).toHaveText(`Rideshare: ${a.routes.ride}`);
  // The cost's transport line is always public transport; parking isn't in the total.
  await expect(transport(page)).toContainText("Opal fares, return");

  const c = act("cockatoo");
  await open(page, "/a/cockatoo");
  await expect(goSection(page).getByText(c.routes.unavailable!.drive!)).toBeVisible();

  await open(page, "/a/agnsw");
  expect(act("agnsw").routes.ride).toBeUndefined();
  await expect(goSection(page).locator("[data-ride]")).toHaveCount(0);
});

test("AC 21: a pairing opens at the top, keeps the group, and Back returns to Discover", async ({ page }) => {
  const a = act("bondi-coogee");
  const next = act(a.pairings[0].activityId);
  await open(page, "/");
  await page.locator(`a[href="/a/bondi-coogee"]`).click();
  await page.waitForURL("**/a/bondi-coogee");
  await hydrateAll(page);
  await btn(page, "Friends").click();
  await btn(page, "Way back").click();
  await page.locator("a[data-pairing]").first().click();
  await page.waitForURL(`**/a/${a.pairings[0].activityId}`);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(next.name);
  await hydrateAll(page);
  await expect(btn(page, "Friends")).toHaveAttribute("aria-pressed", "true");
  if (await btn(page, "Way back").count()) await expect(btn(page, "Way back")).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "Back" }).click();
  await page.waitForURL((u) => u.pathname === "/");
});

test("AC 22: changing the weather on an activity page changes it for the whole app", async ({ page }) => {
  await open(page, "/?w=sunny");
  await page.locator('a[href^="/a/"]').first().click();
  await page.waitForURL("**/a/**");
  await hydrateAll(page);
  await page.getByRole("group", { name: "Weather" }).getByRole("button", { name: /Rainy/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-weather", "rainy");
  await page.getByRole("link", { name: "Back" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("heading", { level: 2 }).first()).toContainText("rainy day");
  await expect(page).toHaveURL(/w=rainy/);
});

test("Add to a day opens the sheet from the activity page", async ({ page }) => {
  await open(page, "/a/agnsw");
  await idle(page);
  await page.getByRole("button", { name: /to a day/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("M17.6: outdoor activities show NSW RFS fire danger (or where to check it); indoor ones don't", async ({ page }) => {
  await open(page, "/a/three-sisters");
  const fire = page.locator("li[data-fire]");
  // Live from the RFS feed when it answers, otherwise a pointer to the RFS site; never stale data.
  await expect(fire).toContainText(/Fire danger in Greater Sydney today: .+\. .*Tomorrow: .+From NSW RFS at |Fire danger: check the NSW RFS site before you go\./);
  await expect(fire.getByRole("link")).toHaveAttribute("href", /rfs\.nsw\.gov\.au/);
  await open(page, "/a/agnsw");
  await expect(page.locator("li[data-fire]")).toHaveCount(0);
});

test("Not yet confirmed: each section lists the activity's unconfirmed details for it, and only those, with a way to check each", async ({ page }) => {
  type U = { section: string; note: string; check?: { label: string; url: string } };
  const a = JSON.parse(readFileSync("db/seed/activities/royal-np.json", "utf8")) as { unconfirmed: U[] };
  await open(page, "/a/royal-np");
  const go = goSection(page).locator("[data-unconfirmed]");
  await expect(go).toContainText("Not yet confirmed");
  for (const u of a.unconfirmed.filter((x) => x.section === "gettingThere" || x.section === "driving")) {
    await expect(go).toContainText(u.note);
    if (!u.check) continue;
    // The link names its source; an https page opens in a new tab, a tel: number dials.
    const link = go.getByRole("link", { name: `How to check: ${u.check.label}` });
    await expect(link).toHaveAttribute("href", u.check.url);
    if (u.check.url.startsWith("https:")) await expect(link).toHaveAttribute("target", "_blank");
  }
  // Royal NP has nothing unconfirmed about its cost or access.
  await expect(page.locator('section[aria-labelledby="h-cost"] [data-unconfirmed]')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="h-access"] [data-unconfirmed]')).toHaveCount(0);
});

test("Notice: a temporary warning (a track closure) shows at the top of the page with its link", async ({ page }) => {
  const a = JSON.parse(readFileSync("db/seed/activities/wentworth.json", "utf8")) as { notice: { text: string; link: { label: string; url: string } } };
  await open(page, "/a/wentworth");
  const notice = page.locator("[data-notice]");
  await expect(notice).toContainText(a.notice.text);
  await expect(notice.getByRole("link", { name: a.notice.link.label })).toHaveAttribute("href", a.notice.link.url);
  // Activities without one show nothing.
  await open(page, "/a/bondi-coogee");
  await expect(page.locator("[data-notice]")).toHaveCount(0);
});

test("Our tip: advice no official source confirms is labelled, and confirmed facts aren't", async ({ page }) => {
  await open(page, "/a/bondi-coogee");
  const go = goSection(page);
  const tip = go.locator("[data-tip]").first();
  await expect(tip).toContainText("Our tip");
  await expect(tip).toContainText("It fills by 9am on warm weekends.");
  // The confirmed fact before it stays plain text, and the raw "Our tip:" prefix never shows.
  await expect(go).toContainText("Parking near the beach is metered.");
  await expect(page.locator("body")).not.toContainText("Our tip: it fills");
});
