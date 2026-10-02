import { describe, expect, it } from "vitest";
import type { EventItem } from "~/content/eventSchema";
import type { EventCard } from "~/lib/events";
import { testDb } from "../../tests/unit/d1";
import { activities } from "../../tests/unit/cards";
import { ConflictError, NotFoundError, ValidationError, deleteActivity, getActivity, importActivities, unpublishActivity } from "./activities";
import { publishedEventCards } from "./eventsPublic";
import {
  createEvent,
  deleteEvent,
  getEvent,
  getEventRevision,
  listEventRevisions,
  listEvents,
  publishEvent,
  restoreEventRevision,
  saveEvent,
  unpublishEvent,
} from "./events";

async function seeded(status: "verified" | "draft" = "verified") {
  const db = testDb();
  const list = status === "verified" ? activities : activities.map((x) => ({ ...structuredClone(x), status: "draft" as const, lastVerified: null, costs: { ...x.costs, pricesChecked: null } }));
  await importActivities(db, list);
  return db;
}

const market = (): EventItem => ({
  id: "e-test-night-market",
  name: "Test Night Market",
  blurb: "Street food stalls and lanterns along the harbour.",
  start: "2026-10-02",
  end: "2026-10-04",
  area: "Darling Harbour",
  venue: { name: "Tumbalong Park", lat: -33.8755, lng: 151.2009 },
  weatherFit: { sunny: 2, cloudy: 2, rainy: 0, hot: 1 },
  goodFor: ["friends", "date"],
  duration: { label: "2–3 hrs", minHours: 2, maxHours: 3 },
  cost: "$",
  suggestedStart: "18:00",
  link: { label: "Official page", url: "https://example.com/night-market" },
  checked: "2026-09-30",
});

const published = async (db: ReturnType<typeof testDb>, id: string) =>
  db.prepare("SELECT published_json, published_end, published_card, published_export FROM events WHERE id = ?").bind(id).first<Record<string, string | null>>();

