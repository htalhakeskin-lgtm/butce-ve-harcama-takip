/**
 * Calendar-day helpers. Days are ISO strings (YYYY-MM-DD) and months are "YYYY-MM".
 * All arithmetic is done on UTC dates so the host time zone never shifts a day.
 * "Today" always comes from the user's time zone (BR-SYS-006) and is passed in, never read here
 * implicitly, so domain code stays testable.
 */

export type IsoDay = string; // YYYY-MM-DD
export type IsoMonth = string; // YYYY-MM

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export const DEFAULT_TIME_ZONE = "Europe/Istanbul";

export function isIsoDay(value: string): boolean {
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function isIsoMonth(value: string): boolean {
  const m = MONTH_RE.exec(value);
  return m !== null && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

function parts(day: IsoDay): [number, number, number] {
  const m = DAY_RE.exec(day);
  if (!m) throw new RangeError(`Invalid day: ${day}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function fromUtc(date: Date): IsoDay {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar day in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDay {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function monthOf(day: IsoDay): IsoMonth {
  return day.slice(0, 7);
}

export function firstDayOfMonth(month: IsoMonth): IsoDay {
  return `${month}-01`;
}

export function daysInMonth(month: IsoMonth): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function lastDayOfMonth(month: IsoMonth): IsoDay {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function addMonthsToMonth(month: IsoMonth, n: number): IsoMonth {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 1 + n, 1));
  return date.toISOString().slice(0, 7);
}

/**
 * Adds months to a day; a day that does not exist in the target month becomes that month's
 * last day (month-end rule, BR-REC-002): 2026-01-31 + 1 month → 2026-02-28.
 */
export function addMonths(day: IsoDay, n: number): IsoDay {
  const [, , d] = parts(day);
  const target = addMonthsToMonth(monthOf(day), n);
  const clamped = Math.min(d, daysInMonth(target));
  return `${target}-${String(clamped).padStart(2, "0")}`;
}

export function addDays(day: IsoDay, n: number): IsoDay {
  const [y, m, d] = parts(day);
  return fromUtc(new Date(Date.UTC(y, m - 1, d + n)));
}

export function compareDays(a: IsoDay, b: IsoDay): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Inclusive list of months between two months. */
export function monthsBetween(from: IsoMonth, to: IsoMonth): IsoMonth[] {
  const result: IsoMonth[] = [];
  for (let m = from; m <= to; m = addMonthsToMonth(m, 1)) result.push(m);
  return result;
}

export type DayRange = { from: IsoDay; to: IsoDay };

export const RANGE_PRESETS = ["thisMonth", "lastMonth", "last3Months", "thisYear"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export function presetRange(preset: RangePreset, today: IsoDay): DayRange {
  const month = monthOf(today);
  switch (preset) {
    case "thisMonth":
      return { from: firstDayOfMonth(month), to: lastDayOfMonth(month) };
    case "lastMonth": {
      const prev = addMonthsToMonth(month, -1);
      return { from: firstDayOfMonth(prev), to: lastDayOfMonth(prev) };
    }
    case "last3Months":
      return { from: firstDayOfMonth(addMonthsToMonth(month, -2)), to: lastDayOfMonth(month) };
    case "thisYear":
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}

export function monthRange(month: IsoMonth): DayRange {
  return { from: firstDayOfMonth(month), to: lastDayOfMonth(month) };
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export type DayFormat = "long" | "short" | "numeric" | "monthYear" | "monthShort";

/** Formats a calendar day for display without any time-zone shift. */
export function formatDay(day: IsoDay, locale: string, format: DayFormat = "long"): string {
  const key = `${locale}|${format}`;
  let f = dateFormatters.get(key);
  if (!f) {
    const tag = locale === "tr" ? "tr-TR" : "en-GB";
    const options: Intl.DateTimeFormatOptions = { timeZone: "UTC" };
    if (format === "long") Object.assign(options, { day: "numeric", month: "long", year: "numeric" });
    if (format === "short") Object.assign(options, { day: "numeric", month: "short" });
    if (format === "numeric") Object.assign(options, { day: "2-digit", month: "2-digit", year: "numeric" });
    if (format === "monthYear") Object.assign(options, { month: "long", year: "numeric" });
    if (format === "monthShort") Object.assign(options, { month: "short" });
    f = new Intl.DateTimeFormat(tag, options);
    dateFormatters.set(key, f);
  }
  const [y, m, d] = parts(day);
  return f.format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatMonth(month: IsoMonth, locale: string): string {
  return formatDay(firstDayOfMonth(month), locale, "monthYear");
}
