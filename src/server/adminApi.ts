import { UserError, type Db } from "./db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  createActivity,
  deleteActivity,
  getActivity,
  getRevision,
  listActivities,
  listRevisions,
  publishActivity,
  restoreRevision,
  saveActivity,
  unpublishActivity,
  type ContentMode,
} from "./activities";
import { createEvent, deleteEvent, getEvent, getEventRevision, listEventRevisions, listEvents, publishEvent, restoreEventRevision, saveEvent, unpublishEvent } from "./events";
import {
  changePassword,
  clearedCookie,
  createInvite,
  inviteInfo,
  listUsers,
  login,
  logout,
  readCookie,
  sessionCookie,
  sessionUser,
  updateUser,
  redeemInvite,
  type Role,
  type User,
} from "./auth";

/**
 * The admin API (`/api/admin/*`, tracker M11). JSON in, JSON out. Every route except sign-in and
 * invite links needs a session; user management and deleting (activities and events) need the owner role. Requests that
 * change anything must come from the site's own origin (CSRF), on top of the SameSite=Strict cookie.
 */
export interface AdminContext {
  db: Db;
  mode: ContentMode;
  /** The site's origin, e.g. https://example.com (from the request URL). */
  origin: string;
  /** Client IP for rate limiting. */
  ip: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ValidationError(["The request body isn't valid JSON."]);
  }
}

type Handler = (p: { req: Request; ctx: AdminContext; user: User | null; params: string[]; token?: string }) => Promise<Response>;
interface Route {
  method: string;
  pattern: RegExp;
  auth: "none" | "user" | "owner";
  run: Handler;
}

