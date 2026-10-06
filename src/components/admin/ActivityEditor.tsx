import { useCallback, useEffect, useMemo, useState } from "react";
import { activitySchema, categories, unconfirmedSections, type Activity } from "~/content/schema";
import { api, ApiError, navigate } from "./api";
import { geoFromGeoJson, legsFromGeoJson, MAP_LEG_MODES, type MapLeg } from "~/lib/geo";
import {
  btnCls,
  Checks,
  dangerCls,
  Link,
  Money,
  Notice,
  NumberInput,
  primaryCls,
  Section,
  Select,
  StringList,
  Text,
} from "./ui";
import PlacesEditor from "./PlacesEditor";
import type { User } from "~/server/auth";

type Leg = Activity["routes"]["pt"]["legs"][number];
const LEG_MODES = ["walk", "train", "bus", "ferry", "metro", "light-rail"] as const;
const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;
const GROUPS = [
  { value: "date", label: "Date" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "solo", label: "Solo" },
] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FIT = [
  { v: 0, label: "Skip" },
  { v: 1, label: "Fine" },
  { v: 2, label: "Perfect" },
] as const;
const ACCESS_LEVELS = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partly (say how in the notes)" },
  { value: "no", label: "No" },
] as const;

const SECTIONS = [
  ["basics", "Basics"],
  ["notice", "Notice"],
  ["weather", "Weather"],
  ["who", "Who and when"],
  ["text", "Words"],
  ["place", "Place"],
  ["facts", "Facts"],
  ["routes", "Getting there"],
  ["places", "Map places"],
  ["costs", "Costs"],
  ["visit", "Plan your visit"],
  ["geo", "Map lines and facilities"],
  ["access", "Access facts"],
  ["unconfirmed", "Not yet confirmed"],
  ["pairings", "Make a day of it"],
  ["links", "Links"],
] as const;

interface Record_ {
  draft: Activity;
  published: Activity | null;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
}
interface Revision {
  id: number;
  version: number;
  action: string;
  user: string | null;
  createdAt: string;
}

