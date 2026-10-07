import { idle, open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";
import { eventFields } from "../../src/lib/analytics";

/**
 * AC 34 (D16, spec §3.1, canvas A1 · State switch): Discover's New South Wales switch opens "Where are
 * you exploring?" (the shared sheet on phones, a popover on desktop) with New South Wales current and
 * the seven other states and territories; tapping one says it isn't here yet and counts the tap; every
 * way of closing it puts focus back on the switch; nothing is added to the URL.
 */
const OTHERS = [
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Australian Capital Territory",
  "Northern Territory",
];
const desktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test("AC 34: the state switch opens Where are you exploring?, says other states aren't here yet, and closes back to the switch", async ({
  page,
  context,
}) => {
  // track() skips automated browsers; this test wants the events, so it looks like an ordinary one.
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  const events: [string, Record<string, string>][] = [];
  const statuses: number[] = [];
  context.on("request", (r) => {
    if (r.method() !== "POST" || !r.url().endsWith("/api/event")) return;
    const e = JSON.parse(r.postData() ?? "{}") as { name: string; props?: Record<string, string> };
    events.push([e.name, e.props ?? {}]);
  });
  context.on("response", (r) => {
    if (r.url().endsWith("/api/event")) statuses.push(r.status());
  });
  await page.clock.setFixedTime(new Date("2026-10-01T00:00:00Z"));
  await open(page, "/");
  await idle(page);

  const sw = page.getByRole("button", { name: "New South Wales: change state" });
  await expect(sw).toHaveAttribute("aria-haspopup", "dialog");
  await expect(sw).toHaveAttribute("aria-expanded", "false");
  const dialog = page.getByRole("dialog", { name: "Where are you exploring?" });

  await sw.click();
  await expect(dialog).toBeVisible();
  await expect(sw).toHaveAttribute("aria-expanded", "true");
  // Phones: the shared modal sheet. Desktop: a popover under the switch, not modal.
  expect(await dialog.getAttribute("aria-modal")).toBe(desktop(page) ? null : "true");
  await expect(dialog).toContainText("Pick a state. We're starting with New South Wales and adding more over time.");
  const nsw = dialog.getByRole("button", { name: /^New South Wales/ });
  await expect(nsw).toHaveAttribute("aria-current", "true");
  await expect(nsw).toContainText(/\d+ days out so far, from Sydney's beaches to the Blue Mountains/);
  for (const name of OTHERS) await expect(dialog.getByRole("button", { name: `${name}, not here yet` })).toBeVisible();

  await dialog.getByRole("button", { name: "Victoria, not here yet" }).click();
  await expect(dialog).toContainText(
    "Victoria isn't here yet. We're starting with New South Wales and adding more over time.",
  );
  await expect.poll(() => events).toContainEqual(["state_interest", { state: "vic" }]);
  expect(events).toContainEqual(["state_picker_open", {}]);
  // A second tap on the same state while the picker is open isn't counted again.
  await dialog.getByRole("button", { name: "Victoria, not here yet" }).click();
  await dialog.getByRole("button", { name: "Queensland, not here yet" }).click();
  await expect.poll(() => events).toContainEqual(["state_interest", { state: "qld" }]);
  expect(events.filter(([n, p]) => n === "state_interest" && p.state === "vic")).toHaveLength(1);

  // Escape closes it and focus goes back to the switch.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(sw).toBeFocused();
  await expect(sw).toHaveAttribute("aria-expanded", "false");

  // Close does the same.
  await sw.click();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(sw).toBeFocused();

  // The backdrop (phone) or a click outside (desktop) does too; neither is a control.
  await sw.click();
  await expect(dialog).toBeVisible();
  const vp = page.viewportSize()!;
  await page.mouse.click(desktop(page) ? vp.width - 40 : vp.width / 2, desktop(page) ? vp.height - 40 : 40);
  await expect(dialog).toBeHidden();
  await expect(sw).toBeFocused();

  // Nothing is stored in the URL while New South Wales is the only live state.
  expect(new URL(page.url()).pathname).toBe("/");
  expect(new URL(page.url()).search).not.toMatch(/state|nsw|vic/);
  expect(
    events.filter(([name, props]) => !eventFields({ name, props })),
    "events the endpoint would refuse",
  ).toEqual([]);
  await expect.poll(() => statuses.length).toBeGreaterThan(0);
  expect(
    statuses.filter((s) => s !== 204),
    "events the endpoint refused",
  ).toEqual([]);
});

test("AC 34: on desktop, Tab out of the popover closes it without taking focus back", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "the popover is desktop-only");
  await open(page, "/");
  await idle(page);
  const sw = page.getByRole("button", { name: "New South Wales: change state" });
  await sw.click();
  const dialog = page.getByRole("dialog", { name: "Where are you exploring?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  // Shift+Tab from the popover lands on the switch: still the switch's popover, so it stays open.
  await page.keyboard.press("Shift+Tab");
  await expect(sw).toBeFocused();
  await expect(dialog).toBeVisible();
  // Tab from the switch goes into the popover, as if it followed the switch.
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  // Tab past its last control closes it and moves on, without taking focus back to the switch.
  await dialog.getByRole("button", { name: "Northern Territory, not here yet" }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog).toBeHidden();
  await expect(sw).not.toBeFocused();
  // Shift+Tab back past the switch closes it too.
  await sw.click();
  await expect(dialog).toBeVisible();
  await sw.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog).toBeHidden();
  // Focus moving anywhere else closes it too.
  await sw.click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Surprise me" }).focus();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Surprise me" })).toBeFocused();
});
