import { useEffect, useRef, useState } from "react";
import { CURRENT_STATE, STATES, type StateKey } from "~/lib/states";
import { track } from "~/lib/analytics";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";

interface Props {
  /** Published activities in the live state. */
  count: number;
  titleId: string;
  /** Closing (Close, or picking the state that's already current). */
  onClose: () => void;
}

/**
 * "Where are you exploring?" (D16, spec §3.1, canvas A1 · State switch): New South Wales, the one live
 * state, then the other states and territories. Tapping one that isn't here yet says so (a polite live
 * region) and counts the tap (`state_interest`, spec §7). Shown in the shared sheet on phones and in a
 * popover on desktop (StateSwitch).
 */
export default function StatePicker({ count, titleId, onClose }: Props) {
  const s = t.discover.stateSwitch;
  const [peek, setPeek] = useState<StateKey | null>(null);
  const peeked = STATES.find((o) => o.key === peek);
  const others = STATES.filter((o) => !o.live);
  // Each state counts once per time the picker is open, however often it's tapped.
  const counted = useRef(new Set<StateKey>());
  const tap = (key: StateKey) => {
    setPeek(key);
    if (counted.current.has(key)) return;
    counted.current.add(key);
    track({ name: "state_interest", props: { state: key } });
  };
  // On a short screen the answer can be below the fold: bring it into view.
  const answer = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (peek) answer.current?.scrollIntoView({ block: "nearest" });
  }, [peek]);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="w90 m-0 text-[26px] leading-[1.1] font-[750] tracking-[-0.02em] lg:text-[24px]">
            {s.title}
          </h2>
          <p className="m-0 mt-1.5 text-sm leading-[1.45]" style={{ color: "var(--mute)" }}>
            {s.intro}
          </p>
        </div>
        <button
          type="button"
          aria-label={s.close}
          onClick={onClose}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-transparent"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <ul className="m-0 mt-4 grid list-none gap-1.5 p-0">
        <li>
          <button
            type="button"
            aria-current="true"
            onClick={onClose}
            className="press flex min-h-16 w-full items-center gap-3 rounded-[20px] border-[1.5px] py-2.5 pr-4 pl-3.5 text-left"
            // The focus ring is drawn on the sheet, where the selected ink colour would vanish.
            style={{
              background: "var(--sel)",
              color: "var(--sel-ink)",
              borderColor: "var(--sel)",
              outlineColor: "var(--ink)",
            }}
          >
            <Icon name="pin" size={20} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-base leading-[normal] font-bold">{CURRENT_STATE.name}</span>
              <span className="mt-0.5 block text-[13px] leading-[normal] font-semibold opacity-85">
                {s.liveNote(count)}
              </span>
            </span>
            <Icon name="check" size={20} strokeWidth={2.5} className="shrink-0" />
          </button>
        </li>
      </ul>
      <p
        className="m-0 mt-[18px] px-1 text-[11.5px] font-bold tracking-[0.14em] uppercase"
        style={{ color: "var(--mute)" }}
      >
        {s.othersHeading}
      </p>
      <ul className="m-0 mt-2 grid list-none grid-cols-2 gap-1.5 p-0">
        {others.map((o) => {
          const on = o.key === peek;
          return (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => tap(o.key)}
                className="press flex h-full min-h-[50px] w-full items-center gap-[9px] rounded-2xl border px-3 py-[7px] text-left"
                style={{
                  borderStyle: on ? "solid" : "dashed",
                  borderColor: on ? "var(--ink)" : "var(--line)",
                  background: on ? "var(--glass2)" : "transparent",
                  color: on ? "var(--ink)" : "var(--mute)",
                }}
              >
                <span aria-hidden="true" className="w-[34px] shrink-0 text-xs font-extrabold tracking-[0.06em]">
                  {o.short}
                </span>
                <span aria-hidden="true" className="text-[13.5px] leading-[1.25] font-semibold">
                  {o.name}
                </span>
                <span className="sr-only">{s.notYetLabel(o.name)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p
        ref={answer}
        aria-live="polite"
        // Scrolled into view clear of the sheet's bottom padding and a phone's home indicator.
        className="m-0 mt-3 min-h-[42px] scroll-mb-[calc(24px+env(safe-area-inset-bottom))] px-1 text-sm leading-[1.45]"
      >
        {peeked && (
          <span className="block" data-state-peek>
            <b>{s.notYetTitle(peeked.name)}</b> <span style={{ color: "var(--mute)" }}>{s.notYetBody}</span>
          </span>
        )}
      </p>
    </>
  );
}