const UNCONFIRMED_LABEL: Record<(typeof unconfirmedSections)[number], string> = {
  map: "Map",
  gettingThere: "Getting there",
  driving: "Driving",
  cost: "Cost",
  visit: "Plan your visit",
  access: "Access",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The activity editor (tracker M11): every field of an activity, validated live against the site's schema. */
export default function ActivityEditor({
  id,
  user,
  names,
}: {
  id: string;
  user: User;
  names: { id: string; name: string }[];
}) {
  const [rec, setRec] = useState<Record_ | null>(null);
  const [draft, setDraft] = useState<Activity | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "warn"; text: string; problems?: string[] } | null>(
    null,
  );
  const [history, setHistory] = useState<Revision[] | null>(null);

  const load = useCallback(async () => {
    const r = await api<Record_>(`activities/${id}`);
    setRec(r);
    setDraft(structuredClone(r.draft));
    setVersion(r.version);
  }, [id]);
  useEffect(() => {
    let live = true;
    api<Record_>(`activities/${id}`).then(
      (r) => {
        if (!live) return;
        setRec(r);
        setDraft(structuredClone(r.draft));
        setVersion(r.version);
      },
      (e) => live && setMessage({ kind: "error", text: (e as Error).message }),
    );
    return () => {
      live = false;
    };
  }, [id]);

  const dirty = !!rec && !!draft && JSON.stringify(draft) !== JSON.stringify(rec.draft);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const parsed = useMemo(() => (draft ? activitySchema.safeParse(draft) : null), [draft]);
  const errors = useMemo(() => {
    const m = new Map<string, string[]>();
    if (parsed && !parsed.success)
      for (const i of parsed.error.issues) m.set(i.path.join("."), [...(m.get(i.path.join(".")) ?? []), i.message]);
    return m;
  }, [parsed]);
  const err = (path: string) => errors.get(path);
  const errUnder = (prefix: string) =>
    [...errors.entries()]
      .filter(([k]) => k === prefix || k.startsWith(prefix + "."))
      .flatMap(([k, v]) => v.map((x) => `${k}: ${x}`));

  const edit = (fn: (a: Activity) => void) =>
    setDraft((d) => {
      const n = structuredClone(d!);
      fn(n);
      return n;
    });

  const save = useCallback(async () => {
    if (!draft || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ version: number; warnings: string[] }>(`activities/${id}`, {
        method: "PUT",
        body: { activity: draft, version },
      });
      setVersion(r.version);
      setRec((x) =>
        x ? { ...x, draft: structuredClone(draft), version: r.version, updatedAt: new Date().toISOString() } : x,
      );
      setMessage(
        r.warnings.length
          ? { kind: "warn", text: "Saved. Fix these before publishing:", problems: r.warnings }
          : { kind: "ok", text: "Saved as a draft. The public site still shows the published version." },
      );
    } catch (e) {
      const a = e as ApiError;
      setMessage({ kind: "error", text: a.message, problems: a.problems });
    } finally {
      setBusy(false);
    }
  }, [draft, busy, id, version]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const action = async (path: string, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ version: number; pairedFrom?: string[] }>(`activities/${id}/${path}`, {
        method: "POST",
        body: { version },
      });
      await load();
      setMessage(
        r.pairedFrom?.length
          ? {
              kind: "warn",
              text: `${ok} These published activities pair with it and now show it as plain text: ${r.pairedFrom.join(", ")}.`,
            }
          : { kind: "ok", text: ok },
      );
      if (history) setHistory((await api<{ revisions: Revision[] }>(`activities/${id}/revisions`)).revisions);
    } catch (e) {
      const a = e as ApiError;
      setMessage({ kind: "error", text: a.message, problems: a.problems });
    } finally {
      setBusy(false);
    }
  };

  if (!draft || !rec)
    return message ? <Notice kind="error">{message.text}</Notice> : <p className="text-slate-500">Loading…</p>;

  const live = !!rec.published;
  const liveDiffers = live && JSON.stringify(rec.published) !== JSON.stringify(rec.draft);
  const pt = draft.routes.pt;
  const others = names.filter((n) => n.id !== draft.id);

  return (
    <div>
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            ← Activities
          </Link>
          <h1 className="mr-auto min-w-0 truncate text-xl font-bold">{draft.name || "Untitled"}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${draft.status === "verified" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}
          >
            {draft.status === "verified" ? "Verified" : "Draft content"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${live ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-700"}`}
          >
            {live ? (liveDiffers ? "Live · saved changes not published" : "Live") : "Not published"}
          </span>
          {dirty && (
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">Unsaved changes</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primaryCls}
            disabled={!dirty || busy || !parsed?.success}
            onClick={() => void save()}
            title="Ctrl/Cmd+S"
          >
            Save draft
          </button>
          <button
            type="button"
            className={btnCls}
            disabled={busy || dirty || (live && !liveDiffers)}
            onClick={() => void action("publish", "Published. It's live now.")}
          >
            {live ? "Publish changes" : "Publish"}
          </button>
          {live && (
            <button
              type="button"
              className={btnCls}
              disabled={busy || dirty}
              onClick={() =>
                confirm(`Take ${draft.name} off the public site? Plans that include it will show it as unavailable.`) &&
                void action("unpublish", "Unpublished.")
              }
            >
              Unpublish
            </button>
          )}
          <a className={btnCls} href={`/a/${id}?preview`} target="_blank" rel="noopener">
            Preview draft<span className="sr-only"> (opens in a new tab)</span>
          </a>
          {live && (
            <a className={btnCls} href={`/a/${id}`} target="_blank" rel="noopener">
              View live<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <button
            type="button"
            className={btnCls}
            onClick={async () =>
              setHistory(
                history ? null : (await api<{ revisions: Revision[] }>(`activities/${id}/revisions`)).revisions,
              )
            }
          >
            {history ? "Hide history" : "History"}
          </button>
          {dirty && (
            <button
              type="button"
              className={btnCls}
              onClick={() => confirm("Discard your unsaved changes?") && setDraft(structuredClone(rec.draft))}
            >
              Discard changes
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">
            Saved {when(rec.updatedAt)}
            {rec.publishedAt ? ` · published ${when(rec.publishedAt)}` : ""}
          </span>
        </div>
        {dirty && (
          <p className="mt-1 text-xs text-slate-500">
            Save before publishing or previewing: Publish uses the last saved draft.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {message && (
          <Notice kind={message.kind}>
            <p className="font-semibold">{message.text}</p>
            {message.problems && message.problems.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {message.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            {message.kind === "error" && /Someone else changed/.test(message.text) && (
              <button
                type="button"
                className={`${btnCls} mt-2`}
                onClick={() =>
                  confirm("Reload? Your unsaved changes will be lost.") && void load().then(() => setMessage(null))
                }
              >
                Reload their version
              </button>
            )}
          </Notice>
        )}
        {parsed && !parsed.success && (
          <Notice kind="error">
            <p className="font-semibold">
              {errors.size} {errors.size === 1 ? "field needs" : "fields need"} fixing before you can save:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {[...errors.entries()].slice(0, 8).map(([k, v]) => (
                <li key={k}>
                  {k || "activity"}: {v.join("; ")}
                </li>
              ))}
            </ul>
          </Notice>
        )}
        {history && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="History">
            <h2 className="font-bold">History</h2>
            <ol className="mt-2 divide-y divide-slate-100">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="w-16 font-semibold">v{r.version}</span>
                  <span className="w-24 capitalize">{r.action}</span>
                  <span className="text-slate-600">{r.user ?? "Import"}</span>
                  <span className="text-slate-500">{when(r.createdAt)}</span>
                  {r.version !== version && (
                    <button
                      type="button"
                      className={`${btnCls} ml-auto`}
                      disabled={busy || dirty}
                      onClick={() =>
                        confirm(`Make version ${r.version} the draft? You can publish it afterwards.`) &&
                        void action(
                          `revisions/${r.id}/restore`,
                          `Restored version ${r.version} as the draft. Publish to make it live.`,
                        )
                      }
                    >
                      Restore as draft
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-36 space-y-1 text-sm">
            {SECTIONS.map(([sid, label]) => (
              <li key={sid}>
                <a
                  href={`#${sid}`}
                  className={`block rounded-lg px-3 py-1.5 font-semibold hover:bg-white ${errUnder(sid === "basics" ? "name" : sid === "places" ? "geo.places" : sid).length ? "text-red-700" : "text-slate-700"}`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-5">
          <Section id="basics" title="Basics">
            <Text
              id="f-id"
              label="ID"
              value={draft.id}
              onChange={() => {}}
              readOnly
              hint="Fixed: the page address, plans and pairings use it."
            />
            <Text
              id="f-name"
              label="Name"
              value={draft.name}
              onChange={(v) => edit((a) => void (a.name = v))}
              error={err("name")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text
                id="f-area"
                label="Area"
                value={draft.area}
                onChange={(v) => edit((a) => void (a.area = v))}
                error={err("area")}
                hint="Suburb or park, e.g. The Domain"
              />
              <Select
                id="f-cat"
                label="Category"
                value={draft.category}
                options={categories}
                onChange={(v) => edit((a) => void (a.category = v))}
              />
            </div>
            <Text
              id="f-catl"
              label="Category label (shown on cards)"
              value={draft.categoryLabel}
              onChange={(v) => edit((a) => void (a.categoryLabel = v))}
              error={err("categoryLabel")}
            />
            <Text
              id="f-blurb"
              label="Blurb"
              value={draft.blurb}
              max={90}
              onChange={(v) => edit((a) => void (a.blurb = v))}
              error={err("blurb")}
              hint="One line on the card."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                id="f-status"
                label="Content status"
                value={draft.status}
                options={[
                  { value: "draft", label: "Draft (not checked)" },
                  { value: "verified", label: "Verified" },
                ]}
                onChange={(v) => edit((a) => void (a.status = v))}
                error={err("status")}
              />
              <Text
                id="f-lv"
                type="date"
                label="Last verified"
                value={draft.lastVerified ?? ""}
                onChange={(v) => edit((a) => void (a.lastVerified = v || null))}
                error={err("lastVerified")}
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!draft.bookingRequired}
                  onChange={(e) =>
                    edit((a) => void (e.target.checked ? (a.bookingRequired = true) : delete a.bookingRequired))
                  }
                />{" "}
                Booking required
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Only mark it verified once every fact, fare and price has been checked against official sources. The live
              site only shows verified activities.
            </p>
          </Section>

          <Section
            id="notice"
            title="Notice"
            description="A temporary warning at the top of the activity page, e.g. a track closure from NSW National Parks alerts. Leave empty when there's nothing; remove it when it no longer applies."
          >
            <Text
              id="f-notice"
              label="Notice"
              multiline
              value={draft.notice?.text ?? ""}
              max={240}
              onChange={(v) =>
                edit((a) => {
                  if (!v && !a.notice?.link) delete a.notice;
                  else a.notice = { ...a.notice, text: v };
                })
              }
              error={err("notice.text")}
              hint="Say what's affected and until when, e.g. The loop is closed until at least 31 March 2027."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Text
                id="f-notice-ll"
                label="Latest news: link text"
                value={draft.notice?.link?.label ?? ""}
                max={60}
                onChange={(v) =>
                  edit((a) => {
                    const url = a.notice?.link?.url ?? "";
                    if (!a.notice) a.notice = { text: "" };
                    if (!v && !url) delete a.notice.link;
                    else a.notice.link = { label: v, url };
                  })
                }
                error={err("notice.link.label")}
              />
              <Text
                id="f-notice-lu"
                label="Latest news: link"
                value={draft.notice?.link?.url ?? ""}
                max={500}
                onChange={(v) =>
                  edit((a) => {
                    const label = a.notice?.link?.label ?? "";
                    if (!a.notice) a.notice = { text: "" };
                    if (!v && !label) delete a.notice.link;
                    else a.notice.link = { label, url: v };
                  })
                }
                error={err("notice.link.url")}
                hint="https://… (the alert page), or tel:+612…"
              />
            </div>
          </Section>

          <Section
            id="weather"
            title="Weather"
            description="How good it is in each sky. Skip hides it from Discover in that sky and triggers Plan B."
          >
            {(["sunny", "cloudy", "rainy", "hot"] as const).map((w) => (
              <fieldset key={w} className="flex flex-wrap items-center gap-3">
                <legend className="w-20 text-sm font-semibold capitalize">{w === "hot" ? "Hot 30°+" : w}</legend>
                {FIT.map((f) => (
                  <label
                    key={f.v}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold ${draft.weatherFit[w] === f.v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`fit-${w}`}
                      checked={draft.weatherFit[w] === f.v}
                      onChange={() => edit((a) => void (a.weatherFit[w] = f.v))}
                    />
                    {f.label}
                  </label>
                ))}
              </fieldset>
            ))}
            <Text
              id="f-wn"
              label="Weather note"
              multiline
              max={160}
              value={draft.weatherNote}
              onChange={(v) => edit((a) => void (a.weatherNote = v))}
              error={err("weatherNote")}
            />
          </Section>

          <Section id="who" title="Who and when">
            <Checks
              label="Good for"
              value={draft.goodFor}
              options={GROUPS}
              onChange={(v) => edit((a) => void (a.goodFor = v))}
              error={err("goodFor")}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Text
                id="f-dl"
                label="Duration label"
                value={draft.duration.label}
                onChange={(v) => edit((a) => void (a.duration.label = v))}
                hint="e.g. 2–3 hrs"
              />
              <NumberInput
                id="f-dmin"
                label="Min hours"
                step={0.5}
                value={draft.duration.minHours}
                onChange={(v) => edit((a) => void (a.duration.minHours = v))}
                error={err("duration.minHours") ?? err("duration")}
              />
              <NumberInput
                id="f-dmax"
                label="Max hours"
                step={0.5}
                value={draft.duration.maxHours}
                onChange={(v) => edit((a) => void (a.duration.maxHours = v))}
                error={err("duration.maxHours")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id="f-cost"
                label="Cost tier (cards)"
                value={draft.cost}
                options={["Free", "$", "$$", "$$$"] as const}
                onChange={(v) => edit((a) => void (a.cost = v))}
              />
              <Text
                id="f-ss"
                type="time"
                label="Suggested start"
                value={draft.suggestedStart}
                onChange={(v) => edit((a) => void (a.suggestedStart = v))}
                error={err("suggestedStart")}
              />
            </div>
            <Checks
              label="Runs only on (leave all off for every day)"
              value={draft.days ?? []}
              options={DAYS}
              onChange={(v) => edit((a) => void (v.length ? (a.days = v) : delete a.days))}
              error={err("days")}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Seasonal</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!draft.seasonal}
                  onChange={(e) =>
                    edit(
                      (a) =>
                        void (e.target.checked
                          ? (a.seasonal = { months: [new Date().getMonth() + 1], note: "" })
                          : delete a.seasonal),
                    )
                  }
                />{" "}
                Only in some months
              </label>
              {draft.seasonal && (
                <>
                  <Checks
                    label="Months"
                    value={draft.seasonal.months.map(String)}
                    options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                    onChange={(v) => edit((a) => void (a.seasonal!.months = v.map(Number).sort((x, y) => x - y)))}
                    error={err("seasonal.months")}
                  />
                  <Text
                    id="f-sn"
                    label="Seasonal note"
                    value={draft.seasonal.note}
                    onChange={(v) => edit((a) => void (a.seasonal!.note = v))}
                  />
                </>
              )}
            </fieldset>
          </Section>

          <Section id="text" title="Words">
            <Text
              id="f-gt"
              label="Getting there (summary)"
              multiline
              max={240}
              value={draft.gettingThere}
              onChange={(v) => edit((a) => void (a.gettingThere = v))}
              error={err("gettingThere")}
            />
            <Text
              id="f-tip"
              label="Newcomer tip"
              multiline
              max={240}
              value={draft.newcomerTip}
              onChange={(v) => edit((a) => void (a.newcomerTip = v))}
              error={err("newcomerTip")}
            />
            <StringList
              label="Safety notes (optional)"
              value={draft.safetyNotes ?? []}
              onChange={(v) => edit((a) => void (v.length ? (a.safetyNotes = v) : delete a.safetyNotes))}
              addLabel="Add note"
            />
          </Section>

          <Section
            id="place"
            title="Place"
            description="Where it is, and where directions point (the start of a walk, the entrance…)."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput
                id="f-lat"
                label="Latitude"
                step={0.0001}
                value={draft.location.lat}
                onChange={(v) => edit((a) => void (a.location.lat = v))}
                error={err("location.lat")}
              />
              <NumberInput
                id="f-lng"
                label="Longitude"
                step={0.0001}
                value={draft.location.lng}
                onChange={(v) => edit((a) => void (a.location.lng = v))}
                error={err("location.lng")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Text
                id="f-dest"
                label="Directions go to"
                value={draft.routes.dest.label}
                onChange={(v) => edit((a) => void (a.routes.dest.label = v))}
              />
              <NumberInput
                id="f-dlat"
                label="Latitude"
                step={0.0001}
                value={draft.routes.dest.lat}
                onChange={(v) => edit((a) => void (a.routes.dest.lat = v))}
              />
              <NumberInput
                id="f-dlng"
                label="Longitude"
                step={0.0001}
                value={draft.routes.dest.lng}
                onChange={(v) => edit((a) => void (a.routes.dest.lng = v))}
              />
            </div>
          </Section>

          <Section
            id="facts"
            title="Facts"
            description="Exactly four quick facts under the name, e.g. Time · Distance · Effort · Entry."
          >
            {draft.facts.map((f, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Text
                  id={`f-fk${i}`}
                  label={`Fact ${i + 1} label`}
                  value={f.k}
                  onChange={(v) => edit((a) => void (a.facts[i].k = v))}
                />
                <Text
                  id={`f-fv${i}`}
                  label={`Fact ${i + 1} value`}
                  value={f.v}
                  onChange={(v) => edit((a) => void (a.facts[i].v = v))}
                />
              </div>
            ))}
          </Section>

          <Section
            id="routes"
            title="Getting there"
            description="One public transport trip from Central (the city centre), for a Saturday late-morning departure, checked in the Transport for NSW trip planner. Fares are adult Opal, each way, as a range."
          >
            <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
              <legend className="px-1 font-bold">Trip from Central</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Text
                  id="f-pt-total"
                  label="Total time"
                  value={pt.total}
                  onChange={(v) => edit((a) => void (a.routes.pt.total = v))}
                  hint="e.g. ≈ 35 min"
                  error={err("routes.pt.total")}
                />
                <NumberInput
                  id="f-pt-ch"
                  label="Changes"
                  min={0}
                  value={pt.changes}
                  onChange={(v) => edit((a) => void (a.routes.pt.changes = v))}
                  error={err("routes.pt.changes")}
                />
              </div>
              <Money
                id="f-pt-fare"
                label="Opal fare, adult, each way"
                value={pt.fare}
                onChange={(v) => edit((a) => void (a.routes.pt.fare = v))}
                error={err("routes.pt.fare")}
              />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!pt.nonOpal}
                  onChange={(e) =>
                    edit(
                      (a) =>
                        void (e.target.checked
                          ? (a.routes.pt.nonOpal = [0, 0])
                          : (delete a.routes.pt.nonOpal, delete a.routes.pt.nonOpalChild)),
                    )
                  }
                />
                Includes a leg that isn't on Opal (e.g. a private ferry)
              </label>
              {pt.nonOpal && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Money
                    id="f-pt-no"
                    label="Not on Opal, adult, each way"
                    value={pt.nonOpal}
                    onChange={(v) => edit((a) => void (a.routes.pt.nonOpal = v))}
                    error={err("routes.pt.nonOpal")}
                  />
                  <Money
                    id="f-pt-noc"
                    label="Not on Opal, child (blank = half)"
                    value={pt.nonOpalChild ?? [0, 0]}
                    onChange={(v) => edit((a) => void (a.routes.pt.nonOpalChild = v))}
                    error={err("routes.pt.nonOpalChild")}
                  />
                </div>
              )}
              <LegsEditor
                idPrefix="pt"
                legs={pt.legs}
                onChange={(legs) => edit((a) => void (a.routes.pt.legs = legs))}
                errors={errUnder("routes.pt.legs")}
              />
              <p className="text-xs text-slate-500">
                The whole trip, in order. The site shows the lines ridden as a strip and the legs from the last train,
                bus or ferry to the door as the last stretch.
              </p>
            </fieldset>
            <Text
              id="f-back"
              label="Getting back"
              multiline
              value={pt.back.text}
              onChange={(v) => edit((a) => void (a.routes.pt.back.text = v))}
              hint="Always fill in for one-way trips, e.g. From Coogee, bus 372 goes back to Central."
            />

            <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
              <legend className="px-1 font-bold">Driving?</legend>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!draft.routes.drive}
                  onChange={(e) =>
                    edit((a) => {
                      if (e.target.checked) {
                        a.routes.drive = { total: "≈ 30 min", perCar: [10, 20], perCarLabel: "Parking", notes: [] };
                        delete a.routes.unavailable;
                      } else {
                        a.routes.drive = null;
                        a.routes.unavailable = { drive: "" };
                      }
                    })
                  }
                />
                You can drive there
              </label>
              {draft.routes.drive ? (
                <>
                  <Text
                    id="f-drive-t"
                    label="Drive time from the city"
                    value={draft.routes.drive.total}
                    onChange={(v) => edit((a) => void (a.routes.drive!.total = v))}
                    hint="e.g. ≈ 45 min"
                    error={err("routes.drive.total")}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Money
                      id="f-drive-pc"
                      label="Cost per car"
                      value={draft.routes.drive.perCar}
                      onChange={(v) => edit((a) => void (a.routes.drive!.perCar = v))}
                      error={err("routes.drive.perCar")}
                      hint="Parking, tolls or park entry. 0 to 0 = free."
                    />
                    <Text
                      id="f-drive-pcl"
                      label="What that covers"
                      value={draft.routes.drive.perCarLabel}
                      onChange={(v) => edit((a) => void (a.routes.drive!.perCarLabel = v))}
                      hint="e.g. Parking, 3 hrs"
                      error={err("routes.drive.perCarLabel")}
                    />
                  </div>
                  <StringList
                    label="Parking tips"
                    value={draft.routes.drive.notes}
                    onChange={(v) => edit((a) => void (a.routes.drive!.notes = v))}
                    addLabel="Add tip"
                  />
                </>
              ) : (
                <Text
                  id="f-drive-why"
                  label="Why you can't drive there"
                  value={draft.routes.unavailable?.drive ?? ""}
                  onChange={(v) => edit((a) => void (a.routes.unavailable = { drive: v }))}
                  error={err("routes.unavailable")}
                  hint="e.g. You can't drive to Cockatoo Island: it's car-free and only reached by ferry."
                />
              )}
            </fieldset>

            <Text
              id="f-ride"
              label="Rideshare (optional)"
              value={draft.routes.ride ?? ""}
              onChange={(v) => edit((a) => void (v ? (a.routes.ride = v) : delete a.routes.ride))}
              error={err("routes.ride")}
              hint="One sentence, a tip or a warning, e.g. Ride up, walk down through the zoo, and take the ferry home. Leave empty for none. Never a price."
            />
          </Section>

          <Section
            id="places"
            title="Map places"
            description="The numbered places on the activity's map, in the order a visitor reaches them. Check each pin against the official map or the venue: places the build script couldn't find were estimated (see .map-data/geo-report.md)."
          >
            <PlacesEditor geo={draft.geo} onChange={(g) => edit((a) => void (a.geo = g))} err={err} />
          </Section>

          <Section
            id="costs"
            title="Costs"
            description="Estimates in AUD, shown as ranges. Check them against the venue before marking the activity verified."
          >
            <Money
              id="f-entry"
              label="Entry per adult"
              value={draft.costs.entry}
              onChange={(v) => edit((a) => void (a.costs.entry = v))}
              error={err("costs.entry")}
              hint="0 to 0 = free"
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={!!draft.costs.entryChild}
                onChange={(e) =>
                  edit((a) => void (e.target.checked ? (a.costs.entryChild = [0, 0]) : delete a.costs.entryChild))
                }
              />{" "}
              Children pay a different price
            </label>
            {draft.costs.entryChild && (
              <Money
                id="f-entryc"
                label="Entry per child"
                value={draft.costs.entryChild}
                onChange={(v) => edit((a) => void (a.costs.entryChild = v))}
              />
            )}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Optional extras</legend>
              {draft.costs.extras.map((x, i) => (
                <div
                  key={i}
                  className="grid items-end gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Text
                    id={`f-x-l-${i}`}
                    label="Label"
                    value={x.label}
                    onChange={(v) =>
                      edit(
                        (a) =>
                          void ((a.costs.extras[i].label = v),
                          (a.costs.extras[i].id ||= v.toLowerCase().replace(/[^a-z0-9]+/g, "-"))),
                      )
                    }
                  />
                  <Money
                    id={`f-x-p-${i}`}
                    label="Per person"
                    value={x.per}
                    onChange={(v) => edit((a) => void (a.costs.extras[i].per = v))}
                  />
                  <div className="flex items-center gap-3 pb-2">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={x.on}
                        onChange={(e) => edit((a) => void (a.costs.extras[i].on = e.target.checked))}
                      />{" "}
                      On by default
                    </label>
                    <button
                      type="button"
                      className={btnCls}
                      aria-label={`Remove extra ${x.label}`}
                      onClick={() => edit((a) => void a.costs.extras.splice(i, 1))}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={btnCls}
                onClick={() =>
                  edit(
                    (a) =>
                      void a.costs.extras.push({
                        id: `extra-${a.costs.extras.length + 1}`,
                        label: "",
                        per: [0, 0],
                        on: false,
                      }),
                  )
                }
              >
                + Add extra
              </button>
            </fieldset>
            <Text
              id="f-pc"
              type="date"
              label="Prices checked"
              value={draft.costs.pricesChecked ?? ""}
              onChange={(v) => edit((a) => void (a.costs.pricesChecked = v || null))}
              error={err("costs.pricesChecked")}
            />
          </Section>

          <Section id="visit" title="Plan your visit">
            <Text
              id="f-bt"
              label="Best time"
              multiline
              value={draft.visit.bestTime}
              onChange={(v) => edit((a) => void (a.visit.bestTime = v))}
            />
            <Text
              id="f-hours"
              label="Hours"
              value={draft.visit.hours}
              onChange={(v) => edit((a) => void (a.visit.hours = v))}
            />
            <StringList
              label="What to bring"
              value={draft.visit.bring}
              onChange={(v) => edit((a) => void (a.visit.bring = v))}
            />
            <StringList
              label="Facilities"
              value={draft.visit.facilities}
              onChange={(v) => edit((a) => void (a.visit.facilities = v))}
            />
            <Text
              id="f-access"
              label="Access"
              multiline
              value={draft.visit.access}
              onChange={(v) => edit((a) => void (a.visit.access = v))}
            />
            <StringList
              label="Stay safe"
              value={draft.visit.safety}
              onChange={(v) => edit((a) => void (a.visit.safety = v))}
            />
          </Section>

          <Section
            id="geo"
            title="Map lines and facilities"
            description="The walking line, toilets and cafés, and the routes of the trip from Central and the way back, drawn on the map above. Paste GeoJSON to replace them, check it against the official map, then say where it came from and when you checked it."
          >
            <GeoEditor value={draft.geo} onChange={(g) => edit((a) => void (a.geo = g))} err={err} />
          </Section>

          <Section
            id="access"
            title="Access facts"
            description="For the Pram-friendly and Step-free filters. Fill these in only from the venue's or NSW National Parks' own information, never a guess; leave them off until checked."
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!draft.access}
                onChange={(e) =>
                  edit(
                    (a) =>
                      void (e.target.checked
                        ? (a.access = { prams: "no", stepFree: "no", accessibleToilet: false })
                        : delete a.access),
                  )
                }
              />{" "}
              Access has been checked
            </label>
            {draft.access && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    id="f-prams"
                    label="Prams"
                    value={draft.access.prams}
                    options={ACCESS_LEVELS}
                    onChange={(v) => edit((a) => void (a.access!.prams = v))}
                  />
                  <Select
                    id="f-step"
                    label="Step-free"
                    value={draft.access.stepFree}
                    options={ACCESS_LEVELS}
                    onChange={(v) => edit((a) => void (a.access!.stepFree = v))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.access.accessibleToilet}
                    onChange={(e) => edit((a) => void (a.access!.accessibleToilet = e.target.checked))}
                  />{" "}
                  Accessible toilet
                </label>
                <Text
                  id="f-anotes"
                  label="Access notes (optional)"
                  multiline
                  value={draft.access.notes ?? ""}
                  onChange={(v) => edit((a) => void (v ? (a.access!.notes = v) : delete a.access!.notes))}
                  error={err("access.notes")}
                  hint="Shown with the facts, e.g. which entrance is step-free. Under 240 characters."
                />
              </>
            )}
          </Section>

          <Section
            id="unconfirmed"
            title="Not yet confirmed"
            description="Details you couldn't confirm with an official source. Each shows on the activity page as 'Not yet confirmed' in its section, written for visitors (say which figure is a guess), with a way to check it where there is one. Remove the line once someone confirms it (and correct the detail if needed)."
          >
            {(draft.unconfirmed ?? []).map((u, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
              >
                <Select
                  id={`f-unc-s-${i}`}
                  label="Section"
                  value={u.section}
                  options={unconfirmedSections.map((v) => ({ value: v, label: UNCONFIRMED_LABEL[v] }))}
                  onChange={(v) => edit((a) => void (a.unconfirmed![i].section = v))}
                />
                <Text
                  id={`f-unc-n-${i}`}
                  label="What isn't confirmed"
                  value={u.note}
                  max={200}
                  onChange={(v) => edit((a) => void (a.unconfirmed![i].note = v))}
                  error={err(`unconfirmed.${i}.note`)}
                />
                <button
                  type="button"
                  className={dangerCls}
                  onClick={() =>
                    edit((a) => void (a.unconfirmed!.splice(i, 1), a.unconfirmed!.length || delete a.unconfirmed))
                  }
                >
                  Confirmed: remove
                </button>
                <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
                  <Text
                    id={`f-unc-cl-${i}`}
                    label="How to check: link text"
                    value={u.check?.label ?? ""}
                    max={60}
                    onChange={(v) =>
                      edit((a) => {
                        const url = a.unconfirmed![i].check?.url ?? "";
                        if (!v && !url) delete a.unconfirmed![i].check;
                        else a.unconfirmed![i].check = { label: v, url };
                      })
                    }
                    error={err(`unconfirmed.${i}.check.label`)}
                    hint="Optional. Names the source, e.g. Opal fares on Transport for NSW, Call Wylie's Baths."
                  />
                  <Text
                    id={`f-unc-cu-${i}`}
                    label="How to check: link"
                    value={u.check?.url ?? ""}
                    max={500}
                    onChange={(v) =>
                      edit((a) => {
                        const label = a.unconfirmed![i].check?.label ?? "";
                        if (!v && !label) delete a.unconfirmed![i].check;
                        else a.unconfirmed![i].check = { label, url: v };
                      })
                    }
                    error={err(`unconfirmed.${i}.check.url`)}
                    hint="The page with the answer (https://…), or tel:+612… for a number to call."
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className={btnCls}
              onClick={() => edit((a) => void (a.unconfirmed ??= []).push({ section: "cost", note: "" }))}
            >
              + Add unconfirmed detail
            </button>
          </Section>

          <Section
            id="pairings"
            title="Make a day of it"
            description="2–3 nearby activities. Each must be another activity here; unpublished ones show as plain text on the site."
          >
            {draft.pairings.map((p, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                <Select
                  id={`f-pair-${i}`}
                  label="Activity"
                  value={p.activityId}
                  options={[{ value: "", label: "Choose…" }, ...others.map((o) => ({ value: o.id, label: o.name }))]}
                  onChange={(v) =>
                    edit(
                      (a) =>
                        void ((a.pairings[i].activityId = v),
                        (a.pairings[i].name = others.find((o) => o.id === v)?.name ?? "")),
                    )
                  }
                />
                <Text
                  id={`f-pair-d-${i}`}
                  label="How far"
                  value={p.dist}
                  onChange={(v) => edit((a) => void (a.pairings[i].dist = v))}
                  hint="e.g. 10 min walk"
                />
                <div className="sm:col-span-2">
                  <Text
                    id={`f-pair-w-${i}`}
                    label="Why"
                    value={p.why}
                    onChange={(v) => edit((a) => void (a.pairings[i].why = v))}
                  />
                </div>
                <button
                  type="button"
                  className={`${btnCls} justify-self-start`}
                  onClick={() => edit((a) => void a.pairings.splice(i, 1))}
                >
                  Remove pairing
                </button>
              </div>
            ))}
            <button
              type="button"
              className={btnCls}
              onClick={() => edit((a) => void a.pairings.push({ activityId: "", name: "", why: "", dist: "" }))}
            >
              + Add pairing
            </button>
          </Section>

          <Section id="links" title="Links" description="Official pages: the venue, bookings, park alerts.">
            {(draft.links ?? []).map((l, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <Text
                  id={`f-ll-${i}`}
                  label="Label"
                  value={l.label}
                  onChange={(v) => edit((a) => void (a.links![i].label = v))}
                />
                <Text
                  id={`f-lu-${i}`}
                  label="URL"
                  type="url"
                  value={l.url}
                  onChange={(v) => edit((a) => void (a.links![i].url = v))}
                  error={err(`links.${i}.url`)}
                />
                <button
                  type="button"
                  className={btnCls}
                  aria-label={`Remove link ${l.label}`}
                  onClick={() => edit((a) => void (a.links!.splice(i, 1), a.links!.length || delete a.links))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={btnCls}
              onClick={() => edit((a) => void (a.links = [...(a.links ?? []), { label: "", url: "https://" }]))}
            >
              + Add link
            </button>
          </Section>

          {user.role === "owner" && !live && (
            <section className="rounded-2xl border border-red-200 bg-white p-5">
              <h2 className="font-bold text-red-800">Delete</h2>
              <p className="mt-1 text-sm text-slate-600">
                Only for activities that were never published and that nothing pairs with. History is deleted too.
              </p>
              <button
                type="button"
                className={`${dangerCls} mt-3`}
                onClick={async () => {
                  if (!confirm(`Delete ${draft.name} permanently?`)) return;
                  try {
                    await api(`activities/${id}`, { method: "DELETE" });
                    navigate("/admin");
                  } catch (e) {
                    const a = e as ApiError;
                    setMessage({ kind: "error", text: a.message, problems: a.problems });
                  }
                }}
              >
                Delete activity
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** Step-by-step legs (Getting there). */
function LegsEditor({
  legs,
  onChange,
  idPrefix,
  errors,
}: {
  legs: Leg[];
  onChange: (l: Leg[]) => void;
  idPrefix: string;
  errors: string[];
}) {
  const set = (i: number, patch: Partial<Leg>) =>
    onChange(legs.map((l, j) => (j === i ? ({ ...l, ...patch } as Leg) : l)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Steps</legend>
      {legs.map((l, i) => (
        <div
          key={i}
          className="grid items-end gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[110px_80px_1fr_70px_auto]"
        >
          <Select
            id={`${idPrefix}-m-${i}`}
            label={`Step ${i + 1}`}
            value={l.mode}
            options={LEG_MODES}
            onChange={(v) => set(i, { mode: v })}
          />
          <Text
            id={`${idPrefix}-l-${i}`}
            label="Line"
            value={l.line ?? ""}
            placeholder="T4"
            onChange={(v) => set(i, { line: v || undefined })}
          />
          <Text id={`${idPrefix}-t-${i}`} label="Instruction" value={l.title} onChange={(v) => set(i, { title: v })} />
          <NumberInput
            id={`${idPrefix}-n-${i}`}
            label="Min"
            min={1}
            value={l.mins}
            onChange={(v) => set(i, { mins: v })}
          />
          <div className="flex gap-1 pb-0.5">
            <button
              type="button"
              className={btnCls}
              aria-label={`Move step ${i + 1} up`}
              disabled={i === 0}
              onClick={() => onChange(legs.map((x, j) => (j === i - 1 ? legs[i] : j === i ? legs[i - 1] : x)))}
            >
              ↑
            </button>
            <button
              type="button"
              className={btnCls}
              aria-label={`Remove step ${i + 1}`}
              disabled={legs.length === 1}
              onClick={() => onChange(legs.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
          <div className="sm:col-span-5">
            <Text
              id={`${idPrefix}-d-${i}`}
              label="Detail (optional)"
              value={l.detail ?? ""}
              placeholder="Every 10 min on weekends"
              onChange={(v) => set(i, { detail: v || undefined })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className={btnCls}
        onClick={() => onChange([...legs, { mode: "walk", title: "", mins: 5 }])}
      >
        + Add step
      </button>
      {errors.map((e) => (
        <p key={e} className="text-xs font-semibold text-red-700" role="alert">
          {e}
        </p>
      ))}
    </fieldset>
  );
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
const points = (ls: readonly unknown[][] | undefined) => ls?.reduce((n, l) => n + l.length, 0) ?? 0;
const legWords = (legs: MapLeg[] | undefined) =>
  legs?.length ? legs.map((l) => (l.line ? `${l.mode} ${l.line}` : l.mode)).join(" › ") : "none";

/** A paste box: parses the JSON and hands it on, or says what's wrong. */
function Paste({
  id,
  label,
  button,
  onUse,
}: {
  id: string;
  label: string;
  button: string;
  onUse: (json: unknown) => string | null;
}) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const go = () => {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return setProblem("That isn't valid JSON.");
    }
    const p = onUse(json);
    setProblem(p);
    if (!p) setText("");
  };
  return (
    <div className="space-y-2">
      <Text id={id} label={label} multiline value={text} onChange={setText} />
      <button type="button" className={btnCls} onClick={go} disabled={!text.trim()}>
        {button}
      </button>
      {problem && <Notice kind="error">{problem}</Notice>}
    </div>
  );
}

/** The legs of the trip from Central or the way back: mode and line per leg, coordinates from GeoJSON. */
function MapLegs({
  which,
  label,
  noun,
  legs,
  onChange,
  err,
}: {
  which: "trip" | "back";
  label: string;
  noun: string;
  legs: MapLeg[] | undefined;
  onChange: (l: MapLeg[] | undefined) => void;
  err: (path: string) => string[] | undefined;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 font-bold">{label}</legend>
      {legs?.length ? (
        <>
          <ol className="space-y-2">
            {legs.map((l, i) => (
              <li
                key={i}
                className="grid items-end gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[190px_110px_1fr_auto]"
              >
                <Select
                  id={`f-${which}-m-${i}`}
                  label={`${label} line ${i + 1} mode`}
                  value={l.mode}
                  options={MAP_LEG_MODES}
                  onChange={(v) => onChange(legs.map((x, j) => (j === i ? { ...x, mode: v } : x)))}
                />
                <Text
                  id={`f-${which}-l-${i}`}
                  label="Line"
                  value={l.line ?? ""}
                  placeholder="T4"
                  onChange={(v) => onChange(legs.map((x, j) => (j === i ? { ...x, line: v || undefined } : x)))}
                />
                <p className="pb-2 text-xs text-slate-500">{l.coords.length} points</p>
                <button
                  type="button"
                  className={btnCls}
                  aria-label={`Remove ${noun} line ${i + 1}`}
                  onClick={() => onChange(legs.length > 1 ? legs.filter((_, j) => j !== i) : undefined)}
                >
                  ✕
                </button>
                {err(`geo.${which}.legs.${i}.coords`)?.map((e) => (
                  <p key={e} className="text-xs font-semibold text-red-700 sm:col-span-4" role="alert">
                    {e}
                  </p>
                ))}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="text-sm font-semibold text-red-700 underline"
            onClick={() => onChange(undefined)}
          >
            Remove the {noun} from the map
          </button>
        </>
      ) : (
        <p className="text-sm text-slate-600">Not drawn on the map.</p>
      )}
      <Paste
        id={`f-geojson-${which}`}
        label={`Paste GeoJSON for the ${noun} (one line per leg, in order)`}
        button={`Use for the ${noun}`}
        onUse={(json) => {
          const l = legsFromGeoJson(json);
          if (!l.length) return "No lines found in that GeoJSON.";
          onChange(l);
          return null;
        }}
      />
      <p className="text-xs text-slate-500">
        Each leg's mode and line come from the features' mode and line properties when they have them; otherwise set
        them above.
      </p>
    </fieldset>
  );
}

/**
 * The map's lines and facilities (spec §4.3 "Maps (D15)"): paste GeoJSON for the walking line and
 * toilets / cafés, and separately for the trip from Central and the way back. Places stay as they are
 * (they're edited in the Places editor). Plus where it all came from, and when an editor checked it.
 */
function GeoEditor({
  value,
  onChange,
  err,
}: {
  value: Activity["geo"];
  onChange: (g: Activity["geo"]) => void;
  err: (path: string) => string[] | undefined;
}) {
  const set = (patch: Partial<Activity["geo"]>) => {
    const g = { ...value, ...patch };
    for (const k of ["trail", "facilities", "trip", "back"] as const) if (g[k] === undefined) delete g[k];
    onChange(g);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm" aria-live="polite">
        Walking line: {value.trail?.length ?? 0} part(s), {points(value.trail)} points. Toilets and cafés:{" "}
        {value.facilities?.length ?? 0}. Trip from Central: {legWords(value.trip?.legs)}. Way back:{" "}
        {legWords(value.back?.legs)}.
      </p>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 font-bold">Walking line and facilities</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {value.trail && (
            <button
              type="button"
              className="text-sm font-semibold text-red-700 underline"
              onClick={() => set({ trail: undefined })}
            >
              Remove the walking line
            </button>
          )}
          {value.facilities && (
            <button
              type="button"
              className="text-sm font-semibold text-red-700 underline"
              onClick={() => set({ facilities: undefined })}
            >
              Remove toilets and cafés
            </button>
          )}
        </div>
        <Paste
          id="f-geojson"
          label="Paste GeoJSON for the walking line and facilities"
          button="Use this GeoJSON"
          onUse={(json) => {
            const g = geoFromGeoJson(json);
            if (!g.trail && !g.facilities) return "No lines or toilet / café points found in that GeoJSON.";
            // Lines replace the walking line; toilet / café points replace the facilities. Places are kept.
            set(g);
            return null;
          }}
        />
        <p className="text-xs text-slate-500">
          Lines become the walking line; points tagged amenity=toilets or amenity=cafe (or kind=toilet / cafe) become
          facilities. What the paste doesn't have is kept.
        </p>
        {err("geo.trail")?.map((e) => (
          <p key={e} className="text-xs font-semibold text-red-700" role="alert">
            Walking line: {e}
          </p>
        ))}
      </fieldset>
      <MapLegs
        which="trip"
        label="Trip from Central"
        noun="trip from Central"
        legs={value.trip?.legs}
        onChange={(l) => set({ trip: l ? { legs: l } : undefined })}
        err={err}
      />
      <MapLegs
        which="back"
        label="Way back"
        noun="way back"
        legs={value.back?.legs}
        onChange={(l) => set({ back: l ? { legs: l } : undefined })}
        err={err}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Text
          id="f-geosrc"
          label="Source"
          value={value.source}
          onChange={(v) => set({ source: v })}
          hint="e.g. OpenStreetMap contributors (ODbL), Transport for NSW (CC BY 4.0), NSW National Parks (CC BY 4.0)"
          error={err("geo.source")}
        />
        <div className="space-y-1">
          <Text
            id="f-geochk"
            type="date"
            label="Map checked"
            value={value.checked ?? ""}
            onChange={(v) => set({ checked: v || null })}
            error={err("geo.checked")}
            hint="Leave empty until someone has checked the places and lines against the official map."
          />
          <button type="button" className={btnCls} onClick={() => set({ checked: today() })}>
            Map checked today
          </button>
        </div>
      </div>
      <Notice kind="info">
        To start again from open data, a developer runs{" "}
        <code>node --env-file=.dev.vars scripts/map/build-geo.mjs --write {"<activity id>"}</code>, which rewrites the
        seed file's map; <code>.map-data/geo-report.md</code> lists the places it estimated and trips that don't match
        the written route. Paste its lines here (or reseed a local database) and check them before publishing.
      </Notice>
    </div>
  );
}
