import { z } from "astro/zod";
import { eventSchema, type EventItem } from "~/content/eventSchema";
import { eventExportInfo, toEventCard } from "~/lib/events";
import { ConflictError, NotFoundError, ValidationError, type ContentMode, type RevisionSummary } from "./activities";
import { nowIso, type Db } from "./db";

/**
 * Events in D1 (spec §11.4, tracker M15): the admin side. Same flow as activities (src/server/activities.ts):
 * editors change `draft_json`; Publish copies a validated draft to `published_json` with the card and
 * export data visitors read (src/server/eventsPublic.ts). Every change writes a revision to
 * `event_revisions`, and saves and publishes quote the version they started from.
 *
 * Unlike activities, a draft event may be incomplete (editors fill it in from the official page over
 * several saves): saving only needs a valid id and a name; the full schema is checked on publish.
 * There's no content-status gate: publishing means an editor checked it (`checked` is required).
 */

/** An event conflict, with the event's own wording (still a ConflictError for the API's 409). */
export class EventConflictError extends ConflictError {
  constructor(current: number) {
    super(current);
    this.message = "Someone else changed this event since you opened it. Reload to see their changes.";
  }
}

/** What a draft needs to be saved: the rest is checked on publish. */
const draftSchema = z
  .object({
    id: z.string().regex(/^e-[a-z0-9]+(-[a-z0-9]+)*$/, "id must start with e- and be kebab-case"),
    name: z.string().trim().min(1, "name is required").max(80),
    start: z.string(),
    end: z.string(),
  })
  .loose();
type EventDraft = z.infer<typeof draftSchema>;

const problemsOf = (issues: readonly { path: PropertyKey[]; message: string }[]) => issues.map((i) => `${i.path.map(String).join(".") || "event"}: ${i.message}`);

/** Schema problems as "field.path: message" (what would block publishing). */
export function eventProblems(input: unknown): { event: EventItem | null; problems: string[] } {
  const r = eventSchema.safeParse(input);
  return r.success ? { event: r.data, problems: [] } : { event: null, problems: problemsOf(r.error.issues) };
}

function parseDraft(input: unknown): EventDraft {
  const r = draftSchema.safeParse(input);
  if (!r.success) throw new ValidationError(problemsOf(r.error.issues));
  // A complete draft is stored as the schema normalises it; an incomplete one as the editor left it.
  const full = eventSchema.safeParse(r.data);
  return full.success ? full.data : r.data;
}

/** The linked activity must be on the site (verified, on the live site) for the event to link to it. */
async function activityProblems(db: Db, activityId: unknown, mode: ContentMode): Promise<string[]> {
  if (activityId === undefined || activityId === null || activityId === "") return [];
  const verified = mode === "published" ? "AND published_status = 'verified'" : "";
  const ok = await db.prepare(`SELECT 1 FROM activities WHERE id = ? AND published_json IS NOT NULL ${verified}`).bind(String(activityId)).first();
  return ok ? [] : [`activityId: "${String(activityId)}" isn't a published activity`];
}

export interface EventSummary {
  id: string;
  name: string;
  /** The draft's dates (YYYY-MM-DD, may be empty while it's being written). */
  start: string;
  end: string;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  publishedAt: string | null;
  /** The published end date: after it, the event is off the site. */
  publishedEnd: string | null;
  published: boolean;
  /** Published, and the draft differs from what's live. */
  changed: boolean;
}

