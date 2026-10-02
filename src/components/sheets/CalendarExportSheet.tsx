import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $plan } from "~/stores/plan";
import { $sheet, type Sheet as SheetState } from "~/stores/ui";
import { eventFromInfo, googleLink, icsFileName, REMINDERS, toIcs, type CalendarEvent, type ExportInfo, type Reminder } from "~/lib/calendarExport";
import { clockLabel, shortLabel, todayInSydney } from "~/lib/dates";
import { sortItems, type PlanCard } from "~/lib/planDays";
import { track } from "~/lib/analytics";
import { Icon } from "~/theme/icons";
import Sheet from "./Sheet";
import { t } from "~/strings/en-AU";

const s = t.sheets.export;

type ExportSheet = Extract<NonNullable<SheetState>, { kind: "export" }>;
type Scope = ExportSheet["scope"];
type Target = "apple" | "google" | "outlook";

const TARGETS: { key: Target; label: string; note: string }[] = [
  { key: "apple", ...s.targets.apple },
  { key: "google", ...s.targets.google },
  { key: "outlook", ...s.targets.outlook },
];

let infoCache: Promise<Record<string, ExportInfo>> | null = null;
const loadInfo = () => (infoCache ??= fetch("/data/export.json").then((r) => r.json()));

/**
 * Add to your calendar (spec §3.3, §6.8): this plan, this day or everything coming up; Apple or
 * Outlook get a downloadable `.ics`, Google gets its add-event page per event. Reminder (file only),
 * Include directions, a preview of each event, then a done state. Lazy-loaded by SheetHost.
 */
