// Time helpers. All venue times are Cairo time.
//
// A "business day" runs from opening time to closing time, even past midnight.
// Times are stored as minutes after midnight of the business date, so with the
// default hours (3 PM to 1 AM) the slots are 900 (15:00) ... 1470 (00:30).

export const SLOT = 30;
export const TIME_ZONE = "Africa/Cairo";

export type Hours = { open_minute: number; close_minute: number };

/** Current Cairo date (YYYY-MM-DD) and minutes after midnight. */
export function cairoNow(now: Date = new Date()): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Which business day it is right now, and how far into it (in minutes after its
 * midnight). At 00:20 on Saturday with closing at 1 AM, it's still Friday at 1460.
 */
export function businessNow(hours: Hours, now: Date = new Date()): { date: string; minute: number } {
  const { date, minute } = cairoNow(now);
  const spill = hours.close_minute - 1440; // minutes the day runs past midnight
  if (spill > 0 && minute < spill) {
    return { date: addDays(date, -1), minute: minute + 1440 };
  }
  return { date, minute };
}

/** All half-hour start times of a business day. */
export function slotStarts(hours: Hours): number[] {
  const out: number[] = [];
  for (let m = hours.open_minute; m + SLOT <= hours.close_minute; m += SLOT) out.push(m);
  return out;
}

/** The half hours a booking occupies, e.g. 60 min at 1020 → [1020, 1050]. */
export function coveredSlots(start: number, duration: number): number[] {
  const out: number[] = [];
  for (let m = start; m < start + duration; m += SLOT) out.push(m);
  return out;
}

/** Whether a booking of this length can start here and still finish before closing. */
export function fitsHours(hours: Hours, start: number, duration: number): boolean {
  return (
    Number.isInteger(start) &&
    start % SLOT === 0 &&
    start >= hours.open_minute &&
    start + duration <= hours.close_minute
  );
}

/** "5:30 PM" / "٥:٣٠ م" for a minute value (wraps past midnight). */
export function formatTime(minute: number, lang: "ar" | "en"): string {
  const m = ((minute % 1440) + 1440) % 1440;
  const d = new Date(Date.UTC(2000, 0, 1, Math.floor(m / 60), m % 60));
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/** "Friday, 7 November" style date label. */
export function formatDate(date: string, lang: "ar" | "en", opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    ...opts,
  }).format(d);
}

/** "HH:MM" (24h) for inputs, e.g. 1470 → "00:30". */
export function toClock(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Opening/closing time from "HH:MM". A closing time at or before opening is the next day. */
export function fromClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