describe("events in D1 (admin)", () => {
  it("creates an incomplete draft; saving keeps it a draft and reports what blocks publishing", async () => {
    const db = await seeded();
    const blank = { ...market(), blurb: "", checked: "" };
    await createEvent(db, blank, null);
    await expect(createEvent(db, blank, null)).rejects.toBeInstanceOf(ValidationError);
    await expect(createEvent(db, { ...blank, id: "night-market" }, null)).rejects.toMatchObject({ problems: [expect.stringMatching(/^id:/)] });
    await expect(createEvent(db, { ...blank, id: "e-nameless", name: " " }, null)).rejects.toMatchObject({ problems: [expect.stringMatching(/^name:/)] });

    const saved = await saveEvent(db, blank.id, { ...blank, blurb: "Better." }, 1, null);
    expect(saved.version).toBe(2);
    expect(saved.warnings).toEqual([expect.stringMatching(/^checked:/)]);
    await expect(publishEvent(db, blank.id, 2, null)).rejects.toMatchObject({ problems: [expect.stringMatching(/^checked:/)] });

    const [summary] = await listEvents(db);
    expect(summary).toMatchObject({ id: blank.id, name: "Test Night Market", start: "2026-10-02", end: "2026-10-04", version: 2, published: false, changed: false });
  });

  it("stops two editors overwriting each other, and an id can't change", async () => {
    const db = await seeded();
    await createEvent(db, market(), null);
    await saveEvent(db, "e-test-night-market", market(), 1, null);
    const stale = saveEvent(db, "e-test-night-market", market(), 1, null);
    await expect(stale).rejects.toBeInstanceOf(ConflictError);
    await expect(stale).rejects.toThrow(/Someone else changed this event/);
    await expect(publishEvent(db, "e-test-night-market", 1, null)).rejects.toBeInstanceOf(ConflictError);
    await expect(unpublishEvent(db, "e-test-night-market", 1, null)).rejects.toBeInstanceOf(ConflictError);
    await expect(saveEvent(db, "e-test-night-market", { ...market(), id: "e-other" }, 2, null)).rejects.toBeInstanceOf(ValidationError);
    await expect(saveEvent(db, "e-missing", { ...market(), id: "e-missing" }, 1, null)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("publishing writes the published event, end date, card and calendar export", async () => {
    const db = await seeded();
    await createEvent(db, market(), null);
    expect(await published(db, "e-test-night-market")).toMatchObject({ published_json: null, published_card: null });
    const { version } = await publishEvent(db, "e-test-night-market", 1, null);
    expect(version).toBe(2);
    const row = (await published(db, "e-test-night-market"))!;
    expect(JSON.parse(row.published_json!)).toEqual(market());
    expect(row.published_end).toBe("2026-10-04");
    const card = JSON.parse(row.published_card!) as EventCard;
    expect(card).toMatchObject({ kind: "event", id: "e-test-night-market", dates: { from: "2026-10-02", to: "2026-10-04" }, venue: "Tumbalong Park" });
    expect(JSON.parse(row.published_export!)).toMatchObject({ id: "e-test-night-market", url: "https://example.com/night-market" });
    expect((await listEvents(db))[0]).toMatchObject({ published: true, changed: false, publishedEnd: "2026-10-04" });

    // Saved changes stay off the site until published again.
    await saveEvent(db, "e-test-night-market", { ...market(), end: "2026-10-05" }, 2, null);
    expect((await published(db, "e-test-night-market"))!.published_end).toBe("2026-10-04");
    expect((await listEvents(db))[0].changed).toBe(true);
    await publishEvent(db, "e-test-night-market", 3, null);
    expect((await published(db, "e-test-night-market"))!.published_end).toBe("2026-10-05");
  });

  it("refuses to publish an invalid event or one linked to an unknown or unpublished activity", async () => {
    const db = await seeded("draft");
    await createEvent(db, { ...market(), start: "2026-10-05" }, null);
    await expect(publishEvent(db, "e-test-night-market", 1, null)).rejects.toMatchObject({ problems: ["end: end is before start"] });

    await saveEvent(db, "e-test-night-market", { ...market(), activityId: "nowhere" }, 1, null);
    await expect(publishEvent(db, "e-test-night-market", 2, null)).rejects.toMatchObject({ problems: [expect.stringMatching(/nowhere.*isn't a published activity/)] });

    const act = activities[0].id;
    await unpublishActivity(db, act, 1, null);
    const warned = await saveEvent(db, "e-test-night-market", { ...market(), activityId: act }, 2, null);
    expect(warned.warnings).toEqual([expect.stringMatching(/isn't a published activity/)]);
    await expect(publishEvent(db, "e-test-night-market", 3, null)).rejects.toBeInstanceOf(ValidationError);

    const other = activities[1].id;
    await saveEvent(db, "e-test-night-market", { ...market(), activityId: other }, 3, null);
    // On the live site the activity must also be verified (this test seeds drafts).
    await expect(publishEvent(db, "e-test-night-market", 4, null, "published")).rejects.toBeInstanceOf(ValidationError);
    await publishEvent(db, "e-test-night-market", 4, null, "preview");
    expect(JSON.parse((await published(db, "e-test-night-market"))!.published_card!).activityId).toBe(other);
  });

  it("keeps history, restores an old version as the draft, unpublishes and deletes", async () => {
    const db = await seeded();
    await createEvent(db, market(), null);
    await saveEvent(db, "e-test-night-market", { ...market(), blurb: "Second version." }, 1, null);
    await publishEvent(db, "e-test-night-market", 2, null);
    const revs = await listEventRevisions(db, "e-test-night-market");
    expect(revs.map((r) => r.action)).toEqual(["publish", "save", "create"]);
    expect((await getEventRevision(db, "e-test-night-market", revs[2].id)).blurb).toBe(market().blurb);
    await expect(getEventRevision(db, "e-other", revs[2].id)).rejects.toBeInstanceOf(NotFoundError);

    await restoreEventRevision(db, "e-test-night-market", revs[2].id, 3, null);
    const rec = await getEvent(db, "e-test-night-market");
    expect(rec.draft.blurb).toBe(market().blurb);
    expect(rec.published?.blurb).toBe("Second version.");
    expect((await listEventRevisions(db, "e-test-night-market"))[0].action).toBe("restore");

    await expect(deleteEvent(db, "e-test-night-market")).rejects.toBeInstanceOf(ValidationError);
    await unpublishEvent(db, "e-test-night-market", 4, null);
    expect(await published(db, "e-test-night-market")).toEqual({ published_json: null, published_end: null, published_card: null, published_export: null });
    expect((await listEventRevisions(db, "e-test-night-market"))[0].action).toBe("unpublish");
    await deleteEvent(db, "e-test-night-market");
    expect(await listEvents(db)).toEqual([]);
    expect(await listEventRevisions(db, "e-test-night-market")).toEqual([]);
    await expect(getEvent(db, "e-test-night-market")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("events and their linked activity (visitor side)", () => {
  it("drops the link while the activity is off the site, and stops the activity being deleted", async () => {
    const db = await seeded();
    const ev = { ...market(), activityId: "botanic" };
    await createEvent(db, ev, null);
    await publishEvent(db, ev.id, 1, null);
    expect((await publishedEventCards(db, "preview", ev.start))[0].activityId).toBe("botanic");
    await unpublishActivity(db, "botanic", (await getActivity(db, "botanic")).version, null);
    expect((await publishedEventCards(db, "preview", ev.start))[0].activityId).toBeUndefined();
    await expect(deleteActivity(db, "botanic")).rejects.toThrow(/Linked from events/);
  });
});
