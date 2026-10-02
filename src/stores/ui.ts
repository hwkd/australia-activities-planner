import { atom } from "nanostores";
import { isDateStr } from "~/lib/dates";

/** Which global sheet is open; rendered by the SheetHost island (implementation-plan.md §3.4). */
export type Sheet =
  | null
  | { kind: "add"; activityId: string; date?: string; editOf?: { date: string; id: string }; source?: "card" | "detail" | "calendar" }
  | { kind: "export"; scope: "item" | "day" | "all"; date?: string; activityId?: string };
export const $sheet = atom<Sheet>(null);

/** The day being planned when Discover or an activity was opened from My plans (YYYY-MM-DD). */
export const $planningDate = atom<string | null>(null);
// Pages opened from a day in My plans carry it as `?day=YYYY-MM-DD` (Discover and activity pages).
if (typeof location !== "undefined") {
  const day = new URLSearchParams(location.search).get("day");
  if (isDateStr(day)) $planningDate.set(day);
}

/** The current undo toast. */
export type Toast = null | { id: number; message: string; undo?: () => void };
export const $toast = atom<Toast>(null);
let toastSeq = 0;
/** Shows the Undo toast (5 seconds, spec §6.7); a new one replaces the old. */
export const showToast = (message: string, undo?: () => void) => $toast.set({ id: ++toastSeq, message, undo });
