import { activitySchema, type Activity } from "~/content/schema";
import { checkActivities } from "~/lib/content-checks";
import { sameData } from "~/lib/sameData";
import { toCard, type CardData } from "~/lib/content";
import { exportInfo, type ExportInfo } from "~/lib/calendarExport";
import { nowIso, type Db } from "./db";

/**
 * Activities in D1 (tracker M11). Editors change `draft_json`; Publish copies a validated draft to
 * `published_json` (plus the derived card and export data the public pages read). Every change writes
 * a revision. Optimistic locking: a save or publish must quote the version it started from.
 */

/** "published": only published activities that are verified (production); "preview": drafts may be published. */
export type ContentMode = "published" | "preview";

export class ConflictError extends Error {
  constructor(public current: number) {
    super("Someone else changed this activity since you opened it. Reload to see their changes.");
  }
}
export class ValidationError extends Error {
  constructor(public problems: string[]) {
    super(problems.join("\n"));
  }
}
export class NotFoundError extends Error {}

// ---- Public reads (rendered pages) ----

const statusFilter = (mode: ContentMode) => (mode === "published" ? "AND published_status = 'verified'" : "");

/** Card data for every published activity, by name. */
export async function publishedCards(db: Db, mode: ContentMode): Promise<CardData[]> {
  const { results } = await db
    .prepare(`SELECT published_card FROM activities WHERE published_json IS NOT NULL ${statusFilter(mode)} ORDER BY name COLLATE NOCASE`)
    .all<{ published_card: string }>();
  return results.map((r) => JSON.parse(r.published_card) as CardData);
}

/** One published activity, or null. */
export async function publishedActivity(db: Db, id: string, mode: ContentMode): Promise<Activity | null> {
  const r = await db.prepare(`SELECT published_json FROM activities WHERE id = ? AND published_json IS NOT NULL ${statusFilter(mode)}`).bind(id).first<{ published_json: string }>();
  return r ? (JSON.parse(r.published_json) as Activity) : null;
}

/** The draft, for an admin's preview of unpublished changes. */
export async function draftActivity(db: Db, id: string): Promise<Activity | null> {
  const r = await db.prepare("SELECT draft_json FROM activities WHERE id = ?").bind(id).first<{ draft_json: string }>();
  return r ? (JSON.parse(r.draft_json) as Activity) : null;
}

/** Place and directions per published activity, for Add to your calendar. */
export async function publishedExportInfo(db: Db, mode: ContentMode): Promise<Record<string, ExportInfo>> {
  const { results } = await db
    .prepare(`SELECT id, published_export FROM activities WHERE published_json IS NOT NULL ${statusFilter(mode)}`)
    .all<{ id: string; published_export: string }>();
  return Object.fromEntries(results.map((r) => [r.id, JSON.parse(r.published_export) as ExportInfo]));
}

// ---- Admin ----

export interface ActivitySummary {
  id: string;
  name: string;
  area: string;
  category: string;
  status: "draft" | "verified";
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  publishedAt: string | null;
  /** Published, and the draft differs from what's live. */
  changed: boolean;
  published: boolean;
  /** The draft's `lastVerified` (YYYY-MM-DD), for the "Needs re-checking" flag (spec §5). */
  lastVerified: string | null;
}

