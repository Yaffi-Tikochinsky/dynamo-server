// Date helpers. Every "day" in the system is a calendar date in Israel time,
// represented as a "YYYY-MM-DD" string. The database stores these as DATE columns.

const TIME_ZONE = 'Asia/Jerusalem';
const DAY_MS = 24 * 60 * 60 * 1000;

let todayOverride: string | null = null;

/** Tests can freeze "today" to get predictable results. */
export function setTodayForTests(day: string | null): void {
  todayOverride = day;
}

/** Today's date in Israel, e.g. "2026-11-03". */
export function today(): string {
  if (todayOverride) return todayOverride;
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Number of days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** All days from a to b, inclusive. Empty when b < a. */
export function eachDay(a: string, b: string): string[] {
  const days: string[] = [];
  for (let d = a; d <= b; d = addDays(d, 1)) days.push(d);
  return days;
}

export const minDay = (a: string, b: string): string => (a < b ? a : b);
export const maxDay = (a: string, b: string): string => (a > b ? a : b);

/** Converts a "YYYY-MM-DD" string to the Date object Prisma expects for DATE columns. */
export function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** Converts a DATE column value from Prisma back to "YYYY-MM-DD". */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
