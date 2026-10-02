import { useCallback, useEffect, useMemo, useState } from "react";
import { eventSchema, type EventItem } from "~/content/eventSchema";
import type { ActivitySummary } from "~/server/activities";
import type { User } from "~/server/auth";
import { todayInSydney } from "~/lib/dates";
import { api, ApiError, navigate } from "./api";
import { btnCls, Checks, dangerCls, Link, Notice, NumberInput, primaryCls, Section, Select, Text } from "./ui";
import { eventDates } from "./EventsPage";

const GROUPS = [
  { value: "date", label: "Date" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "solo", label: "Solo" },
] as const;
const FIT = [
  { v: 0, label: "Skip" },
  { v: 1, label: "Fine" },
  { v: 2, label: "Perfect" },
] as const;

const SECTIONS = [
  ["basics", "Basics"],
  ["dates", "Dates and time"],
  ["venue", "Venue"],
  ["weather", "Weather"],
  ["who", "Who"],
  ["checked", "Checked"],
] as const;
/** Which schema fields each section holds (to colour the section nav when one has a problem). */
const SECTION_FIELDS: Record<(typeof SECTIONS)[number][0], string[]> = {
  basics: ["id", "name", "blurb", "area", "cost", "link", "activityId"],
  dates: ["start", "end", "suggestedStart", "duration"],
  venue: ["venue"],
  weather: ["weatherFit"],
  who: ["goodFor"],
  checked: ["checked"],
};

interface Record_ {
  draft: EventItem;
  published: EventItem | null;
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

const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The event editor (spec §11.4, tracker M15): every field of an event, checked live against the site's schema. */
export default function EventEditor({ id, user }: { id: string; user: User }) {
  const [rec, setRec] = useState<Record_ | null>(null);
  const [draft, setDraft] = useState<EventItem | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "warn"; text: string; problems?: string[] } | null>(null);
  const [history, setHistory] = useState<Revision[] | null>(null);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const today = todayInSydney();

  const apply = (r: Record_) => {
    setRec(r);
    setDraft(structuredClone(r.draft));
    setVersion(r.version);
  };
  const load = useCallback(async () => apply(await api<Record_>(`events/${id}`)), [id]);
  useEffect(() => {
    let live = true;
    api<Record_>(`events/${id}`).then(
      (r) => live && apply(r),
      (e) => live && setMessage({ kind: "error", text: (e as Error).message })
    );
    api<{ activities: ActivitySummary[] }>("activities").then((r) => live && setActivities(r.activities), () => {});
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

  const parsed = useMemo(() => (draft ? eventSchema.safeParse(draft) : null), [draft]);
  const errors = useMemo(() => {
    const m = new Map<string, string[]>();
    if (parsed && !parsed.success) for (const i of parsed.error.issues) m.set(i.path.join("."), [...(m.get(i.path.join(".")) ?? []), i.message]);
    return m;
  }, [parsed]);
  const err = (path: string) => errors.get(path);
  const sectionHasErrors = (sid: (typeof SECTIONS)[number][0]) => [...errors.keys()].some((k) => SECTION_FIELDS[sid].some((f) => k === f || k.startsWith(f + ".")));
  // A draft can be saved half-written; it needs a name (the id is fixed).
  const savable = !!draft?.name.trim() && draft.name.length <= 80;

  const edit = (fn: (e: EventItem) => void) =>
    setDraft((d) => {
      const n = structuredClone(d!);
      fn(n);
      return n;
    });

  const save = useCallback(async () => {
    if (!draft || busy || !dirty || !savable) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ version: number; warnings: string[] }>(`events/${id}`, { method: "PUT", body: { event: draft, version } });
      setVersion(r.version);
      setRec((x) => (x ? { ...x, draft: structuredClone(draft), version: r.version, updatedAt: new Date().toISOString() } : x));
      setMessage(r.warnings.length ? { kind: "warn", text: "Saved as a draft. Fix these before publishing:", problems: r.warnings } : { kind: "ok", text: "Saved as a draft. The public site still shows the published version." });
    } catch (e) {
      const a = e as ApiError;
      setMessage({ kind: "error", text: a.message, problems: a.problems });
    } finally {
      setBusy(false);
    }
  }, [draft, busy, dirty, savable, id, version]);

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

  const action = async (path: string, ok: string, body: Record<string, unknown> = {}) => {
    setBusy(true);
    setMessage(null);
    try {
      await api(`events/${id}/${path}`, { method: "POST", body: { ...body, version } });
      await load();
      setMessage({ kind: "ok", text: ok });
      if (history) setHistory((await api<{ revisions: Revision[] }>(`events/${id}/revisions`)).revisions);
    } catch (e) {
      const a = e as ApiError;
      setMessage({ kind: "error", text: a.message, problems: a.problems });
    } finally {
      setBusy(false);
    }
  };

  if (!draft || !rec) return message ? <Notice kind="error">{message.text}</Notice> : <p className="text-slate-500">Loading…</p>;

