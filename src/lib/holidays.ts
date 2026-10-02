import { lib } from "~/strings/en-AU/lib";

/**
 * NSW public holidays computed from the Public Holidays Act 2010 rules (spec §6.4).
 * data.gov.au's holiday dataset is inactive (no data after 2020), so rules are used instead,
 * checked against https://www.nsw.gov.au/about-nsw/public-holidays (2026–2027 table) in tests.
 * One-off holidays declared by the Government go in EXTRA and should be reviewed each year.
 * The August Bank Holiday is not a public holiday and is not included.
 */
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

const EXTRA: Holiday[] = [];

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const dow = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
const addDays = (y: number, m: number, d: number, n: number) => {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()] as const;
};

/** Western Easter Sunday (anonymous Gregorian algorithm). */
export function easterSunday(y: number): [number, number] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

const nthMonday = (y: number, m: number, n: number) => {
  const first = dow(y, m, 1), offset = (8 - first) % 7; // days to the first Monday
  return 1 + offset + (n - 1) * 7;
};

export function nswHolidays(y: number): Holiday[] {
  const out: Holiday[] = [];
  const add = (m: number, d: number, name: string) => out.push({ date: iso(y, m, d), name });
  const taken = () => new Set(out.map((h) => h.date));
  const nextFreeWeekday = (m: number, d: number) => {
    for (let n = 1; n < 7; n++) {
      const [yy, mm, dd] = addDays(y, m, d, n);
      const w = dow(yy, mm, dd);
      if (w !== 0 && w !== 6 && !taken().has(iso(yy, mm, dd))) return [yy, mm, dd] as const;
    }
    throw new Error("no free weekday");
  };
  const isWeekend = (m: number, d: number) => [0, 6].includes(dow(y, m, d));

  const H = lib.holidays;
  add(1, 1, H.newYearsDay);
  if (isWeekend(1, 1)) { const [, mm, dd] = nextFreeWeekday(1, 1); add(mm, dd, H.newYearsDayHoliday); }
  if (isWeekend(1, 26)) { const [, mm, dd] = nextFreeWeekday(1, 26); add(mm, dd, H.australiaDay); } else add(1, 26, H.australiaDay);
  const [em, ed] = easterSunday(y);
  const easter = (n: number, name: string) => { const [, mm, dd] = addDays(y, em, ed, n); add(mm, dd, name); };
  easter(-2, H.goodFriday); easter(-1, H.easterSaturday); easter(0, H.easterSunday); easter(1, H.easterMonday);
  add(4, 25, H.anzacDay);
  if (isWeekend(4, 25)) { const [, mm, dd] = nextFreeWeekday(4, 25); add(mm, dd, H.anzacDayHoliday); }
  add(6, nthMonday(y, 6, 2), H.kingsBirthday);
  add(10, nthMonday(y, 10, 1), H.labourDay);
  add(12, 25, H.christmasDay);
  add(12, 26, H.boxingDay);
  if (isWeekend(12, 25)) { const [, mm, dd] = nextFreeWeekday(12, 25); add(mm, dd, H.christmasDayHoliday); }
  if (isWeekend(12, 26)) { const [, mm, dd] = nextFreeWeekday(12, 26); add(mm, dd, H.boxingDayHoliday); }
  out.push(...EXTRA.filter((h) => h.date.startsWith(String(y))));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const cache = new Map<number, Map<string, string>>();
/** The holiday name for a date, or null. */
export function holidayOn(date: string): string | null {
  const y = Number(date.slice(0, 4));
  if (!cache.has(y)) cache.set(y, new Map(nswHolidays(y).map((h) => [h.date, h.name])));
  return cache.get(y)!.get(date) ?? null;
}
