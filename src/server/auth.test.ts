import { describe, expect, it } from "vitest";
import { testDb } from "../../tests/unit/d1";
import { changePassword, createInvite, createUser, hashPassword, inviteInfo, login, logout, readCookie, sessionCookie, sessionUser, updateUser, redeemInvite, verifyPassword } from "./auth";

const PW = "correct horse battery";

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const a = await hashPassword(PW), b = await hashPassword(PW);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(await verifyPassword(PW, a)).toBe(true);
    expect(await verifyPassword(PW + "x", a)).toBe(false);
    expect(await verifyPassword(PW, "garbage")).toBe(false);
  });
  it("refuses short passwords", async () => {
    await expect(createUser(testDb(), "a@example.com", "A", "owner", "short")).rejects.toThrow(/at least 12/);
  });
});

describe("sign-in and sessions", () => {
  it("signs in, finds the session, signs out", async () => {
    const db = testDb();
    await createUser(db, "Owner@Example.com", "Owner", "owner", PW);
    const r = await login(db, "owner@example.com", PW, "1.1.1.1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await sessionUser(db, r.token)).toMatchObject({ email: "owner@example.com", role: "owner" });
    expect(sessionCookie(r.token, true)).toMatch(/HttpOnly; SameSite=Strict; Max-Age=604800; Secure$/);
    expect(readCookie(`a=b; swf_admin=${r.token}`)).toBe(r.token);
    await logout(db, r.token);
    expect(await sessionUser(db, r.token)).toBeNull();
  });
  it("the same message for a wrong password and an unknown email", async () => {
    const db = testDb();
    await createUser(db, "a@example.com", "A", "editor", PW);
    const wrong = await login(db, "a@example.com", "nope nope nope", "1.1.1.1");
    const unknown = await login(db, "b@example.com", PW, "1.1.1.1");
    expect(wrong).toEqual(unknown);
  });
  it("rate-limits after 5 failures for an email, even with the right password", async () => {
    const db = testDb();
    await createUser(db, "a@example.com", "A", "editor", PW);
    for (let i = 0; i < 5; i++) expect((await login(db, "a@example.com", "wrong password!", `9.9.9.${i}`)).ok).toBe(false);
    expect(await login(db, "a@example.com", PW, "8.8.8.8")).toMatchObject({ ok: false, status: 429 });
  });
  it("disabled users can't sign in and lose their sessions", async () => {
    const db = testDb();
    await createUser(db, "o@example.com", "O", "owner", PW);
    const e = await createUser(db, "e@example.com", "E", "editor", PW);
    const r = await login(db, "e@example.com", PW, "1.1.1.1");
    await updateUser(db, e.id, { disabled: true });
    if (r.ok) expect(await sessionUser(db, r.token)).toBeNull();
    expect((await login(db, "e@example.com", PW, "1.1.1.1")).ok).toBe(false);
  });
  it("keeps at least one owner", async () => {
    const db = testDb();
    const o = await createUser(db, "o@example.com", "O", "owner", PW);
    await expect(updateUser(db, o.id, { role: "editor" })).rejects.toThrow(/at least one owner/);
    await expect(updateUser(db, o.id, { disabled: true })).rejects.toThrow(/at least one owner/);
  });
  it("changing your password signs out your other sessions", async () => {
    const db = testDb();
    const u = await createUser(db, "o@example.com", "O", "owner", PW);
    const a = await login(db, "o@example.com", PW, "1.1.1.1");
    const b = await login(db, "o@example.com", PW, "1.1.1.2");
    if (!a.ok || !b.ok) throw new Error("login");
    await changePassword(db, u.id, PW, "a brand new passphrase", a.token);
    expect(await sessionUser(db, a.token)).not.toBeNull();
    expect(await sessionUser(db, b.token)).toBeNull();
    await expect(changePassword(db, u.id, "wrong", "another long passphrase")).rejects.toThrow(/current password/);
  });
});

describe("invites and resets", () => {
  it("an invite creates an editor once; the link can't be reused", async () => {
    const db = testDb();
    const o = await createUser(db, "o@example.com", "O", "owner", PW);
    const token = await createInvite(db, "invite", "new@example.com", "editor", o.id);
    expect(await inviteInfo(db, token)).toEqual({ kind: "invite", email: "new@example.com" });
    const u = await redeemInvite(db, token, "New Editor", PW);
    expect(u).toMatchObject({ email: "new@example.com", role: "editor" });
    await expect(redeemInvite(db, token, "Again", PW)).rejects.toThrow(/expired or was already used/);
    await expect(createInvite(db, "invite", "new@example.com", "editor", o.id)).rejects.toThrow(/already an account/);
  });
  it("a reset sets a new password and signs out everywhere", async () => {
    const db = testDb();
    const o = await createUser(db, "o@example.com", "O", "owner", PW);
    const s = await login(db, "o@example.com", PW, "1.1.1.1");
    const token = await createInvite(db, "reset", "o@example.com", null, o.id);
    await redeemInvite(db, token, "", "a fresh long passphrase");
    if (s.ok) expect(await sessionUser(db, s.token)).toBeNull();
    expect((await login(db, "o@example.com", "a fresh long passphrase", "1.1.1.1")).ok).toBe(true);
  });
});
