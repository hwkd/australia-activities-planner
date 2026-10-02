import { addDays, weekday, type DateStr } from "./dates";
import { lib } from "~/strings/en-AU/lib";
import { holidayOn } from "./holidays";

export interface QuickDay {
  date: DateStr;
  /** "Today", "Tomorrow", "Sat", or the holiday's short name. */
  label: string;
  holiday: string | null;
}

/**
 * Quick days in Add to a day (spec §3.3): today, tomorrow, the next Saturday and Sunday, and the next
 * public holiday within 14 days. No duplicates, in date order. The chosen date is added if it isn't one.
 */
export function quickDays(today: DateStr, chosen?: DateStr, on?: { from: DateStr; to: DateStr }): QuickDay[] {
  // An event (spec §11.4): its own days from today, up to six.
  if (on) {
    const out: DateStr[] = [];
    for (let d = on.from < today ? today : on.from; d <= on.to && out.length < 6; d = addDays(d, 1)) out.push(d);
    if (chosen && chosen >= today && !out.includes(chosen)) out.push(chosen);
    return out.sort().map((date) => labelled(today, date));
  }
  const nextDow = (dow: number) => {
    for (let i = 0; i < 7; i++) if (weekday(addDays(today, i)) === dow) return addDays(today, i);
    return today;
  };
  const dates = new Set<DateStr>([today, addDays(today, 1), nextDow(5), nextDow(6)]);
  for (let i = 0; i <= 14; i++) {
    const d = addDays(today, i);
    if (holidayOn(d)) {
      dates.add(d);
      break;
    }
  }
  if (chosen && chosen >= today) dates.add(chosen);
  return [...dates].sort().map((date) => labelled(today, date));
}

function labelled(today: DateStr, date: DateStr): QuickDay {
  const holiday = holidayOn(date);
  const label = date === today ? lib.dates.today : date === addDays(today, 1) ? lib.dates.tomorrow : lib.quickDays.dayShort[weekday(date)];
  return { date, label, holiday };
}