const routes: Route[] = [
  // ---- Session ----
  {
    method: "POST",
    pattern: /^login$/,
    auth: "none",
    run: async ({ req, ctx }) => {
      const b = await body<{ email?: string; password?: string }>(req);
      const r = await login(ctx.db, String(b.email ?? ""), String(b.password ?? ""), ctx.ip);
      if (!r.ok) return fail(r.status, r.error);
      return json({ user: r.user }, 200, { "Set-Cookie": sessionCookie(r.token, ctx.origin.startsWith("https:")) });
    },
  },
  {
    method: "POST",
    pattern: /^logout$/,
    auth: "none",
    run: async ({ ctx, token }) => {
      await logout(ctx.db, token);
      return json({ ok: true }, 200, { "Set-Cookie": clearedCookie(ctx.origin.startsWith("https:")) });
    },
  },
  { method: "GET", pattern: /^me$/, auth: "user", run: async ({ user, ctx }) => json({ user, mode: ctx.mode }) },
  {
    method: "POST",
    pattern: /^password$/,
    auth: "user",
    run: async ({ req, ctx, user, token }) => {
      const b = await body<{ current?: string; next?: string }>(req);
      await changePassword(ctx.db, user!.id, String(b.current ?? ""), String(b.next ?? ""), token);
      return json({ ok: true });
    },
  },
  // ---- Invite and reset links ----
  {
    method: "GET",
    pattern: /^invite\/([A-Za-z0-9_-]{20,100})$/,
    auth: "none",
    run: async ({ ctx, params }) => {
      const info = await inviteInfo(ctx.db, params[0]);
      return info ? json(info) : fail(404, "This link has expired or was already used. Ask for a new one.");
    },
  },
  {
    method: "POST",
    pattern: /^invite\/([A-Za-z0-9_-]{20,100})$/,
    auth: "none",
    run: async ({ req, ctx, params }) => {
      const b = await body<{ name?: string; password?: string }>(req);
      const u = await redeemInvite(ctx.db, params[0], String(b.name ?? ""), String(b.password ?? ""));
      return json({ user: u });
    },
  },
  // ---- Activities ----
  { method: "GET", pattern: /^activities$/, auth: "user", run: async ({ ctx }) => json({ activities: await listActivities(ctx.db), mode: ctx.mode }) },
  {
    method: "POST",
    pattern: /^activities$/,
    auth: "user",
    run: async ({ req, ctx, user }) => {
      const b = await body<{ activity?: unknown }>(req);
      const a = await createActivity(ctx.db, b.activity, user!.id);
      return json({ id: a.id, version: 1 }, 201);
    },
  },
  { method: "GET", pattern: /^activities\/([a-z0-9-]+)$/, auth: "user", run: async ({ ctx, params }) => json(await getActivity(ctx.db, params[0])) },
  {
    method: "PUT",
    pattern: /^activities\/([a-z0-9-]+)$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ activity?: unknown; version?: number }>(req);
      return json(await saveActivity(ctx.db, params[0], b.activity, Number(b.version), user!.id));
    },
  },
  {
    method: "DELETE",
    pattern: /^activities\/([a-z0-9-]+)$/,
    auth: "owner",
    run: async ({ ctx, params }) => {
      await deleteActivity(ctx.db, params[0]);
      return json({ ok: true });
    },
  },
  {
    method: "POST",
    pattern: /^activities\/([a-z0-9-]+)\/publish$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ version?: number }>(req);
      return json(await publishActivity(ctx.db, params[0], Number(b.version), user!.id, ctx.mode));
    },
  },
  {
    method: "POST",
    pattern: /^activities\/([a-z0-9-]+)\/unpublish$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ version?: number }>(req);
      return json(await unpublishActivity(ctx.db, params[0], Number(b.version), user!.id));
    },
  },
  { method: "GET", pattern: /^activities\/([a-z0-9-]+)\/revisions$/, auth: "user", run: async ({ ctx, params }) => json({ revisions: await listRevisions(ctx.db, params[0]) }) },
  { method: "GET", pattern: /^activities\/([a-z0-9-]+)\/revisions\/(\d+)$/, auth: "user", run: async ({ ctx, params }) => json({ activity: await getRevision(ctx.db, params[0], Number(params[1])) }) },
  {
    method: "POST",
    pattern: /^activities\/([a-z0-9-]+)\/revisions\/(\d+)\/restore$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ version?: number }>(req);
      return json(await restoreRevision(ctx.db, params[0], Number(params[1]), Number(b.version), user!.id));
    },
  },
  // ---- Events (spec §11.4) ----
  { method: "GET", pattern: /^events$/, auth: "user", run: async ({ ctx }) => json({ events: await listEvents(ctx.db) }) },
  {
    method: "POST",
    pattern: /^events$/,
    auth: "user",
    run: async ({ req, ctx, user }) => {
      const b = await body<{ event?: unknown }>(req);
      const e = await createEvent(ctx.db, b.event, user!.id);
      return json({ id: e.id, version: 1 }, 201);
    },
  },
  { method: "GET", pattern: /^events\/(e-[a-z0-9-]+)$/, auth: "user", run: async ({ ctx, params }) => json(await getEvent(ctx.db, params[0])) },
  {
    method: "PUT",
    pattern: /^events\/(e-[a-z0-9-]+)$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ event?: unknown; version?: number }>(req);
      return json(await saveEvent(ctx.db, params[0], b.event, Number(b.version), user!.id, ctx.mode));
    },
  },
  {
    method: "DELETE",
    pattern: /^events\/(e-[a-z0-9-]+)$/,
    auth: "owner",
    run: async ({ ctx, params }) => {
      await deleteEvent(ctx.db, params[0]);
      return json({ ok: true });
    },
  },
  {
    method: "POST",
    pattern: /^events\/(e-[a-z0-9-]+)\/publish$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ version?: number }>(req);
      return json(await publishEvent(ctx.db, params[0], Number(b.version), user!.id, ctx.mode));
    },
  },
  {
    method: "POST",
    pattern: /^events\/(e-[a-z0-9-]+)\/unpublish$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ version?: number }>(req);
      return json(await unpublishEvent(ctx.db, params[0], Number(b.version), user!.id));
    },
  },
  { method: "GET", pattern: /^events\/(e-[a-z0-9-]+)\/revisions$/, auth: "user", run: async ({ ctx, params }) => json({ revisions: await listEventRevisions(ctx.db, params[0]) }) },
  { method: "GET", pattern: /^events\/(e-[a-z0-9-]+)\/revisions\/(\d+)$/, auth: "user", run: async ({ ctx, params }) => json({ event: await getEventRevision(ctx.db, params[0], Number(params[1])) }) },
  {
    method: "POST",
    pattern: /^events\/(e-[a-z0-9-]+)\/restore$/,
    auth: "user",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ revision?: number; version?: number }>(req);
      if (!Number.isInteger(b.revision)) throw new ValidationError(["revision: which version to restore is missing."]);
      return json(await restoreEventRevision(ctx.db, params[0], Number(b.revision), Number(b.version), user!.id));
    },
  },
  // ---- Users (owner) ----
  { method: "GET", pattern: /^users$/, auth: "owner", run: async ({ ctx }) => json({ users: await listUsers(ctx.db) }) },
  {
    method: "POST",
    pattern: /^users\/invite$/,
    auth: "owner",
    run: async ({ req, ctx, user }) => {
      const b = await body<{ email?: string; role?: Role }>(req);
      const role: Role = b.role === "owner" ? "owner" : "editor";
      const token = await createInvite(ctx.db, "invite", String(b.email ?? ""), role, user!.id);
      return json({ link: `${ctx.origin}/admin/invite/${token}` }, 201);
    },
  },
  {
    method: "POST",
    pattern: /^users\/reset$/,
    auth: "owner",
    run: async ({ req, ctx, user }) => {
      const b = await body<{ email?: string }>(req);
      const token = await createInvite(ctx.db, "reset", String(b.email ?? ""), null, user!.id);
      return json({ link: `${ctx.origin}/admin/invite/${token}` }, 201);
    },
  },
  {
    method: "PATCH",
    pattern: /^users\/(\d+)$/,
    auth: "owner",
    run: async ({ req, ctx, user, params }) => {
      const b = await body<{ role?: Role; disabled?: boolean }>(req);
      if (Number(params[0]) === user!.id && b.disabled) return fail(400, "You can't disable your own account.");
      await updateUser(ctx.db, Number(params[0]), { role: b.role === "owner" || b.role === "editor" ? b.role : undefined, disabled: typeof b.disabled === "boolean" ? b.disabled : undefined });
      return json({ ok: true });
    },
  },
];

