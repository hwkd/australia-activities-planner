import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** Sticky footer (the confirm button). */
  footer?: ReactNode;
  /** Another day's sky to theme the sheet with (spec §3.3: the sheet shows the chosen day's sky). */
  weather?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/**
 * A modal sheet: bottom sheet on phone, centred dialog on desktop. Moves focus in, keeps Tab inside,
 * closes on Escape or the scrim, and returns focus to whatever opened it (tracker M8.4).
 */
export default function Sheet({ label, onClose, children, footer, weather }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? el).focus();
    const focusables = () => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        // The sheet moves focus itself, so Tab cycles through every control in it in every browser
        // (Safari's default Tab order skips buttons and would leave the sheet for the address bar).
        const items = focusables();
        if (!items.length) return;
        e.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at < 0 || at === items.length - 1 ? 0 : at + 1;
        items[next].focus();
      }
    };
    // Anything that takes focus outside the sheet (a click on the page behind, assistive tech) sends
    // it back in.
    const onFocusIn = (e: FocusEvent) => {
      if (!el.contains(e.target as Node)) (focusables()[0] ?? el).focus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  return (
    <div className="sheet-root" data-weather={weather}>
      <div className="sheet-scrim" aria-hidden="true" onClick={onClose} />
      <section ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="sheet glass-strong tr">
        <span aria-hidden="true" className="sheet-grip" />
        <div className="sheet-body hs">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </section>
    </div>
  );
}
