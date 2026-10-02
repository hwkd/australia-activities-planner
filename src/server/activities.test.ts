import { describe, expect, it } from "vitest";
import { testDb } from "../../tests/unit/d1";
import { activities } from "../../tests/unit/cards";
import {
  ConflictError,
  ValidationError,
  createActivity,
  deleteActivity,
  getActivity,
  importActivities,
  listActivities,
  listRevisions,
  publishActivity,
  publishedActivity,
  publishedCards,
  publishedExportInfo,
  restoreRevision,
  saveActivity,
  unpublishActivity,
} from "./activities";

async function seeded() {
  const db = testDb();
  await importActivities(db, activities);
  return db;
}
// The same activities before review, for the rules that depend on status.
const drafts = activities.map((x) => ({ ...structuredClone(x), status: "draft" as const, lastVerified: null, costs: { ...x.costs, pricesChecked: null } }));
async function seededDrafts() {
  const db = testDb();
  await importActivities(db, drafts);
  return db;
}
const a = (id: string) => structuredClone(activities.find((x) => x.id === id)!);

describe("activities in D1", () => {
  it("imports the seed: every activity published, with cards and export info", async () => {
    const db = await seeded();
    expect((await publishedCards(db, "preview")).length).toBe(activities.length);
    expect((await publishedActivity(db, "agnsw", "preview"))?.name).toBe("Art Gallery of NSW");
    expect(Object.keys(await publishedExportInfo(db, "preview")).length).toBe(activities.length);
  });
  it("production mode serves only verified activities", async () => {
    const db = await seededDrafts();
    expect(await publishedCards(db, "published")).toEqual([]);
    expect(await publishedActivity(db, "agnsw", "published")).toBeNull();
    const live = await seeded();
    expect(activities.every((x) => x.status === "verified")).toBe(true);
    expect((await publishedCards(live, "published")).length).toBe(activities.length);
    expect((await publishedActivity(live, "agnsw", "published"))?.name).toBe("Art Gallery of NSW");
  });
  it("saving changes the draft only; publishing makes it public", async () => {
    const db = await seeded();
    const x = a("agnsw");
    x.blurb = "A new blurb for the gallery.";
    const { version } = await saveActivity(db, "agnsw", x, 1, null);
    expect(version).toBe(2);
    expect((await publishedActivity(db, "agnsw", "preview"))?.blurb).not.toBe(x.blurb);
    expect((await listActivities(db)).find((s) => s.id === "agnsw")?.changed).toBe(true);
    await publishActivity(db, "agnsw", 2, null, "preview");
    expect((await publishedActivity(db, "agnsw", "preview"))?.blurb).toBe(x.blurb);
    expect((await publishedCards(db, "preview")).find((c) => c.id === "agnsw")?.blurb).toBe(x.blurb);
    expect((await listActivities(db)).find((s) => s.id === "agnsw")?.changed).toBe(false);
  });
  it("stops two editors overwriting each other (optimistic locking)", async () => {
    const db = await seeded();
    await saveActivity(db, "agnsw", a("agnsw"), 1, null);
    await expect(saveActivity(db, "agnsw", a("agnsw"), 1, null)).rejects.toBeInstanceOf(ConflictError);
    await expect(publishActivity(db, "agnsw", 1, null, "preview")).rejects.toBeInstanceOf(ConflictError);
  });
  it("rejects invalid activities and id changes", async () => {
    const db = await seeded();
    const bad = { ...a("agnsw"), blurb: "" };
    await expect(saveActivity(db, "agnsw", bad, 1, null)).rejects.toMatchObject({ problems: [expect.stringMatching(/^blurb:/)] });
    await expect(saveActivity(db, "agnsw", { ...a("agnsw"), id: "agnsw-2" }, 1, null)).rejects.toBeInstanceOf(ValidationError);
  });
  it("publishing in production requires verified; cross-activity problems block publishing but not saving", async () => {
    const db = await seededDrafts();
    await expect(publishActivity(db, "agnsw", 1, null, "published")).rejects.toMatchObject({ problems: [expect.stringMatching(/only verified/)] });
    const x = structuredClone(drafts.find((d) => d.id === "agnsw")!);
    x.pairings[0].activityId = "does-not-exist";
    const saved = await saveActivity(db, "agnsw", x, 1, null);
    expect(saved.warnings.join()).toMatch(/does-not-exist/);
    await expect(publishActivity(db, "agnsw", 2, null, "preview")).rejects.toBeInstanceOf(ValidationError);
  });
  it("creates, keeps history, restores, unpublishes and deletes", async () => {
    const db = await seeded();
    const n = { ...a("agnsw"), id: "agnsw-copy", name: "Gallery copy", pairings: [] };
    await createActivity(db, n, null);
    await expect(createActivity(db, n, null)).rejects.toBeInstanceOf(ValidationError);
    await saveActivity(db, "agnsw-copy", { ...n, blurb: "Second version of the copy." }, 1, null);
    const revs = await listRevisions(db, "agnsw-copy");
    expect(revs.map((r) => r.action)).toEqual(["save", "create"]);
    await restoreRevision(db, "agnsw-copy", revs[1].id, 2, null);
    expect((await getActivity(db, "agnsw-copy")).draft.blurb).toBe(n.blurb);
    expect((await listRevisions(db, "agnsw-copy"))[0].action).toBe("restore");
    await publishActivity(db, "agnsw-copy", 3, null, "preview");
    await expect(deleteActivity(db, "agnsw-copy")).rejects.toBeInstanceOf(ValidationError);
    const un = await unpublishActivity(db, "agnsw-copy", 4, null);
    expect(un.pairedFrom).toEqual([]);
    await deleteActivity(db, "agnsw-copy");
    expect((await listActivities(db)).some((s) => s.id === "agnsw-copy")).toBe(false);
  });
  it("won't delete an activity others pair with; unpublish reports who pairs with it", async () => {
    const db = await seeded();
    const target = activities.find((x) => activities.some((o) => o.pairings.some((p) => p.activityId === x.id)))!;
    const un = await unpublishActivity(db, target.id, 1, null);
    expect(un.pairedFrom.length).toBeGreaterThan(0);
    await expect(deleteActivity(db, target.id)).rejects.toBeInstanceOf(ValidationError);
  });
});
