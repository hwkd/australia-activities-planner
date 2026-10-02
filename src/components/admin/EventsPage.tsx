import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { EventItem } from "~/content/eventSchema";
import type { EventSummary } from "~/server/events";
import { slugify } from "~/lib/activityTemplate";
import { todayInSydney, type DateStr } from "~/lib/dates";
import { datesLabel } from "~/lib/events";
import { api, ApiError, navigate } from "./api";
import { btnCls, Link, Notice, primaryCls, Select, Text } from "./ui";

/** Events in the admin (spec §11.4, tracker M15): the list and "New event". The editor is EventEditor.tsx. */

/**
 * A blank event. Facts that must come from the official page (dates, venue, link, blurb, the day it
 * was checked) start empty, so it can be saved as a draft but not published until they're filled in.
 */
export function newEvent(id: string, name: string): EventItem {
  return {
    id,
    name,
    blurb: "",
    start: "",
    end: "",
    area: "",
    venue: { name: "", lat: NaN, lng: NaN },
    weatherFit: { sunny: 2, cloudy: 1, rainy: 0, hot: 1 },
    goodFor: ["friends"],
    duration: { label: "2–3 hrs", minHours: 2, maxHours: 3 },
    cost: "Free",
    suggestedStart: "10:00",
    link: { label: "Official page", url: "" },
    checked: "",
  };
}

/** "Sat 3 Oct – Mon 5 Oct", or a note while the dates are still empty. */
export const eventDates = (start: string, end: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) ? datesLabel(start as DateStr, end as DateStr) : "No dates yet";

/** Where an event stands on the public site. */
export function siteState(e: { published: boolean; changed: boolean; publishedEnd: string | null }, today: string) {
  if (!e.published) return "Not published";
  if (e.publishedEnd && e.publishedEnd < today) return "Ended · off the site";
  return e.changed ? "Live · changes not published" : "Live";
}

export function EventList() {
  const [list, setList] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "live" | "unpublished" | "ended">("all");
  const today = todayInSydney();
  useEffect(() => {
    api<{ events: EventSummary[] }>("events").then((r) => setList(r.events), (e) => setError((e as Error).message));
  }, []);
  const shown = useMemo(() => {
    const ended = (e: EventSummary) => !!e.end && e.end < today;
    return (list ?? [])
      .filter(
        (e) =>
          (!q || `${e.name} ${e.id}`.toLowerCase().includes(q.toLowerCase())) &&
          (state === "all" ||
            (state === "live" && e.published && !(e.publishedEnd && e.publishedEnd < today)) ||
            (state === "unpublished" && !e.published) ||
            (state === "ended" && ended(e)))
      )
      .sort((a, b) => Number(ended(a)) - Number(ended(b)) || (ended(a) ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)) || a.name.localeCompare(b.name, "en-AU"));
  }, [list, q, state, today]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-2xl font-bold">Events</h1>
        <Link to="/admin/events/new" className={primaryCls}>
          + New event
        </Link>
      </div>
      <p className="text-sm text-slate-500">A few curated highlights a fortnight (around 3 to 10), not a listings feed. Each leaves the site after its end date.</p>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Text id="q" label="Search" value={q} onChange={setQ} placeholder="Name or id" />
        <Select
          id="state"
          label="Show"
          value={state}
          options={[
            { value: "all", label: "All" },
            { value: "live", label: "On the site" },
            { value: "unpublished", label: "Not published" },
            { value: "ended", label: "Ended" },
          ]}
          onChange={setState}
        />
      </div>
      {!list ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Events</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Dates</th>
                <th className="px-4 py-2.5">On the site</th>
                <th className="px-4 py-2.5">Last saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/admin/events/${e.id}`} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                      {e.name}
                    </Link>
                    <div className="text-xs text-slate-500">{e.id}</div>
                  </td>
                  <td className="px-4 py-2.5">{eventDates(e.start, e.end)}</td>
                  <td className="px-4 py-2.5">{siteState(e, today)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {new Date(e.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    {e.updatedBy ? ` · ${e.updatedBy}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="p-4 text-sm text-slate-500">{list.length ? "Nothing matches." : "No events yet."}</p>}
        </div>
      )}
      <p className="text-xs text-slate-500">
        {list?.length ?? 0} events · {list?.filter((e) => e.published && !(e.publishedEnd && e.publishedEnd < today)).length ?? 0} on the site
      </p>
    </div>
  );
}

export function NewEvent() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [from, setFrom] = useState("");
  const [list, setList] = useState<EventSummary[]>([]);
  const [error, setError] = useState<{ text: string; problems: string[] } | null>(null);
  useEffect(() => {
    api<{ events: EventSummary[] }>("events").then((r) => setList(r.events));
  }, []);
  const auto = slugify(name);
  const slug = idTouched ? id : auto ? `e-${auto}` : "";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      let event = newEvent(slug, name.trim());
      if (from) {
        const base = await api<{ draft: EventItem }>(`events/${from}`);
        // A copy keeps the venue, link and fit to adapt; dates and the check are this event's own.
        event = { ...structuredClone(base.draft), id: slug, name: name.trim(), start: "", end: "", checked: "" };
      }
      await api("events", { method: "POST", body: { event } });
      navigate(`/admin/events/${slug}`);
    } catch (err) {
      const a = err as ApiError;
      setError({ text: a.message, problems: a.problems });
    }
  };
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold">New event</h1>
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
        label="ID"
        value={slug}
        onChange={(v) => {
          setIdTouched(true);
          setId(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
        }}
        hint="Starts with e-, then lowercase words joined by hyphens. Plans and share links use it, so it can't be changed later."
      />
      <Select id="n-from" label="Start from" value={from} options={[{ value: "", label: "A blank event" }, ...list.map((e) => ({ value: e.id, label: `A copy of ${e.name}` }))]} onChange={setFrom} />
      <p className="text-xs text-slate-500">A copy keeps the venue, link, weather and who it suits to adapt, but starts with no dates and unchecked.</p>
      <div className="flex gap-2">
        <button type="submit" className={primaryCls} disabled={!name.trim() || !/^e-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)}>
          Create draft
        </button>
        <Link to="/admin/events" className={btnCls}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