export default function CalendarExportSheet({ sheet }: { sheet: ExportSheet; cards: ReadonlyMap<string, PlanCard> }) {
  const plan = useStore($plan);
  const today = todayInSydney();
  const [scope, setScope] = useState<Scope>(sheet.scope);
  const [target, setTarget] = useState<Target>("apple");
  const [remind, setRemind] = useState<Reminder>("2h");
  const [directions, setDirections] = useState(true);
  const [info, setInfo] = useState<Record<string, ExportInfo> | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    loadInfo().then((i) => live && setInfo(i), () => live && setInfo({}));
    return () => {
      live = false;
    };
  }, []);

  const scopes: { key: Scope; label: string }[] = [
    ...(sheet.activityId ? [{ key: "item" as const, label: s.scopeItem }] : []),
    ...(sheet.date ? [{ key: "day" as const, label: `${shortLabel(sheet.date)}` }] : []),
    { key: "all", label: s.scopeAll },
  ];

  const pairs: { date: string; id: string; start: string }[] = [];
  if (scope === "item" && sheet.date && sheet.activityId) {
    const it = plan.days[sheet.date]?.items.find((i) => i.id === sheet.activityId);
    if (it) pairs.push({ date: sheet.date, ...it });
  } else if (scope === "day" && sheet.date) {
    for (const it of sortItems(plan.days[sheet.date]?.items ?? [])) pairs.push({ date: sheet.date, ...it });
  } else {
    for (const d of Object.keys(plan.days).filter((d) => d >= today).sort()) for (const it of sortItems(plan.days[d].items)) pairs.push({ date: d, ...it });
  }
  const site = location.origin;
  const events: CalendarEvent[] = info ? pairs.filter((p) => info[p.id]).map((p) => eventFromInfo(info[p.id], p.date, p.start, { site, includeDirections: directions })) : [];
  const n = events.length;
  const isGoogle = target === "google";
  const fileName = icsFileName(scope === "all" ? undefined : sheet.date);
  const close = () => $sheet.set(null);

  const download = () => {
    const blob = new Blob([toIcs(events, remind)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    track({ name: "calendar_export", props: { target: "ics", scope } });
    setDone(true);
  };
  const openedGoogle = () => {
    track({ name: "calendar_export", props: { target: "google", scope } });
    if (n === 1) setDone(true);
  };

  const pill = (on: boolean) => ({ background: on ? "var(--sel)" : "var(--glass)", color: on ? "var(--sel-ink)" : "var(--ink)", borderColor: on ? "var(--sel)" : "var(--line)" });

  if (done) {
    return (
      <Sheet label={s.title} onClose={close}>
        <div className="px-5 pt-6 pb-5 text-center" aria-live="polite">
          <span className="pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--sel)", color: "var(--sel-ink)" }} aria-hidden="true">
            <Icon name="check" size={30} strokeWidth={3} />
          </span>
          <h2 className="w90 m-0 mt-4 text-[26px] leading-none font-bold" data-autofocus tabIndex={-1}>
            {isGoogle ? s.done.google : s.done.file}
          </h2>
          <p className="m-0 mt-2 text-sm" style={{ color: "var(--mute)" }}>
            {isGoogle ? s.done.googleNote : s.done.fileNote(fileName, n, directions)}
          </p>
          <button type="button" onClick={close} className="pb press mt-5" style={pill(true)}>
            {t.sheets.sheet.close}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      label={s.title}
      onClose={close}
      footer={
        <>
          <p className="m-0 mb-2.5 flex gap-2 text-[12.5px] leading-[1.4]" style={{ color: "var(--mute)" }}>
            <Icon name="info" size={15} className="mt-px shrink-0" />
            <span>
              {s.footer[target]}
              {!isGoogle && ` ${s.footer.reminder(remind === "none" ? null : REMINDERS.find((r) => r.key === remind)!.label)}`}
            </span>
          </p>
          {!isGoogle && (
            <button type="button" onClick={download} disabled={!n} className="pb press disabled:opacity-60" style={pill(true)}>
              <Icon name="calendar" size={19} strokeWidth={2.5} />
              {s.footer.download}
            </button>
          )}
          {isGoogle && n === 1 && (
            <a href={googleLink(events[0])} target="_blank" rel="noopener noreferrer" onClick={openedGoogle} className="pb press no-underline" style={pill(true)}>
              <Icon name="external" size={19} strokeWidth={2.5} />
              {s.footer.openGoogle}
              <span className="sr-only">{s.footer.newTab}</span>
            </a>
          )}
          {isGoogle && n > 1 && (
            <p className="m-0 text-sm font-semibold">{s.footer.googleMany}</p>
          )}
        </>
      }
    >
      <div className="flex items-start gap-2.5 pt-2 pr-2.5 pl-5">
        <div className="min-w-0 flex-1 pt-2">
          <p className="k m-0" style={{ color: "var(--mute)" }}>
            {s.events(n)}
          </p>
          <h2 className="w90 m-0 mt-2 text-[28px] leading-none font-bold tracking-[-0.03em]">{s.title}</h2>
        </div>
        <button type="button" aria-label={t.sheets.sheet.close} onClick={close} data-autofocus className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0" style={{ background: "var(--soft)" }}>
          <Icon name="close" size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="px-4 pt-4 pb-4">
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="k" style={{ color: "var(--mute)" }}>
            {s.whatToAdd}
          </legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {scopes.map((o) => (
              <button key={o.key} type="button" aria-pressed={scope === o.key} onClick={() => setScope(o.key)} className="press tr h-11 rounded-full border px-4 text-sm font-semibold" style={pill(scope === o.key)}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 mt-4 min-w-0 border-0 p-0">
          <legend className="k" style={{ color: "var(--mute)" }}>
            {s.calendar}
          </legend>
          <div className="mt-2 grid gap-1.5">
            {TARGETS.map((o) => (
              <button key={o.key} type="button" aria-pressed={target === o.key} onClick={() => setTarget(o.key)} className="press tr flex min-h-[52px] items-center gap-3 rounded-2xl border px-3.5 text-left" style={pill(target === o.key)}>
                <Icon name={o.key === "google" ? "external" : "calendar"} size={18} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold">{o.label}</span>
                  <span className="block text-xs font-medium opacity-80">{o.note}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {!isGoogle && (
          <fieldset className="m-0 mt-4 min-w-0 border-0 p-0">
            <legend className="k" style={{ color: "var(--mute)" }}>
              {s.reminder}
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REMINDERS.map((r) => (
                <button key={r.key} type="button" aria-pressed={remind === r.key} onClick={() => setRemind(r.key)} className="press tr h-11 rounded-full border px-4 text-sm font-semibold" style={pill(remind === r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <button type="button" aria-pressed={directions} onClick={() => setDirections((d) => !d)} className="press tr mt-4 flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-3.5 text-left" style={pill(directions)}>
          <Icon name="tram" size={18} />
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold">{s.directions}</span>
            <span className="block text-xs font-medium opacity-80">{s.directionsNote}</span>
          </span>
          {directions && <Icon name="check" size={18} strokeWidth={2.5} />}
        </button>

        <h3 className="k m-0 mt-5" style={{ color: "var(--mute)" }}>
          {s.preview(n)}
        </h3>
        {!info && <p className="m-0 mt-2 text-sm">{s.loading}</p>}
        {info && !n && <p className="m-0 mt-2 text-sm">{s.empty}</p>}
        <ul className="m-0 mt-2 grid list-none gap-2 p-0">
          {events.map((e) => (
            <li key={e.uid} className="rounded-2xl border p-3" style={{ background: "var(--soft)", borderColor: "var(--line)" }}>
              <span className="block text-[15px] font-bold">{e.title}</span>
              <span className="mt-1 flex items-center gap-1.5 text-[13px]">
                <Icon name="clock" size={14} />
                <span className="num">
                  {s.eventTime(shortLabel(e.date), clockLabel(e.start), clockLabel(e.end.time))}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[13px]">
                <Icon name="pin" size={14} />
                {e.location}
              </span>
              {directions && (
                <span className="mt-1 block truncate text-xs" style={{ color: "var(--mute)" }}>
                  {s.gettingThere(e.description.split("\n")[0])}
                </span>
              )}
              {isGoogle && n > 1 && (
                <a href={googleLink(e)} target="_blank" rel="noopener noreferrer" onClick={openedGoogle} aria-label={s.addToGoogleLabel(e.title, shortLabel(e.date))} className="press mt-2 inline-flex h-11 items-center gap-1.5 rounded-[14px] px-3.5 text-sm font-bold no-underline" style={pill(true)}>
                  <Icon name="external" size={15} />
                  {s.addToGoogle}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