export async function listEvents(db: Db): Promise<EventSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT e.id, e.name, e.start_date, e.end_date, e.version, e.updated_at, e.published_at, e.published_end,
              e.published_json IS NOT NULL AS published,
              (e.published_json IS NOT NULL AND e.published_json <> e.draft_json) AS changed,
              u.name AS updated_by
       FROM events e LEFT JOIN users u ON u.id = e.updated_by ORDER BY e.start_date DESC, e.name COLLATE NOCASE`
    )
    .all<Record<string, unknown>>();
  return results.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    start: r.start_date as string,
    end: r.end_date as string,
    version: Number(r.version),
    updatedAt: r.updated_at as string,
    updatedBy: (r.updated_by as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
    publishedEnd: (r.published_end as string) ?? null,
    published: Boolean(r.published),
    changed: Boolean(r.changed),
  }));
}

export interface EventRecord {
  /** May be incomplete: see eventProblems. */
  draft: EventItem;
  published: EventItem | null;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
}

export async function getEvent(db: Db, id: string): Promise<EventRecord> {
  const r = await db.prepare("SELECT draft_json, published_json, version, updated_at, published_at FROM events WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!r) throw new NotFoundError(`No event "${id}".`);
  return {
    draft: JSON.parse(r.draft_json as string),
    published: r.published_json ? JSON.parse(r.published_json as string) : null,
    version: Number(r.version),
    updatedAt: r.updated_at as string,
    publishedAt: (r.published_at as string) ?? null,
  };
}

export async function createEvent(db: Db, input: unknown, userId: number | null): Promise<EventDraft> {
  const e = parseDraft(input);
  if (await db.prepare("SELECT 1 FROM events WHERE id = ?").bind(e.id).first()) throw new ValidationError([`id: "${e.id}" is already used`]);
  const json = JSON.stringify(e);
  await db.batch([
    db.prepare("INSERT INTO events (id, name, start_date, end_date, draft_json, updated_by) VALUES (?, ?, ?, ?, ?, ?)").bind(e.id, e.name, e.start, e.end, json, userId),
    db.prepare("INSERT INTO event_revisions (event_id, version, action, json, user_id) VALUES (?, 1, 'create', ?, ?)").bind(e.id, json, userId),
  ]);
  return e;
}

/** Saves a draft. Returns the new version and what still blocks publishing (warnings, not errors). */
export async function saveEvent(
  db: Db,
  id: string,
  input: unknown,
  expectedVersion: number,
  userId: number | null,
  mode: ContentMode = "preview"
): Promise<{ version: number; warnings: string[] }> {
  const e = parseDraft(input);
  if (e.id !== id) throw new ValidationError(["id: an event's id can't change (plans and share links use it)"]);
  const json = JSON.stringify(e);
  const next = expectedVersion + 1;
  const res = await db
    .prepare("UPDATE events SET name = ?, start_date = ?, end_date = ?, draft_json = ?, version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?")
    .bind(e.name, e.start, e.end, json, next, nowIso(), userId, id, expectedVersion)
    .run();
  if (!res.meta.changes) {
    const cur = await db.prepare("SELECT version FROM events WHERE id = ?").bind(id).first<{ version: number }>();
    if (!cur) throw new NotFoundError(`No event "${id}".`);
    throw new EventConflictError(Number(cur.version));
  }
  await db.prepare("INSERT INTO event_revisions (event_id, version, action, json, user_id) VALUES (?, ?, 'save', ?, ?)").bind(id, next, json, userId).run();
  return { version: next, warnings: [...eventProblems(e).problems, ...(await activityProblems(db, e.activityId, mode))] };
}

/**
 * Publishes the current draft: it must pass the schema, and a linked activity must be published
 * (and verified, on the live site).
 */
export async function publishEvent(db: Db, id: string, expectedVersion: number, userId: number | null, mode: ContentMode = "preview"): Promise<{ version: number }> {
  const rec = await getEvent(db, id);
  if (rec.version !== expectedVersion) throw new EventConflictError(rec.version);
  const { event, problems } = eventProblems(rec.draft);
  if (!event) throw new ValidationError(problems);
  const linked = await activityProblems(db, event.activityId, mode);
  if (linked.length) throw new ValidationError(linked);
  const json = JSON.stringify(event);
  const next = expectedVersion + 1;
  const res = await db
    .prepare(
      "UPDATE events SET published_json = ?, published_end = ?, published_card = ?, published_export = ?, published_at = ?, published_by = ?, version = ? WHERE id = ? AND version = ?"
    )
    .bind(json, event.end, JSON.stringify(toEventCard(event)), JSON.stringify(eventExportInfo(event)), nowIso(), userId, next, id, expectedVersion)
    .run();
  if (!res.meta.changes) throw new EventConflictError(expectedVersion);
  await db.prepare("INSERT INTO event_revisions (event_id, version, action, json, user_id) VALUES (?, ?, 'publish', ?, ?)").bind(id, next, json, userId).run();
  return { version: next };
}

/** Takes an event off the public site (plans that include it show it as unavailable). */
export async function unpublishEvent(db: Db, id: string, expectedVersion: number, userId: number | null): Promise<{ version: number }> {
  const rec = await getEvent(db, id);
  if (rec.version !== expectedVersion) throw new EventConflictError(rec.version);
  const next = expectedVersion + 1;
  const res = await db
    .prepare(
      "UPDATE events SET published_json = NULL, published_end = NULL, published_card = NULL, published_export = NULL, published_at = NULL, published_by = NULL, version = ? WHERE id = ? AND version = ?"
    )
    .bind(next, id, expectedVersion)
    .run();
  if (!res.meta.changes) throw new EventConflictError(expectedVersion);
  await db.prepare("INSERT INTO event_revisions (event_id, version, action, json, user_id) VALUES (?, ?, 'unpublish', ?, ?)").bind(id, next, JSON.stringify(rec.draft), userId).run();
  return { version: next };
}

export async function listEventRevisions(db: Db, id: string, limit = 50): Promise<RevisionSummary[]> {
  const { results } = await db
    .prepare("SELECT r.id, r.version, r.action, r.created_at, u.name AS user FROM event_revisions r LEFT JOIN users u ON u.id = r.user_id WHERE r.event_id = ? ORDER BY r.id DESC LIMIT ?")
    .bind(id, limit)
    .all<Record<string, unknown>>();
  return results.map((r) => ({ id: Number(r.id), version: Number(r.version), action: r.action as string, user: (r.user as string) ?? null, createdAt: r.created_at as string }));
}

export async function getEventRevision(db: Db, id: string, revisionId: number): Promise<EventItem> {
  const r = await db.prepare("SELECT json FROM event_revisions WHERE id = ? AND event_id = ?").bind(revisionId, id).first<{ json: string }>();
  if (!r) throw new NotFoundError("No such revision.");
  return JSON.parse(r.json);
}

/** Puts an old version back as the draft (publish separately). */
export async function restoreEventRevision(db: Db, id: string, revisionId: number, expectedVersion: number, userId: number | null): Promise<{ version: number }> {
  const old = await getEventRevision(db, id, revisionId);
  const { version } = await saveEvent(db, id, old, expectedVersion, userId);
  await db.prepare("UPDATE event_revisions SET action = 'restore' WHERE event_id = ? AND version = ?").bind(id, version).run();
  return { version };
}

/** Deletes an event that isn't on the site, with its history. */
export async function deleteEvent(db: Db, id: string): Promise<void> {
  const rec = await getEvent(db, id);
  if (rec.published) throw new ValidationError(["Unpublish it first: it's on the public site."]);
  await db.batch([db.prepare("DELETE FROM event_revisions WHERE event_id = ?").bind(id), db.prepare("DELETE FROM events WHERE id = ?").bind(id)]);
}