/** Handles `/api/admin/<path>`. */
export async function handleAdmin(req: Request, path: string, ctx: AdminContext): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    // CSRF: changes must come from our own pages.
    const origin = req.headers.get("Origin");
    if (origin !== ctx.origin) return fail(403, "Cross-site request refused.");
  }
  const candidates = routes.filter((r) => r.pattern.test(path));
  const route = candidates.find((r) => r.method === method);
  if (!route) return candidates.length ? fail(405, "Method not allowed.") : fail(404, "Not found.");
  const params = path.match(route.pattern)!.slice(1);
  const token = readCookie(req.headers.get("Cookie"));
  const user = route.auth === "none" ? null : await sessionUser(ctx.db, token);
  if (route.auth !== "none" && !user) return fail(401, "Please sign in.");
  if (route.auth === "owner" && user!.role !== "owner") return fail(403, "Only an owner can do that.");
  try {
    return await route.run({ req, ctx, user, params, token });
  } catch (e) {
    if (e instanceof ValidationError) return fail(422, "Please fix these problems first.", { problems: e.problems });
    if (e instanceof ConflictError) return fail(409, e.message, { version: e.current });
    if (e instanceof NotFoundError) return fail(404, e.message);
    if (e instanceof UserError) return fail(400, e.message);
    console.error("admin api", method, path, e);
    return fail(500, "Something went wrong on our side. Try again.");
  }
}
