import { nowIso, UserError, type Db } from "./db";

/**
 * Admin accounts, sessions, invitations and sign-in rate limiting (tracker M11). WebCrypto only, so the
 * same code runs on Workers and in Node tests.
 *
 * - Passwords: PBKDF2-SHA256, 100,000 iterations (the Workers maximum), 16-byte salt, 32-byte key.
 * - Sessions: a random 32-byte token in an HttpOnly, Secure, SameSite=Strict cookie; only its SHA-256
 *   is stored. 7 days, not extended.
 * - Invites and password resets: one-time links; only the token's SHA-256 is stored.
 * - Rate limits: 5 failed sign-ins per email or 20 per IP in 15 minutes.
 */

export type Role = "owner" | "editor";
export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export const SESSION_COOKIE = "swf_admin";
export const SESSION_DAYS = 7;
export const MIN_PASSWORD = 12;
const ITERATIONS = 100_000;
const WINDOW_MIN = 15;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (b: Uint8Array) => b64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
export async function sha256(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return [...d].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
}
/** Constant-time comparison of the derived key. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, iter, salt, hash] = stored.split("$");
  if (alg !== "pbkdf2-sha256" || !iter || !salt || !hash) return false;
  const got = await pbkdf2(password, unb64(salt), Number(iter));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}
/** A real hash of nothing in particular, so unknown emails take as long as wrong passwords. */
const DUMMY_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export function passwordProblem(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 200) return "That password is too long.";
  return null;
}
export const normalEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ---- Users ----

export async function createUser(db: Db, email: string, name: string, role: Role, password: string): Promise<User> {
  const p = passwordProblem(password);
  if (p) throw new UserError(p);
  if (!validEmail(normalEmail(email))) throw new UserError("That email address doesn't look right.");
  const res = await db
    .prepare("INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)")
    .bind(normalEmail(email), name.trim(), role, await hashPassword(password))
    .run();
  return { id: res.meta.last_row_id, email: normalEmail(email), name: name.trim(), role };
}

export async function listUsers(db: Db) {
  const { results } = await db.prepare("SELECT id, email, name, role, disabled, created_at, last_login_at FROM users ORDER BY name COLLATE NOCASE").all<Record<string, unknown>>();
  return results.map((u) => ({ id: Number(u.id), email: u.email as string, name: u.name as string, role: u.role as Role, disabled: Boolean(u.disabled), createdAt: u.created_at as string, lastLoginAt: (u.last_login_at as string) ?? null }));
}

async function activeOwners(db: Db): Promise<number> {
  return Number((await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND disabled = 0").first<{ n: number }>())?.n ?? 0);
}

/** Changes a user's role or disables them. The last active owner can't be demoted or disabled. */
export async function updateUser(db: Db, id: number, change: { role?: Role; disabled?: boolean }): Promise<void> {
  const u = await db.prepare("SELECT role, disabled FROM users WHERE id = ?").bind(id).first<{ role: Role; disabled: number }>();
  if (!u) throw new UserError("No such user.");
  const losingOwner = u.role === "owner" && !u.disabled && ((change.role && change.role !== "owner") || change.disabled);
  if (losingOwner && (await activeOwners(db)) <= 1) throw new UserError("There must always be at least one owner.");
  if (change.role) await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(change.role, id).run();
  if (change.disabled !== undefined) {
    await db.prepare("UPDATE users SET disabled = ? WHERE id = ?").bind(change.disabled ? 1 : 0, id).run();
    if (change.disabled) await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  }
}

export async function changePassword(db: Db, userId: number, current: string, next: string, keepToken?: string): Promise<void> {
  const u = await db.prepare("SELECT password_hash FROM users WHERE id = ?").bind(userId).first<{ password_hash: string }>();
  if (!u || !(await verifyPassword(current, u.password_hash))) throw new UserError("Your current password isn't right.");
  const p = passwordProblem(next);
  if (p) throw new UserError(p);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(next), userId).run();
  // Sign out everywhere else.
  const keep = keepToken ? await sha256(keepToken) : "";
  await db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(userId, keep).run();
}

// ---- Sign-in, sessions ----

async function tooMany(db: Db, key: string, max: number): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const r = await db.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?").bind(key, since).first<{ n: number }>();
  return Number(r?.n ?? 0) >= max;
}

export type LoginResult = { ok: true; user: User; token: string } | { ok: false; error: string; status: 401 | 429 };