export async function listActivities(db: Db): Promise<ActivitySummary[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.name, a.area, a.category, a.status, a.version, a.updated_at, a.published_at,
              a.published_json IS NOT NULL AS published,
              -- Both copies only where their text differs; whether the data differs is decided below.
              CASE WHEN a.published_json IS NOT NULL AND a.published_json <> a.draft_json THEN a.draft_json END AS draft_if_differs,
              CASE WHEN a.published_json IS NOT NULL AND a.published_json <> a.draft_json THEN a.published_json END AS published_if_differs,
              u.name AS updated_by, json_extract(a.draft_json, '$.lastVerified') AS last_verified
       FROM activities a LEFT JOIN users u ON u.id = a.updated_by ORDER BY a.name COLLATE NOCASE`
    )
    .all<Record<string, unknown>>();
  return results.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    area: r.area as string,
    category: r.category as string,
    status: r.status as "draft" | "verified",
    version: Number(r.version),
    updatedAt: r.updated_at as string,
    updatedBy: (r.updated_by as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
    published: Boolean(r.published),
    // Text that differs only in key order (e.g. after migration 0004, then a save) isn't a change.
    changed: r.draft_if_differs != null && !sameData(JSON.parse(r.draft_if_differs as string), JSON.parse(r.published_if_differs as string)),
    lastVerified: (r.last_verified as string) ?? null,
  }));
}

export interface ActivityRecord {
  draft: Activity;
  published: Activity | null;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
}

export async function getActivity(db: Db, id: string): Promise<ActivityRecord> {
  const r = await db.prepare("SELECT draft_json, published_json, version, updated_at, published_at FROM activities WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!r) throw new NotFoundError(`No activity "${id}".`);
  return {
    draft: JSON.parse(r.draft_json as string),
    published: r.published_json ? JSON.parse(r.published_json as string) : null,
    version: Number(r.version),
    updatedAt: r.updated_at as string,
    publishedAt: (r.published_at as string) ?? null,
  };
}

/** Schema problems as "field.path: message". */
export function schemaProblems(input: unknown): { activity: Activity | null; problems: string[] } {
  const r = activitySchema.safeParse(input);
  if (r.success) return { activity: r.data, problems: [] };
  return { activity: null, problems: r.error.issues.map((i) => `${i.path.join(".") || "activity"}: ${i.message}`) };
}

/** Checks across activities (pairings, map references…) for `a` among every other draft. */
async function crossProblems(db: Db, a: Activity): Promise<string[]> {
  const { results } = await db.prepare("SELECT id, draft_json FROM activities WHERE id <> ?").bind(a.id).all<{ id: string; draft_json: string }>();
  const others = results.map((r) => JSON.parse(r.draft_json) as Activity);
  return checkActivities([a, ...others]).filter((p) => p.startsWith(`${a.id}:`));
}

const columns = (a: Activity) => [a.name, a.area, a.category, a.status];

export async function createActivity(db: Db, input: unknown, userId: number | null): Promise<Activity> {
  const { activity, problems } = schemaProblems(input);
  if (!activity) throw new ValidationError(problems);
  if (await db.prepare("SELECT 1 FROM activities WHERE id = ?").bind(activity.id).first()) throw new ValidationError([`id: "${activity.id}" is already used`]);
  const json = JSON.stringify(activity);
  await db.batch([
    db.prepare("INSERT INTO activities (id, name, area, category, status, draft_json, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(activity.id, ...columns(activity), json, userId),
    db.prepare("INSERT INTO revisions (activity_id, version, action, json, user_id) VALUES (?, 1, 'create', ?, ?)").bind(activity.id, json, userId),
  ]);
  return activity;
}

/** Saves a draft. Returns the new version and any cross-activity problems (which only block publishing). */
export async function saveActivity(db: Db, id: string, input: unknown, expectedVersion: number, userId: number | null): Promise<{ version: number; warnings: string[] }> {
  const { activity, problems } = schemaProblems(input);
  if (!activity) throw new ValidationError(problems);
  if (activity.id !== id) throw new ValidationError(["id: an activity's id can't change (links, plans and pairings use it)"]);
  const json = JSON.stringify(activity);
  const next = expectedVersion + 1;
  const res = await db
    .prepare("UPDATE activities SET name = ?, area = ?, category = ?, status = ?, draft_json = ?, version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?")
    .bind(...columns(activity), json, next, nowIso(), userId, id, expectedVersion)
    .run();
  if (!res.meta.changes) {
    const cur = await db.prepare("SELECT version FROM activities WHERE id = ?").bind(id).first<{ version: number }>();
    if (!cur) throw new NotFoundError(`No activity "${id}".`);
    throw new ConflictError(Number(cur.version));
  }
  await db.prepare("INSERT INTO revisions (activity_id, version, action, json, user_id) VALUES (?, ?, 'save', ?, ?)").bind(id, next, json, userId).run();
  return { version: next, warnings: await crossProblems(db, activity) };
}

/**
 * Publishes the current draft. Blocks on schema or cross-activity problems, and in "published" mode
 * (production) on anything not verified (spec §4.3: no drafts in production).
 */
export async function publishActivity(db: Db, id: string, expectedVersion: number, userId: number | null, mode: ContentMode): Promise<{ version: number }> {
  const rec = await getActivity(db, id);
  if (rec.version !== expectedVersion) throw new ConflictError(rec.version);
  const { activity, problems } = schemaProblems(rec.draft);
  if (!activity) throw new ValidationError(problems);
  const cross = await crossProblems(db, activity);
  const gate = mode === "published" && activity.status !== "verified" ? ["status: only verified activities can be published on the live site"] : [];
  if (cross.length || gate.length) throw new ValidationError([...gate, ...cross]);
  const json = JSON.stringify(activity);
  const next = expectedVersion + 1;
  const res = await db
    .prepare(
      "UPDATE activities SET published_json = ?, published_status = ?, published_card = ?, published_export = ?, published_at = ?, published_by = ?, version = ? WHERE id = ? AND version = ?"
    )
    .bind(json, activity.status, JSON.stringify(toCard(activity)), JSON.stringify(exportInfo(activity)), nowIso(), userId, next, id, expectedVersion)
    .run();
  if (!res.meta.changes) throw new ConflictError(expectedVersion);
  await db.prepare("INSERT INTO revisions (activity_id, version, action, json, user_id) VALUES (?, ?, 'publish', ?, ?)").bind(id, next, json, userId).run();
  return { version: next };
}

/** Takes an activity off the public site; returns other published activities whose pairings point to it. */
export async function unpublishActivity(db: Db, id: string, expectedVersion: number, userId: number | null): Promise<{ version: number; pairedFrom: string[] }> {
  const rec = await getActivity(db, id);
  if (rec.version !== expectedVersion) throw new ConflictError(rec.version);
  const next = expectedVersion + 1;
  await db
    .prepare("UPDATE activities SET published_json = NULL, published_status = NULL, published_card = NULL, published_export = NULL, published_at = NULL, published_by = NULL, version = ? WHERE id = ? AND version = ?")
    .bind(next, id, expectedVersion)
    .run();
  await db.prepare("INSERT INTO revisions (activity_id, version, action, json, user_id) VALUES (?, ?, 'unpublish', ?, ?)").bind(id, next, JSON.stringify(rec.draft), userId).run();
  const { results } = await db.prepare("SELECT id, published_json FROM activities WHERE published_json IS NOT NULL").all<{ id: string; published_json: string }>();
  const pairedFrom = results.filter((r) => (JSON.parse(r.published_json) as Activity).pairings.some((p) => p.activityId === id)).map((r) => r.id);
  return { version: next, pairedFrom };
}

export interface RevisionSummary {
  id: number;
  version: number;
  action: string;
  user: string | null;
  createdAt: string;
}
export async function listRevisions(db: Db, id: string, limit = 50): Promise<RevisionSummary[]> {
  const { results } = await db
    .prepare("SELECT r.id, r.version, r.action, r.created_at, u.name AS user FROM revisions r LEFT JOIN users u ON u.id = r.user_id WHERE r.activity_id = ? ORDER BY r.id DESC LIMIT ?")
    .bind(id, limit)
    .all<Record<string, unknown>>();
  return results.map((r) => ({ id: Number(r.id), version: Number(r.version), action: r.action as string, user: (r.user as string) ?? null, createdAt: r.created_at as string }));
}
export async function getRevision(db: Db, id: string, revisionId: number): Promise<Activity> {
  const r = await db.prepare("SELECT json FROM revisions WHERE id = ? AND activity_id = ?").bind(revisionId, id).first<{ json: string }>();
  if (!r) throw new NotFoundError("No such revision.");
  return JSON.parse(r.json);
}

/** Puts an old version back as the draft (publish separately). */
export async function restoreRevision(db: Db, id: string, revisionId: number, expectedVersion: number, userId: number | null): Promise<{ version: number }> {
  const old = await getRevision(db, id, revisionId);
  const { version } = await saveActivity(db, id, old, expectedVersion, userId);
  await db.prepare("UPDATE revisions SET action = 'restore' WHERE activity_id = ? AND version = ?").bind(id, version).run();
  return { version };
}

/** Deletes an activity that was never published and that nothing pairs with. */
export async function deleteActivity(db: Db, id: string): Promise<void> {
  const rec = await getActivity(db, id);
  if (rec.published) throw new ValidationError(["Unpublish it first: it's on the public site."]);
  const { results } = await db.prepare("SELECT id, draft_json FROM activities WHERE id <> ?").bind(id).all<{ id: string; draft_json: string }>();
  const from = results.filter((r) => (JSON.parse(r.draft_json) as Activity).pairings.some((p) => p.activityId === id)).map((r) => r.id);
  const { results: linked } = await db.prepare("SELECT id FROM events WHERE json_extract(draft_json, '$.activityId') = ?").bind(id).all<{ id: string }>();
  const problems = [
    ...(from.length ? [`Paired with by: ${from.join(", ")}. Change those pairings first.`] : []),
    ...(linked.length ? [`Linked from events: ${linked.map((e) => e.id).join(", ")}. Change those events first.`] : []),
  ];
  if (problems.length) throw new ValidationError(problems);
  await db.batch([db.prepare("DELETE FROM revisions WHERE activity_id = ?").bind(id), db.prepare("DELETE FROM activities WHERE id = ?").bind(id)]);
}

/** Loads seed activities (fresh database or tests): draft and published, with an 'import' revision. */
export async function importActivities(db: Db, list: Activity[]): Promise<void> {
  const stmts = list.flatMap((a) => {
    const json = JSON.stringify(a);
    return [
      db
        .prepare(
          "INSERT INTO activities (id, name, area, category, status, draft_json, published_json, published_status, published_card, published_export, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(a.id, ...columns(a), json, json, a.status, JSON.stringify(toCard(a)), JSON.stringify(exportInfo(a)), nowIso()),
      db.prepare("INSERT INTO revisions (activity_id, version, action, json) VALUES (?, 1, 'import', ?)").bind(a.id, json),
    ];
  });
  await db.batch(stmts);
}
