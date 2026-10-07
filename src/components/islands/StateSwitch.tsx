import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CURRENT_STATE } from "~/lib/states";
import { track } from "~/lib/analytics";
import { Icon } from "~/theme/icons";
import { t } from "~/strings/en-AU";
import Sheet from "~/components/sheets/Sheet";
// Loaded with the pill (it's small): opening never shows an empty sheet, and can't fail on a missing chunk.
import StatePicker from "~/components/discover/StatePicker";

/** Where the picker shows as a popover under the pill instead of the shared sheet (spec §3.1). */
const DESKTOP = "(min-width: 1024px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
const focusablesIn = (root: HTMLElement | null) =>
  root ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null) : [];
/** The first control after `el` in page order, outside `skip` (the popover). */
const nextAfter = (el: HTMLElement, skip: HTMLElement | null) =>
  focusablesIn(document.body).find(
    (x) => !skip?.contains(x) && !el.contains(x) && el.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

/**
 * Under the switch's row (below the date too, when it wraps under the pill), as wide as the design's
 * 440 px where the window allows.
 */
const under = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  const row = (el.closest("[data-state-row]") ?? el).getBoundingClientRect();
  return {
    left: r.left,
    top: Math.max(r.bottom, row.bottom) + 8,
    width: Math.min(440, window.innerWidth - r.left - 24),
  };
};

/**
 * The state switch in Discover's header (D16, spec §3.1, canvas A1 · State switch, `client:load`): a
 * pill with the state's name that opens "Where are you exploring?". Phones get the shared sheet (modal;
 * focus moves in and returns to the pill); desktop gets a popover under the pill that isn't modal and
 * closes on Escape, a click outside or focus leaving it. Nothing is stored and URLs don't change while
 * New South Wales is the only live state.
 */
export default function StateSwitch({ count }: { count: number }) {
  const s = t.discover.stateSwitch;
  const [open, setOpen] = useState<null | "sheet" | "popover">(null);
  const pill = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const show = () => {
    setOpen(matchMedia(DESKTOP).matches ? "popover" : "sheet");
    track({ name: "state_picker_open", props: {} });
  };
  // Closing on purpose (Close, Escape, the backdrop, a click outside) puts focus back on the pill,
  // once the sheet or popover has gone (the sheet keeps focus inside itself while it's open).
  const refocus = useRef(false);
  const close = useCallback(() => {
    refocus.current = true;
    setOpen(null);
  }, []);
  // Focus leaving the popover closes it and leaves focus where it went.
  const leave = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    pill.current?.focus();
  }, [open]);
  // The window crossing the breakpoint while it's open would leave the wrong kind (a popover on a
  // phone, a sheet on desktop): close it.
  useEffect(() => {
    if (!open) return;
    const mq = matchMedia(DESKTOP);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [open, close]);

  return (
    <>
      <button
        ref={pill}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open !== null}
        aria-label={`${CURRENT_STATE.name}${s.change}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (open !== "popover" || e.key !== "Tab") return;
          if (e.shiftKey) {
            // Going back past the switch leaves the popover behind: it closes.
            leave();
            return;
          }
          // The popover sits at the end of the page; Tab from the switch goes into it, as if it followed.
          const first = focusablesIn(document.querySelector<HTMLElement>("[data-state-popover]"))[0];
          if (first) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="state-pill glass press"
        data-state-switch
      >
        <Icon name="pin" size={17} className="shrink-0" />
        {CURRENT_STATE.name}
        <Icon name="chevronDown" size={16} className="shrink-0" />
      </button>
      {open === "sheet" &&
        createPortal(
          <Sheet label={s.title} onClose={close}>
            {/* No footer here, so the sheet's own content clears the home indicator. */}
            <div className="px-4 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
              <StatePicker count={count} titleId={titleId} onClose={close} />
            </div>
          </Sheet>,
          document.body,
        )}
      {open === "popover" && (
        <Popover anchor={pill} titleId={titleId} onClose={close} onLeave={leave}>
          <StatePicker count={count} titleId={titleId} onClose={close} />
        </Popover>
      )}
    </>
  );
}

/**
 * The desktop popover: a non-modal dialog placed under the pill (fixed to the window, so the left
 * column's scrolling can't clip it; it scrolls itself on short windows). A transparent backdrop
 * catches clicks outside; it isn't a control (no Tab stop, hidden from screen readers). Tab moves as
 * if the popover followed the pill, in every browser (Safari's default Tab skips buttons), and focus
 * leaving it closes it without moving focus.
 */
function Popover({
  anchor,
  titleId,
  onClose,
  onLeave,
  children,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  titleId: string;
  onClose: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLElement>(null);
  // Placed before the first paint (it must be visible to take focus), then kept under the pill.
  const [pos, setPos] = useState(() => under(anchor.current!));

  useLayoutEffect(() => {
    // Measured on the next frame, once the page has laid out for the new size or scroll position.
    let frame = 0;
    const place = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => anchor.current && setPos(under(anchor.current)));
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  // Focus moves in once, when it opens.
  useEffect(() => {
    box.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      const to = e.target as Node;
      if (!box.current?.contains(to) && !anchor.current?.contains(to)) onLeave();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [anchor, onClose, onLeave]);

  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40" onClick={onClose} data-state-backdrop />
      <section
        ref={box}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-state-popover
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          e.preventDefault();
          const items = focusablesIn(box.current);
          const at = items.indexOf(document.activeElement as HTMLElement);
          if (e.shiftKey) {
            // Back from the top goes to the switch, as if the popover came right after it.
            if (at <= 0) anchor.current?.focus();
            else items[at - 1].focus();
          } else if (at === items.length - 1 && anchor.current) {
            // Past the last control: close and move on to whatever follows the switch.
            const next = nextAfter(anchor.current, box.current);
            onLeave();
            next?.focus();
          } else items[at + 1]?.focus();
        }}
        className="glass-strong card-in fixed z-[41] overflow-y-auto overscroll-contain rounded-[28px] px-[18px] pt-5 pb-4 outline-none"
        style={{
          left: pos.left,
          top: pos.top,
          width: pos.width,
          maxHeight: `calc(100dvh - ${pos.top}px - 16px)`,
          color: "var(--ink)",
        }}
      >
        {children}
      </section>
    </>,
    document.body,
  );
}