  const live = !!rec.published;
  const liveDiffers = live && JSON.stringify(rec.published) !== JSON.stringify(rec.draft);
  const ended = live && rec.published!.end < today;
  const linkOptions = [
    { value: "", label: "None" },
    ...activities.map((a) => ({ value: a.id, label: a.published ? a.name : `${a.name} · unpublished` })),
    // Keep an unknown id visible rather than silently showing "None".
    ...(draft.activityId && !activities.some((a) => a.id === draft.activityId) ? [{ value: draft.activityId, label: `${draft.activityId} (not found)` }] : []),
  ];

  return (
    <div>
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/events" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            ← Events
          </Link>
          <h1 className="mr-auto min-w-0 truncate text-xl font-bold">{draft.name || "Untitled"}</h1>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{eventDates(draft.start, draft.end)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${live && !ended ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-700"}`}>
            {live ? (ended ? "Ended · off the site" : liveDiffers ? "Live · saved changes not published" : "Live") : "Not published"}
          </span>
          {dirty && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">Unsaved changes</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={primaryCls} disabled={!dirty || busy || !savable} onClick={() => void save()} title="Ctrl/Cmd+S">
            Save draft
          </button>
          <button
            type="button"
            className={btnCls}
            disabled={busy || dirty || !parsed?.success || (live && !liveDiffers)}
            title={!parsed?.success ? "Fix the fields listed below first" : undefined}
            onClick={() => void action("publish", "Published. It's live now.")}
          >
            {live ? "Publish changes" : "Publish"}
          </button>
          {live && (
            <button type="button" className={btnCls} disabled={busy || dirty} onClick={() => confirm(`Take ${draft.name} off the public site? Plans that include it will show it as unavailable.`) && void action("unpublish", "Unpublished.")}>
              Unpublish
            </button>
          )}
          {draft.link.url && (
            <a className={btnCls} href={draft.link.url} target="_blank" rel="noopener noreferrer">
              Official page<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <button type="button" className={btnCls} onClick={async () => setHistory(history ? null : (await api<{ revisions: Revision[] }>(`events/${id}/revisions`)).revisions)}>
            {history ? "Hide history" : "History"}
          </button>
          {dirty && (
            <button type="button" className={btnCls} onClick={() => confirm("Discard your unsaved changes?") && setDraft(structuredClone(rec.draft))}>
              Discard changes
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">
            Saved {when(rec.updatedAt)}
            {rec.publishedAt ? ` · published ${when(rec.publishedAt)}` : ""}
          </span>
        </div>
        {dirty && <p className="mt-1 text-xs text-slate-500">Save before publishing: Publish uses the last saved draft.</p>}
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
              <button type="button" className={`${btnCls} mt-2`} onClick={() => confirm("Reload? Your unsaved changes will be lost.") && void load().then(() => setMessage(null))}>
                Reload their version
              </button>
            )}
          </Notice>
        )}
        {parsed && !parsed.success && (
          <Notice kind="warn">
            <p className="font-semibold">
              {errors.size} {errors.size === 1 ? "field needs" : "fields need"} filling in or fixing before you can publish:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {[...errors.entries()].slice(0, 10).map(([k, v]) => (
                <li key={k}>
                  {k || "event"}: {v.join("; ")}
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
                      onClick={() => confirm(`Make version ${r.version} the draft? You can publish it afterwards.`) && void action("restore", `Restored version ${r.version} as the draft. Publish to make it live.`, { revision: r.id })}
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
                <a href={`#${sid}`} className={`block rounded-lg px-3 py-1.5 font-semibold hover:bg-white ${sectionHasErrors(sid) ? "text-red-700" : "text-slate-700"}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-5">
          <Section id="basics" title="Basics" description="A curated highlight: say why it's worth going, in one line.">
            <Text id="f-id" label="ID" value={draft.id} onChange={() => {}} readOnly hint="Fixed: plans and share links use it." />
            <Text id="f-name" label="Name" value={draft.name} onChange={(v) => edit((e) => void (e.name = v))} error={err("name")} />
            <Text id="f-blurb" label="Blurb" value={draft.blurb} max={90} onChange={(v) => edit((e) => void (e.blurb = v))} error={err("blurb")} hint="One line on the card." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text id="f-area" label="Area" value={draft.area} onChange={(v) => edit((e) => void (e.area = v))} error={err("area")} hint="Suburb or park, e.g. Darling Harbour" />
              <Select id="f-cost" label="Cost tier (cards)" value={draft.cost} options={["Free", "$", "$$", "$$$"] as const} onChange={(v) => edit((e) => void (e.cost = v))} error={err("cost")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Text id="f-ll" label="Link label" value={draft.link.label} onChange={(v) => edit((e) => void (e.link.label = v))} error={err("link.label")} hint="e.g. Official page, Tickets" />
              <Text id="f-lu" type="url" label="Link URL" value={draft.link.url} onChange={(v) => edit((e) => void (e.link.url = v))} error={err("link.url")} placeholder="https://" hint="The official page, where visitors check times and book." />
            </div>
            <Select
              id="f-act"
              label="Linked activity (optional)"
              value={draft.activityId ?? ""}
              options={linkOptions}
              onChange={(v) => edit((e) => void (v ? (e.activityId = v) : delete e.activityId))}
              error={err("activityId")}
            />
            <p className="text-xs text-slate-500">When it's at a place that's already an activity (a festival at the Botanic Garden, say). It must be published before the event can be.</p>
          </Section>

          <Section id="dates" title="Dates and time" description="Only days it's on: if it skips days, use the first run of days, or make separate events.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Text id="f-start" type="date" label="First day" value={draft.start} onChange={(v) => edit((e) => void (e.start = v))} error={err("start")} />
              <Text id="f-end" type="date" label="Last day" value={draft.end} onChange={(v) => edit((e) => void (e.end = v))} error={err("end")} hint="It leaves the site after this day." />
              <Text id="f-ss" type="time" label="Suggested start" value={draft.suggestedStart} onChange={(v) => edit((e) => void (e.suggestedStart = v))} error={err("suggestedStart")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Text id="f-dl" label="Duration label" value={draft.duration.label} onChange={(v) => edit((e) => void (e.duration.label = v))} error={err("duration.label")} hint="e.g. 2–3 hrs" />
              <NumberInput id="f-dmin" label="Min hours" step={0.5} value={draft.duration.minHours} onChange={(v) => edit((e) => void (e.duration.minHours = v))} error={err("duration.minHours") ?? err("duration")} />
              <NumberInput id="f-dmax" label="Max hours" step={0.5} value={draft.duration.maxHours} onChange={(v) => edit((e) => void (e.duration.maxHours = v))} error={err("duration.maxHours")} />
            </div>
          </Section>

          <Section id="venue" title="Venue" description="Where it is: the forecast and Add to your calendar use it.">
            <Text id="f-vn" label="Venue name" value={draft.venue.name} onChange={(v) => edit((e) => void (e.venue.name = v))} error={err("venue.name")} hint="e.g. Tumbalong Park" />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput id="f-lat" label="Latitude" step={0.0001} value={draft.venue.lat} onChange={(v) => edit((e) => void (e.venue.lat = v))} error={err("venue.lat")} hint="e.g. -33.8755" />
              <NumberInput id="f-lng" label="Longitude" step={0.0001} value={draft.venue.lng} onChange={(v) => edit((e) => void (e.venue.lng = v))} error={err("venue.lng")} hint="e.g. 151.2009" />
            </div>
          </Section>

          <Section id="weather" title="Weather" description="How good it is in each sky, as for activities: Perfect, Fine (with a real downside) or Skip.">
            {(["sunny", "cloudy", "rainy", "hot"] as const).map((w) => (
              <fieldset key={w} className="flex flex-wrap items-center gap-3">
                <legend className="w-20 text-sm font-semibold capitalize">{w === "hot" ? "Hot 30°+" : w}</legend>
                {FIT.map((f) => (
                  <label key={f.v} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold ${draft.weatherFit[w] === f.v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}>
                    <input type="radio" className="sr-only" name={`fit-${w}`} checked={draft.weatherFit[w] === f.v} onChange={() => edit((e) => void (e.weatherFit[w] = f.v))} />
                    {f.label}
                  </label>
                ))}
              </fieldset>
            ))}
          </Section>

          <Section id="who" title="Who">
            <Checks label="Good for" value={draft.goodFor} options={GROUPS} onChange={(v) => edit((e) => void (e.goodFor = v))} error={err("goodFor")} />
          </Section>

          <Section id="checked" title="Checked" description="Check the dates, times, price and venue against the official page, then set the day you did.">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48">
                <Text id="f-checked" type="date" label="Checked on" value={draft.checked} onChange={(v) => edit((e) => void (e.checked = v))} error={err("checked")} />
              </div>
              <button type="button" className={btnCls} onClick={() => edit((e) => void (e.checked = today))}>
                Checked today
              </button>
            </div>
          </Section>

          {user.role === "owner" && !live && (
            <section className="rounded-2xl border border-red-200 bg-white p-5">
              <h2 className="font-bold text-red-800">Delete</h2>
              <p className="mt-1 text-sm text-slate-600">Only for events that aren't on the site. History is deleted too.</p>
              <button
                type="button"
                className={`${dangerCls} mt-3`}
                onClick={async () => {
                  if (!confirm(`Delete ${draft.name} permanently?`)) return;
                  try {
                    await api(`events/${id}`, { method: "DELETE" });
                    navigate("/admin/events");
                  } catch (e) {
                    const a = e as ApiError;
                    setMessage({ kind: "error", text: a.message, problems: a.problems });
                  }
                }}
              >
                Delete event
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
