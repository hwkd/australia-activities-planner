import type { FilterState } from "~/lib/discoverQuery";
import { DURATIONS, GROUPS } from "~/lib/discoverQuery";
import { t } from "~/strings/en-AU";
import { Icon } from "~/theme/icons";

interface Props {
  value: FilterState;
  /** Show Pram-friendly and Step-free only once some activities have been checked (spec §11.6). */
  accessFilters?: boolean;
  onChange: (next: FilterState, changed: { filter: string; value: string }) => void;
}

// Off, the chip's fill comes from `.glass` (and from the glass-on-glass rule on the desktop card).
const chip = (on: boolean) => ({
  background: on ? "var(--sel)" : undefined,
  color: on ? "var(--sel-ink)" : "var(--ink)",
  borderColor: on ? "var(--sel)" : "var(--line)",
});

/** Phones: rows that scroll sideways. Desktop: rows that wrap, inside the left side's glass card. */
const ROW =
  "hs -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 lg:mx-0 lg:mt-2.5 lg:flex-wrap lg:overflow-visible lg:px-0";
const LABEL = "eb m-0 text-[11.5px]";
const CHIP = "glass press h-11 shrink-0 rounded-full border font-semibold lg:px-3.5 lg:text-[14px]";

/**
 * Group chips, then Free only and duration chips, then access; applied at once (spec §3.1, §11.6).
 * Desktop (A · Sky Mode — Desktop) labels the groups "Who's coming" and "How long", then Free only in
 * its own Price row under a divider; phones show the chips alone, Free only first in its row.
 */
export default function FilterBar({ value, onChange, accessFilters }: Props) {
  const free = (
    <button
      type="button"
      aria-pressed={value.freeOnly}
      onClick={() =>
        onChange({ ...value, freeOnly: !value.freeOnly }, { filter: "free", value: String(!value.freeOnly) })
      }
      className="free glass press inline-flex h-11 shrink-0 items-center gap-[9px] rounded-full border pr-4 pl-3 text-sm font-semibold lg:pr-3 lg:pl-2.5 lg:text-[13.5px] lg:font-bold"
      style={chip(value.freeOnly)}
    >
      <span
        aria-hidden="true"
        className="relative h-[18px] w-[30px] rounded-full border-[1.5px]"
        style={{
          borderColor: value.freeOnly ? "var(--sel-ink)" : "var(--ink)",
          background: value.freeOnly ? "var(--sel-ink)" : "transparent",
        }}
      >
        <span
          className="absolute top-[2px] left-[2px] h-[11px] w-[11px] rounded-full transition-transform duration-300"
          style={{
            background: value.freeOnly ? "var(--sel)" : "var(--ink)",
            transform: value.freeOnly ? "translateX(12px)" : "none",
          }}
        />
      </span>
      {t.discover.filters.freeOnly}
    </button>
  );
  return (
    <>
      <fieldset className="m-0 mt-4 min-w-0 border-0 p-0 lg:mt-0">
        <legend className="sr-only">{t.discover.filters.groupLegend}</legend>
        <div aria-hidden="true" className="hidden lg:block">
          <p className={LABEL} style={{ color: "var(--mute)" }}>
            {t.discover.filters.groupLegend}
          </p>
        </div>
        <div className={ROW}>
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={value.group === g.key}
              onClick={() => onChange({ ...value, group: g.key }, { filter: "group", value: g.key })}
              className={`${CHIP} px-[18px] text-[14.5px]`}
              style={chip(value.group === g.key)}
            >
              {t.common.groups[g.key]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 mt-2 min-w-0 border-0 p-0 lg:mt-3.5">
        <legend className="sr-only">{t.discover.filters.lengthLegend}</legend>
        <p aria-hidden="true" className={`${LABEL} hidden lg:block`} style={{ color: "var(--mute)" }}>
          {t.discover.filters.lengthLabel}
        </p>
        <div className={ROW}>
          <span className="contents lg:hidden">{free}</span>
          {DURATIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={value.duration === d.key}
              onClick={() => onChange({ ...value, duration: d.key }, { filter: "duration", value: d.key })}
              className={`${CHIP} px-4 text-sm`}
              style={chip(value.duration === d.key)}
            >
              {t.discover.filters.durations[d.key]}
            </button>
          ))}
        </div>
        {/* Desktop: Free only in its own row, under a divider, so it doesn't crowd the chips. */}
        <div
          className="mt-3.5 hidden items-center justify-between gap-3 border-t pt-3.5 lg:flex"
          style={{ borderColor: "var(--line)" }}
        >
          <p aria-hidden="true" className={LABEL} style={{ color: "var(--mute)" }}>
            {t.discover.filters.priceLabel}
          </p>
          {free}
        </div>
      </fieldset>
      {accessFilters && (
        <fieldset className="m-0 mt-2 min-w-0 border-0 p-0 lg:mt-3.5">
          <legend className="sr-only">{t.discover.filters.accessLegend}</legend>
          <div aria-hidden="true" className="hidden lg:block">
            <p className={LABEL} style={{ color: "var(--mute)" }}>
              {t.discover.filters.accessLegend}
            </p>
          </div>
          <div className={ROW}>
            {(["pram", "stepFree"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={value[k]}
                onClick={() => onChange({ ...value, [k]: !value[k] }, { filter: k, value: String(!value[k]) })}
                className={`${CHIP} inline-flex items-center gap-2 px-4 text-sm`}
                style={chip(value[k])}
              >
                <Icon name="access" size={16} />
                {t.discover.filters[k]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
