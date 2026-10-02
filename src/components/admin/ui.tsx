import type { ReactNode } from "react";
import { navigate } from "./api";

/** Small form building blocks for the admin panel (neutral styling, keyboard and screen-reader friendly). */

export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300";
export const btnCls = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50";
export const primaryCls = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50";
export const dangerCls = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50";

export function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function Field({ label, hint, error, children, id }: { label: string; hint?: ReactNode; error?: string[]; children: ReactNode; id: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {error?.map((e) => (
        <p key={e} className="text-xs font-semibold text-red-700" role="alert">
          {e}
        </p>
      ))}
    </div>
  );
}

export function Text({ id, label, value, onChange, hint, error, max, multiline, placeholder, type = "text", readOnly }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; error?: string[]; max?: number; multiline?: boolean; placeholder?: string; type?: string; readOnly?: boolean }) {
  const counter = max ? <span className={value.length > max ? "font-bold text-red-700" : ""}>{value.length}/{max}</span> : null;
  return (
    <Field id={id} label={label} error={error} hint={hint || counter ? <>{hint} {counter}</> : undefined}>
      {multiline ? (
        <textarea id={id} className={inputCls} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error?.length} readOnly={readOnly} />
      ) : (
        <input id={id} type={type} className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error?.length} readOnly={readOnly} />
      )}
    </Field>
  );
}

export function NumberInput({ id, label, value, onChange, step = 1, min, error, hint }: { id: string; label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; error?: string[]; hint?: string }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input id={id} type="number" inputMode="decimal" className={inputCls} value={Number.isFinite(value) ? value : ""} step={step} min={min} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} aria-invalid={!!error?.length} />
    </Field>
  );
}

/** A [min, max] money pair in AUD. */
export function Money({ id, label, value, onChange, error, hint }: { id: string; label: string; value: [number, number]; onChange: (v: [number, number]) => void; error?: string[]; hint?: string }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">$</span>
        <input aria-label={`${label}, minimum`} id={id} type="number" step={0.05} min={0} className={inputCls} value={value[0]} onChange={(e) => onChange([Number(e.target.value), value[1]])} />
        <span className="text-sm text-slate-500">to $</span>
        <input aria-label={`${label}, maximum`} type="number" step={0.05} min={0} className={inputCls} value={value[1]} onChange={(e) => onChange([value[0], Number(e.target.value)])} />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {error?.map((e) => (
        <p key={e} className="text-xs font-semibold text-red-700" role="alert">
          {e}
        </p>
      ))}
    </fieldset>
  );
}

export function Select<T extends string>({ id, label, value, options, onChange, error }: { id: string; label: string; value: T; options: readonly (T | { value: T; label: string })[]; onChange: (v: T) => void; error?: string[] }) {
  return (
    <Field id={id} label={label} error={error}>
      <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return (
            <option key={v} value={v}>
              {typeof o === "string" ? o : o.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

/** Multi-select as checkboxes. */
export function Checks<T extends string>({ label, value, options, onChange, error }: { label: string; value: readonly T[]; options: readonly { value: T; label: string }[]; onChange: (v: T[]) => void; error?: string[] }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])} />
              {o.label}
            </label>
          );
        })}
      </div>
      {error?.map((e) => (
        <p key={e} className="text-xs font-semibold text-red-700" role="alert">
          {e}
        </p>
      ))}
    </fieldset>
  );
}

/** A list of short strings (what to bring, safety notes…), one per row. */
export function StringList({ label, value, onChange, addLabel = "Add", placeholder, error }: { label: string; value: string[]; onChange: (v: string[]) => void; addLabel?: string; placeholder?: string; error?: string[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      {value.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label={`${label} ${i + 1}`} className={inputCls} value={v} placeholder={placeholder} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className={btnCls} aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className={btnCls} onClick={() => onChange([...value, ""])}>
        + {addLabel}
      </button>
      {error?.map((e) => (
        <p key={e} className="text-xs font-semibold text-red-700" role="alert">
          {e}
        </p>
      ))}
    </fieldset>
  );
}

export function Section({ id, title, children, description }: { id: string; title: string; children: ReactNode; description?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-lg font-bold text-slate-900">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Notice({ kind, children }: { kind: "error" | "ok" | "warn" | "info"; children: ReactNode }) {
  const cls = { error: "border-red-200 bg-red-50 text-red-900", ok: "border-emerald-200 bg-emerald-50 text-emerald-900", warn: "border-amber-200 bg-amber-50 text-amber-900", info: "border-slate-200 bg-slate-50 text-slate-800" }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