export async function login(db: Db, email: string, password: string, ip: string): Promise<LoginResult> {
  const e = normalEmail(email);
  if ((await tooMany(db, `email:${e}`, MAX_PER_EMAIL)) || (await tooMany(db, `ip:${ip}`, MAX_PER_IP))) {
    return { ok: false, status: 429, error: `Too many attempts. Try again in ${WINDOW_MIN} minutes.` };
  }
  const u = await db.prepare("SELECT id, email, name, role, password_hash, disabled FROM users WHERE email = ?").bind(e).first<Record<string, unknown>>();
  const good = await verifyPassword(password, (u?.password_hash as string) ?? DUMMY_HASH);
  if (!u || !good || u.disabled) {
    await db.batch([db.prepare("INSERT INTO login_attempts (key) VALUES (?)").bind(`email:${e}`), db.prepare("INSERT INTO login_attempts (key) VALUES (?)").bind(`ip:${ip}`)]);
    return { ok: false, status: 401, error: "That email and password don't match an account." };
  }
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  const cutoff = new Date(Date.now() - 86_400_000).toISOString();
  await db.batch([
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), u.id, expires),
    db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(nowIso(), u.id),
    db.prepare("DELETE FROM login_attempts WHERE key = ? OR at < ?").bind(`email:${e}`, cutoff),
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowIso()),
  ]);
  return { ok: true, token, user: { id: Number(u.id), email: u.email as string, name: u.name as string, role: u.role as Role } };
}

export async function sessionUser(db: Db, token: string | undefined): Promise<User | null> {
  if (!token || token.length > 100) return null;
  const r = await db
    .prepare("SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.disabled = 0")
    .bind(await sha256(token), nowIso())
    .first<Record<string, unknown>>();
  return r ? { id: Number(r.id), email: r.email as string, name: r.name as string, role: r.role as Role } : null;
}

export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (token) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export const clearedCookie = (secure: boolean) => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
export function readCookie(header: string | null, name = SESSION_COOKIE): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

// ---- Invites and password resets ----

/** Creates a one-time link token: an invite (new account) or a reset (existing account). */
export async function createInvite(db: Db, kind: "invite" | "reset", email: string, role: Role | null, createdBy: number): Promise<string> {
  const e = normalEmail(email);
  if (!validEmail(e)) throw new UserError("That email address doesn't look right.");
  const exists = await db.prepare("SELECT id FROM users WHERE email = ?").bind(e).first();
  if (kind === "invite" && exists) throw new UserError("There's already an account with that email.");
  if (kind === "reset" && !exists) throw new UserError("No account with that email.");
  const token = randomToken();
  const days = kind === "invite" ? 7 : 1;
  await db
    .prepare("INSERT INTO invites (token_hash, kind, email, role, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(await sha256(token), kind, e, role, createdBy, new Date(Date.now() + days * 86_400_000).toISOString())
    .run();
  return token;
}

export async function inviteInfo(db: Db, token: string): Promise<{ kind: "invite" | "reset"; email: string } | null> {
  const r = await db.prepare("SELECT kind, email FROM invites WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").bind(await sha256(token), nowIso()).first<{ kind: "invite" | "reset"; email: string }>();
  return r ?? null;
}

/** Uses an invite (creates the account) or a reset (sets the password, signs out everywhere). */
export async function redeemInvite(db: Db, token: string, name: string, password: string): Promise<User> {
  const h = await sha256(token);
  const inv = await db.prepare("SELECT kind, email, role FROM invites WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").bind(h, nowIso()).first<{ kind: string; email: string; role: Role | null }>();
  if (!inv) throw new UserError("This link has expired or was already used. Ask for a new one.");
  const p = passwordProblem(password);
  if (p) throw new UserError(p);
  // Mark used first, so a link can't be used twice even if two requests race.
  const claim = await db.prepare("UPDATE invites SET used_at = ? WHERE token_hash = ? AND used_at IS NULL").bind(nowIso(), h).run();
  if (!claim.meta.changes) throw new UserError("This link was already used.");
  if (inv.kind === "invite") {
    if (!name.trim()) throw new UserError("Add your name.");
    return createUser(db, inv.email, name, inv.role ?? "editor", password);
  }
  const u = await db.prepare("SELECT id, email, name, role FROM users WHERE email = ?").bind(inv.email).first<Record<string, unknown>>();
  if (!u) throw new UserError("No account with that email.");
  await db.batch([
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(password), u.id),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
  ]);
  return { id: Number(u.id), email: u.email as string, name: u.name as string, role: u.role as Role };
}
