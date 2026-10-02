import { useEffect } from "react";
import { $toast, type Toast } from "~/stores/ui";
import { t } from "~/strings/en-AU";

/** "Moved to 9:30am · Undo" for 5 seconds after a removal, time change or day change (spec §6.7). */
export default function UndoToast({ toast }: { toast: NonNullable<Toast> }) {
  useEffect(() => {
    const timer = setTimeout(() => $toast.get()?.id === toast.id && $toast.set(null), 5000);
    return () => clearTimeout(timer);
  }, [toast.id]);
  return (
    <div role="status" className="toast glass-strong tr">
      <span className="min-w-0 flex-1 text-sm font-semibold">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            $toast.set(null);
          }}
          className="press h-11 shrink-0 rounded-[14px] border-0 px-4 text-sm font-bold"
          style={{ background: "var(--sel)", color: "var(--sel-ink)" }}
        >
          {t.sheets.undo.undo}
        </button>
      )}
    </div>
  );
}
