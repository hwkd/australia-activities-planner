import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "~/server/auth";
import type { ActivitySummary } from "~/server/activities";
import { needsRecheck } from "~/lib/content-checks";
import { todayInSydney } from "~/lib/dates";
import { categories } from "~/content/schema";
import { newActivity, slugify } from "~/lib/activityTemplate";
import { api, ApiError, navigate } from "./api";
import { btnCls, inputCls, Link, Notice, primaryCls, Select, Text } from "./ui";
import ActivityEditor from "./ActivityEditor";
import EventEditor from "./EventEditor";
import { EventList, NewEvent } from "./EventsPage";

/**
 * The content admin (`/admin`, tracker M11). A client-side app over /api/admin: sign in, activities
 * (list, create, edit, publish, history), events (the same, spec §11.4), users (owner) and your account.
 */
function usePath() {
  const [path, setPath] = useState(() => location.pathname.replace(/\/+$/, "") || "/admin");
  useEffect(() => {
    const on = () => setPath(location.pathname.replace(/\/+$/, "") || "/admin");
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return path;
}

export default function AdminApp() {
  const path = usePath();
  const [me, setMe] = useState<{ user: User; mode: string } | null | undefined>(undefined);
  const refreshMe = useCallback(() => api<{ user: User; mode: string }>("me").then(setMe, () => setMe(null)), []);
  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const invite = path.match(/^\/admin\/invite\/([A-Za-z0-9_-]+)$/);
  if (invite) return <InvitePage token={invite[1]} onDone={() => refreshMe().then(() => navigate("/admin"))} />;
  if (me === undefined) return <p className="p-6 text-slate-500">Loading…</p>;
  if (!me) return <LoginPage onIn={refreshMe} />;

  const editMatch = path.match(/^\/admin\/activities\/([a-z0-9-]+)$/);
  const eventMatch = path.match(/^\/admin\/events\/(e-[a-z0-9-]+)$/);
  let page;
  if (path === "/admin/activities/new") page = <NewActivity />;
  else if (editMatch) page = <EditorLoader id={editMatch[1]} user={me.user} />;
  else if (path === "/admin/events") page = <EventList />;
  else if (path === "/admin/events/new") page = <NewEvent />;
  else if (eventMatch) page = <EventEditor key={eventMatch[1]} id={eventMatch[1]} user={me.user} />;
  else if (path === "/admin/users" && me.user.role === "owner") page = <UsersPage me={me.user} />;
  else if (path === "/admin/account") page = <AccountPage />;
  else page = <ActivityList mode={me.mode} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link to="/admin" className="font-bold">
            Content admin
          </Link>
          <nav aria-label="Admin" className="flex gap-4 text-sm font-semibold text-slate-600">
            <Link to="/admin" className="hover:text-slate-900">
              Activities
            </Link>
            <Link to="/admin/events" className="hover:text-slate-900">
              Events
            </Link>
            {me.user.role === "owner" && (
              <Link to="/admin/users" className="hover:text-slate-900">
                Users
              </Link>
            )}
            <Link to="/admin/account" className="hover:text-slate-900">
              Account
            </Link>
            <a href="/" className="hover:text-slate-900" target="_blank" rel="noopener">
              View site<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </nav>
          <span className="ml-auto text-sm text-slate-500">
            {me.user.name} · {me.user.role}
          </span>
          <button
            type="button"
            className={btnCls}
            onClick={async () => {
              await api("logout", { method: "POST" });
              setMe(null);
              navigate("/admin");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      {me.mode === "preview" && <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">Preview site: draft activities can be published here. On the live site only verified activities can.</p>}
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-16">{page}</main>
    </div>
  );
}

function LoginPage({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { method: "POST", body: { email, password } });
      onIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Content admin</h1>
        <p className="text-sm text-slate-500">Sign in to edit activities.</p>
        {error && <Notice kind="error">{error}</Notice>}
        <Text id="email" label="Email" type="email" value={email} onChange={setEmail} />
        <Text id="password" label="Password" type="password" value={password} onChange={setPassword} />
        <button type="submit" className={`${primaryCls} w-full`} disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-slate-500">Forgot your password? Ask an owner for a reset link.</p>
      </form>
    </main>
  );
}

function InvitePage({ token, onDone }: { token: string; onDone: () => void }) {
  const [info, setInfo] = useState<{ kind: "invite" | "reset"; email: string } | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    api<{ kind: "invite" | "reset"; email: string }>(`invite/${token}`).then(setInfo, (e) => setError((e as Error).message));
  }, [token]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== password2) return setError("The passwords don't match.");
    try {
      await api(`invite/${token}`, { method: "POST", body: { name, password } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {done ? (
          <>
            <h1 className="text-2xl font-bold">All set</h1>
            <p className="text-sm">Sign in with your email and new password.</p>
            <button type="button" className={`${primaryCls} w-full`} onClick={onDone}>
              Go to sign in
            </button>
          </>
        ) : !info ? (
          error ? <Notice kind="error">{error}</Notice> : <p className="text-slate-500">Checking your link…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h1 className="text-2xl font-bold">{info.kind === "invite" ? "Join the content team" : "Choose a new password"}</h1>
            <p className="text-sm text-slate-500">{info.email}</p>
            {error && <Notice kind="error">{error}</Notice>}
            {info.kind === "invite" && <Text id="name" label="Your name" value={name} onChange={setName} />}
            <Text id="pw" label="Password" type="password" value={password} onChange={setPassword} hint="At least 12 characters. A few random words works well." />
            <Text id="pw2" label="Password again" type="password" value={password2} onChange={setPassword2} />
            <button type="submit" className={`${primaryCls} w-full`} disabled={!password || (info.kind === "invite" && !name)}>
              {info.kind === "invite" ? "Create my account" : "Set password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function ActivityList({ mode }: { mode: string }) {
  const [list, setList] = useState<ActivitySummary[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "live" | "changed" | "unpublished" | "draft" | "verified" | "recheck">("all");
  const [cat, setCat] = useState("all");
  const today = todayInSydney();
  useEffect(() => {
    api<{ activities: ActivitySummary[] }>("activities").then((r) => setList(r.activities), (e) => setError((e as Error).message));
  }, []);
  const shown = useMemo(
    () =>
      (list ?? []).filter(
        (a) =>
          (!q || `${a.name} ${a.area} ${a.id}`.toLowerCase().includes(q.toLowerCase())) &&
          (cat === "all" || a.category === cat) &&
          (state === "all" ||
            (state === "live" && a.published) ||
            (state === "changed" && a.changed) ||
            (state === "unpublished" && !a.published) ||
            (state === "draft" && a.status === "draft") ||
            (state === "verified" && a.status === "verified") ||
            (state === "recheck" && needsRecheck(a.status, a.lastVerified, today)))
      ),
    [list, q, state, cat, today]
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-2xl font-bold">Activities</h1>
        <Link to="/admin/activities/new" className={primaryCls}>
          + New activity
        </Link>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Text id="q" label="Search" value={q} onChange={setQ} placeholder="Name, area or id" />
        <Select
          id="state"
          label="Show"
          value={state}
          options={[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "changed", label: "Live, with unpublished changes" },
            { value: "unpublished", label: "Not published" },
            { value: "draft", label: "Draft content (unverified)" },
            { value: "verified", label: "Verified" },
            { value: "recheck", label: "Needs re-checking (over 6 months)" },
          ]}
          onChange={setState}
        />
        <Select id="cat" label="Category" value={cat} options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]} onChange={setCat} />
      </div>
      {!list ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Activities</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Content</th>
                <th className="px-4 py-2.5">On the site</th>
                <th className="px-4 py-2.5">Last saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/admin/activities/${a.id}`} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                      {a.name}
                    </Link>
                    <div className="text-xs text-slate-500">{a.area}</div>
                  </td>
                  <td className="px-4 py-2.5">{a.category}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${a.status === "verified" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{a.status === "verified" ? "Verified" : "Draft"}</span>
                    {needsRecheck(a.status, a.lastVerified, today) && (
                      <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-900" title={a.lastVerified ? `Last verified ${a.lastVerified}` : "No verification date"}>
                        Needs re-checking
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {a.published ? (a.changed ? "Live · changes not published" : mode === "published" && a.status !== "verified" ? "Hidden (not verified)" : "Live") : "Not published"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {new Date(a.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    {a.updatedBy ? ` · ${a.updatedBy}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="p-4 text-sm text-slate-500">Nothing matches.</p>}
        </div>
      )}
      <p className="text-xs text-slate-500">
        {list?.length ?? 0} activities · {list?.filter((a) => a.published).length ?? 0} published
      </p>
    </div>
  );
}

function NewActivity() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [from, setFrom] = useState("");
  const [list, setList] = useState<ActivitySummary[]>([]);
  const [error, setError] = useState<{ text: string; problems: string[] } | null>(null);
  useEffect(() => {
    api<{ activities: ActivitySummary[] }>("activities").then((r) => setList(r.activities));
  }, []);
  const slug = idTouched ? id : slugify(name);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      let activity = newActivity(slug, name.trim());
      if (from) {
        const base = await api<{ draft: ReturnType<typeof newActivity> }>(`activities/${from}`);
        activity = { ...structuredClone(base.draft), id: slug, name: name.trim(), status: "draft", lastVerified: null, pairings: [], costs: { ...base.draft.costs, pricesChecked: null }, geo: { ...base.draft.geo, checked: null } };
      }
      await api("activities", { method: "POST", body: { activity } });
      navigate(`/admin/activities/${slug}`);
    } catch (err) {
      const a = err as ApiError;
      setError({ text: a.message, problems: a.problems });
    }
  };
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold">New activity</h1>
      {error && (
        <Notice kind="error">
          {error.text}
          {error.problems.map((p) => (
            <div key={p}>{p}</div>
          ))}
        </Notice>
      )}
      <Text id="n-name" label="Name" value={name} onChange={setName} />
      <Text
        id="n-id"
        label="ID (page address)"
        value={slug}
        onChange={(v) => {
          setIdTouched(true);
          setId(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
        }}
        hint={`/a/${slug || "…"} · lowercase words joined by hyphens. Can't be changed later.`}
      />
      <Select id="n-from" label="Start from" value={from} options={[{ value: "", label: "A blank activity" }, ...list.map((a) => ({ value: a.id, label: `A copy of ${a.name}` }))]} onChange={setFrom} />
      <p className="text-xs text-slate-500">A copy keeps the map, getting there and costs to adapt, but starts as an unverified draft with no pairings and its map unchecked.</p>
      <div className="flex gap-2">
        <button type="submit" className={primaryCls} disabled={!name.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)}>
          Create draft
        </button>
        <Link to="/admin" className={btnCls}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function EditorLoader({ id, user }: { id: string; user: User }) {
  const [names, setNames] = useState<{ id: string; name: string }[] | null>(null);
  useEffect(() => {
    api<{ activities: ActivitySummary[] }>("activities").then((r) => setNames(r.activities.map(({ id: i, name }) => ({ id: i, name }))));
  }, []);
  return names ? <ActivityEditor key={id} id={id} user={user} names={names} /> : <p className="text-slate-500">Loading…</p>;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: "owner" | "editor";
  disabled: boolean;
  lastLoginAt: string | null;
}
function UsersPage({ me }: { me: User }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "owner">("editor");
  const [link, setLink] = useState<{ text: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const load = () => api<{ users: UserRow[] }>("users").then((r) => setUsers(r.users));
  useEffect(() => {
    void load();
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Users</h1>
      {error && <Notice kind="error">{error}</Notice>}
      {link && (
        <Notice kind="ok">
          <p className="font-semibold">{link.text}</p>
          <p className="mt-1 text-xs">Send this link yourself. It works once and expires; nobody else can see it again.</p>
          <div className="mt-2 flex gap-2">
            <input aria-label="Link" readOnly className={inputCls} value={link.url} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className={btnCls} onClick={() => navigator.clipboard.writeText(link.url)}>
              Copy
            </button>
          </div>
        </Notice>
      )}
      <form
        className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[2fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const r = await api<{ link: string }>("users/invite", { method: "POST", body: { email, role } });
            setLink({ text: `Invite link for ${email} (valid 7 days)`, url: r.link });
            setEmail("");
          });
        }}
      >
        <Text id="inv-email" label="Invite someone (email)" type="email" value={email} onChange={setEmail} />
        <Select
          id="inv-role"
          label="Role"
          value={role}
          options={[
            { value: "editor", label: "Editor" },
            { value: "owner", label: "Owner" },
          ]}
          onChange={setRole}
        />
        <button type="submit" className={primaryCls} disabled={!email}>
          Create invite link
        </button>
      </form>
      <p className="text-xs text-slate-500">Editors edit and publish activities. Owners can also manage users and delete unpublished activities.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Users</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Last sign-in</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.disabled ? "text-slate-400" : ""}>
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs">{u.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <select aria-label={`Role for ${u.name}`} className="rounded-lg border border-slate-300 px-2 py-1" value={u.role} onChange={(e) => void run(() => api(`users/${u.id}`, { method: "PATCH", body: { role: e.target.value } }))}>
                    <option value="editor">Editor</option>
                    <option value="owner">Owner</option>
                  </select>
                </td>
                <td className="px-4 py-2.5 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-AU") : "Never"}</td>
                <td className="flex flex-wrap gap-2 px-4 py-2.5">
                  <button type="button" className={btnCls} onClick={() => void run(async () => setLink({ text: `Password reset link for ${u.email} (valid 1 day)`, url: (await api<{ link: string }>("users/reset", { method: "POST", body: { email: u.email } })).link }))}>
                    Reset link
                  </button>
                  {u.id !== me.id && (
                    <button type="button" className={btnCls} onClick={() => void run(() => api(`users/${u.id}`, { method: "PATCH", body: { disabled: !u.disabled } }))}>
                      {u.disabled ? "Enable" : "Disable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  return (
    <form
      className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (next !== next2) return setMsg({ kind: "error", text: "The new passwords don't match." });
        try {
          await api("password", { method: "POST", body: { current, next } });
          setMsg({ kind: "ok", text: "Password changed. You've been signed out everywhere else." });
          setCurrent("");
          setNext("");
          setNext2("");
        } catch (err) {
          setMsg({ kind: "error", text: (err as Error).message });
        }
      }}
    >
      <h1 className="text-2xl font-bold">Change password</h1>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Text id="a-cur" label="Current password" type="password" value={current} onChange={setCurrent} />
      <Text id="a-new" label="New password" type="password" value={next} onChange={setNext} hint="At least 12 characters." />
      <Text id="a-new2" label="New password again" type="password" value={next2} onChange={setNext2} />
      <button type="submit" className={primaryCls} disabled={!current || !next}>
        Change password
      </button>
    </form>
  );
}
