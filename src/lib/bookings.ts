// All booking rules live here: holding a slot, payment proof, confirmation,
// and everything the front desk does.
import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { query, transaction } from "./db";
import { getSettings, pricing, type Settings } from "./settings";
import { addDays, businessNow, coveredSlots, fitsHours, formatDate, formatTime, isDate, slotStarts } from "./time";
import { normalizePhone, whatsappLink } from "./phone";
import { fill, num, t, type Lang } from "./i18n";

export type Status = "holding" | "reviewing" | "confirmed" | "paid" | "rejected" | "expired" | "cancelled";
export const LIVE: Status[] = ["holding", "reviewing", "confirmed", "paid"];

export type Booking = {
  id: string;
  code: string;
  kind: "online" | "manual" | "block";
  status: Status;
  business_date: string;
  start_minute: number;
  duration: number;
  customer_name: string;
  phone: string;
  lang: Lang;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  remaining_method: "cash" | "instapay" | null;
  remaining_paid_at: string | null;
  has_proof: boolean;
  proof_uploaded_at: string | null;
  reject_reason: string | null;
  attendance: "arrived" | "no_show" | null;
  note: string;
  hold_expires_at: string | null;
  seconds_left: number | null;
  confirmed_at: string | null;
  created_at: string;
};

const COLS = `id::text AS id, code, kind, status, business_date::text AS business_date, start_minute,
  duration, customer_name, phone, lang, total_price, deposit_amount, deposit_paid, remaining_method,
  remaining_paid_at, (proof_image IS NOT NULL) AS has_proof, proof_uploaded_at, reject_reason,
  attendance, note, hold_expires_at,
  GREATEST(0, CEIL(EXTRACT(EPOCH FROM hold_expires_at - now())))::int AS seconds_left,
  confirmed_at, created_at`;

export class BookingError extends Error {
  constructor(public code: "invalid" | "taken" | "past" | "expired" | "not_found" | "state", message?: string) {
    super(message ?? code);
  }
}

/** Amount still owed at the counter. */
export const remainingDue = (b: Pick<Booking, "total_price" | "deposit_amount" | "deposit_paid">) =>
  b.total_price - (b.deposit_paid ? b.deposit_amount : 0);

type Db = Pick<PoolClient, "query">;

/** Releases slots whose deposit wasn't sent in time. Runs before every read. */
async function expireStale(db?: Db): Promise<void> {
  const sql = `WITH ex AS (
      UPDATE bookings SET status = 'expired', updated_at = now()
      WHERE status = 'holding' AND hold_expires_at <= now()
      RETURNING id)
    DELETE FROM booking_slots WHERE booking_id IN (SELECT id FROM ex)`;
  if (db) await db.query(sql);
  else await query(sql);
}

/** Inserts the half-hour locks. Fails with "taken" if any is already held. */
async function lockSlots(db: Db, bookingId: string, date: string, start: number, duration: number) {
  try {
    await db.query(
      `INSERT INTO booking_slots (business_date, start_minute, booking_id)
       SELECT $1::date, m, $2::bigint FROM unnest($3::int[]) AS m`,
      [date, bookingId, coveredSlots(start, duration)],
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new BookingError("taken");
    throw err;
  }
}

async function releaseSlots(db: Db, bookingId: string) {
  await db.query("DELETE FROM booking_slots WHERE booking_id = $1", [bookingId]);
}

/** First and last day people can book. */
export function bookableRange(s: Settings): { first: string; last: string } {
  const { date } = businessNow(s);
  return { first: date, last: addDays(date, s.days_ahead - 1) };
}

// ───────────────────────────── Public site ─────────────────────────────

export type DaySlot = { start: number; taken: boolean; past: boolean };

export async function availability(date: string): Promise<{ date: string; slots: DaySlot[] }> {
  const s = await getSettings();
  const { first, last } = bookableRange(s);
  if (!isDate(date) || date < first || date > last) throw new BookingError("invalid");
  await expireStale();
  const rows = await query<{ start_minute: number }>(
    "SELECT start_minute FROM booking_slots WHERE business_date = $1",
    [date],
  );
  const taken = new Set(rows.map((r) => r.start_minute));
  const now = businessNow(s);
  return {
    date,
    slots: slotStarts(s).map((start) => ({
      start,
      taken: taken.has(start),
      past: date === now.date && start <= now.minute,
    })),
  };
}

export async function createOnlineBooking(input: {
  date: string;
  start: number;
  duration: number;
  name: string;
  phone: string;
  lang: Lang;
}): Promise<{ code: string }> {
  const s = await getSettings();
  const { first, last } = bookableRange(s);
  const name = String(input.name ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(input.phone ?? ""));
  const start = Number(input.start);
  const duration = Number(input.duration);
  if (!isDate(input.date) || input.date < first || input.date > last) throw new BookingError("invalid", "date");
  if (duration !== 30 && duration !== 60) throw new BookingError("invalid", "duration");
  if (!fitsHours(s, start, duration)) throw new BookingError("invalid", "time");
  if (name.length < 2) throw new BookingError("invalid", "name");
  if (!phone) throw new BookingError("invalid", "phone");
  const now = businessNow(s);
  if (input.date === now.date && start <= now.minute) throw new BookingError("past");

  const { total, deposit } = pricing(s, duration);
  const code = randomBytes(9).toString("base64url");

  await transaction(async (db) => {
    await expireStale(db);
    const res = await db.query<{ id: string }>(
      `INSERT INTO bookings (code, kind, status, business_date, start_minute, duration, customer_name,
         phone, lang, total_price, deposit_amount, hold_expires_at)
       VALUES ($1, 'online', 'holding', $2, $3, $4, $5, $6, $7, $8, $9, now() + make_interval(mins => $10::int))
       RETURNING id::text`,
      [code, input.date, start, duration, name, phone, input.lang === "en" ? "en" : "ar", total, deposit, s.hold_minutes],
    );
    await lockSlots(db, res.rows[0].id, input.date, start, duration);
  });
  return { code };
}

export async function getByCode(code: string): Promise<Booking | null> {
  await expireStale();
  const rows = await query<Booking>(`SELECT ${COLS} FROM bookings WHERE code = $1`, [code]);
  return rows[0] ?? null;
}

/** Stores the InstaPay screenshot and moves the booking to "reviewing". */
export async function submitProof(code: string, image: Buffer, mime: string): Promise<void> {
  await expireStale();
  const rows = await query<{ id: string }>(
    `UPDATE bookings SET proof_image = $2, proof_mime = $3, proof_uploaded_at = now(),
       status = 'reviewing', updated_at = now()
     WHERE code = $1 AND kind = 'online' AND status IN ('holding', 'reviewing')
     RETURNING id::text`,
    [code, image, mime],
  );
  if (rows[0]) return;
  const b = await getByCode(code);
  if (!b) throw new BookingError("not_found");
  if (b.status === "expired") throw new BookingError("expired");
  throw new BookingError("state");
}

// ───────────────────────────── Front desk ─────────────────────────────

export async function dayBookings(date: string): Promise<Booking[]> {
  if (!isDate(date)) throw new BookingError("invalid");
  await expireStale();
  // Old screenshots aren't needed after a month; clear them to save space.
  await query(
    `UPDATE bookings SET proof_image = NULL
     WHERE proof_image IS NOT NULL AND proof_uploaded_at < now() - interval '30 days'`,
  );
  return query<Booking>(
    `SELECT ${COLS} FROM bookings WHERE business_date = $1 AND status = ANY($2) ORDER BY start_minute`,
    [date, LIVE],
  );
}

export async function reviewQueue(): Promise<Booking[]> {
  await expireStale();
  return query<Booking>(`SELECT ${COLS} FROM bookings WHERE status = 'reviewing' ORDER BY proof_uploaded_at`);
}

export async function proofImage(id: string): Promise<{ data: Buffer; mime: string } | null> {
  const rows = await query<{ proof_image: Buffer | null; proof_mime: string | null }>(
    "SELECT proof_image, proof_mime FROM bookings WHERE id = $1",
    [id],
  );
  const r = rows[0];
  return r?.proof_image ? { data: r.proof_image, mime: r.proof_mime ?? "image/jpeg" } : null;
}

/** WhatsApp link with the confirmation message in the customer's language. */
export function confirmationWhatsapp(b: Booking): string | null {
  if (b.kind === "block" || !b.phone) return null;
  const lang = b.lang;
  const message = fill(t(lang).wa.confirmed, {
    name: b.customer_name,
    date: formatDate(b.business_date, lang),
    start: formatTime(b.start_minute, lang),
    end: formatTime(b.start_minute + b.duration, lang),
    remaining: num(remainingDue(b), lang),
  });
  return whatsappLink(b.phone, message);
}

export type AdminAction =
  | { action: "confirm" }
  | { action: "reject"; reason: string }
  | { action: "collect"; method: "cash" | "instapay" }
  | { action: "attendance"; value: "arrived" | "no_show" | null }
  | { action: "cancel" };

export async function adminAction(id: string, a: AdminAction): Promise<Booking> {
  await transaction(async (db) => {
    await expireStale(db);
    const cur = await db.query<{ status: Status; kind: string }>(
      "SELECT status, kind FROM bookings WHERE id = $1 FOR UPDATE",
      [id],
    );
    const b = cur.rows[0];
    if (!b) throw new BookingError("not_found");
    const is = (...s: Status[]) => s.includes(b.status);

    switch (a.action) {
      case "confirm":
        if (!is("reviewing")) throw new BookingError("state", "Only bookings waiting for review can be confirmed");
        await db.query(
          `UPDATE bookings SET status = 'confirmed', deposit_paid = true, confirmed_at = now(),
             reject_reason = NULL, updated_at = now() WHERE id = $1`,
          [id],
        );
        break;
      case "reject": {
        if (!is("holding", "reviewing")) throw new BookingError("state", "This booking can't be rejected anymore");
        const reason = String(a.reason ?? "").trim().slice(0, 200);
        await db.query(
          "UPDATE bookings SET status = 'rejected', reject_reason = $2, updated_at = now() WHERE id = $1",
          [id, reason],
        );
        await releaseSlots(db, id);
        break;
      }
      case "collect":
        if (b.kind === "block" || !is("confirmed")) throw new BookingError("state", "Nothing to collect for this booking");
        if (a.method !== "cash" && a.method !== "instapay") throw new BookingError("invalid", "method");
        await db.query(
          `UPDATE bookings SET status = 'paid', remaining_method = $2, remaining_paid_at = now(),
             updated_at = now() WHERE id = $1`,
          [id, a.method],
        );
        break;
      case "attendance":
        if (b.kind === "block" || !is("confirmed", "paid")) throw new BookingError("state", "Confirm the booking first");
        if (a.value !== null && a.value !== "arrived" && a.value !== "no_show") throw new BookingError("invalid");
        await db.query("UPDATE bookings SET attendance = $2, updated_at = now() WHERE id = $1", [id, a.value]);
        break;
      case "cancel":
        if (!is(...LIVE)) throw new BookingError("state", "This booking is already closed");
        await db.query("UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1", [id]);
        await releaseSlots(db, id);
        break;
      default:
        throw new BookingError("invalid");
    }
  });
  const rows = await query<Booking>(`SELECT ${COLS} FROM bookings WHERE id = $1`, [id]);
  return rows[0];
}

/** A walk-in or phone booking, or a blocked time, added by the front desk. */
export async function adminCreate(input: {
  kind: "manual" | "block";
  date: string;
  start: number;
  duration: number;
  name?: string;
  phone?: string;
  depositPaid?: boolean;
  note?: string;
}): Promise<Booking> {
  const s = await getSettings();
  const start = Number(input.start);
  const duration = Number(input.duration);
  const kind = input.kind === "block" ? "block" : "manual";
  if (!isDate(input.date)) throw new BookingError("invalid", "Choose a day");
  if (kind === "manual" && duration !== 30 && duration !== 60) throw new BookingError("invalid", "Choose 30 or 60 minutes");
  if (!Number.isInteger(duration) || duration <= 0 || duration % 30) throw new BookingError("invalid", "Choose a length");
  if (!fitsHours(s, start, duration)) throw new BookingError("invalid", "That time is outside opening hours");

  let name = String(input.name ?? "").trim().slice(0, 80);
  let phone = "";
  if (kind === "manual") {
    if (name.length < 2) throw new BookingError("invalid", "Enter the customer's name");
    if (input.phone && String(input.phone).trim()) {
      const p = normalizePhone(String(input.phone));
      if (!p) throw new BookingError("invalid", "That phone number isn't a valid Egyptian mobile");
      phone = p;
    }
  } else {
    name = name || "Blocked";
  }
  const price = kind === "manual" ? pricing(s, duration) : { total: 0, deposit: 0 };
  const code = randomBytes(9).toString("base64url");

  const id = await transaction(async (db) => {
    await expireStale(db);
    const res = await db.query<{ id: string }>(
      `INSERT INTO bookings (code, kind, status, business_date, start_minute, duration, customer_name, phone,
         total_price, deposit_amount, deposit_paid, note, confirmed_at)
       VALUES ($1, $2, 'confirmed', $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       RETURNING id::text`,
      [
        code, kind, input.date, start, duration, name, phone, price.total,
        kind === "manual" && input.depositPaid ? price.deposit : 0,
        kind === "manual" && Boolean(input.depositPaid),
        String(input.note ?? "").trim().slice(0, 200),
      ],
    );
    await lockSlots(db, res.rows[0].id, input.date, start, duration);
    return res.rows[0].id;
  });
  const rows = await query<Booking>(`SELECT ${COLS} FROM bookings WHERE id = $1`, [id]);
  return rows[0];
}

export type ReportDay = {
  date: string;
  bookings: number;
  hours: number;
  deposits: number;
  counter_cash: number;
  counter_instapay: number;
  no_shows: number;
  released: number;
};

export async function report(from: string, to: string): Promise<ReportDay[]> {
  if (!isDate(from) || !isDate(to) || from > to) throw new BookingError("invalid");
  await expireStale();
  return query<ReportDay>(
    `SELECT business_date::text AS date,
       COUNT(*) FILTER (WHERE status IN ('confirmed','paid'))::int AS bookings,
       COALESCE(SUM(duration) FILTER (WHERE status IN ('confirmed','paid')), 0)::float / 60 AS hours,
       COALESCE(SUM(deposit_amount) FILTER (WHERE status IN ('confirmed','paid') AND deposit_paid), 0)::int AS deposits,
       COALESCE(SUM(total_price - CASE WHEN deposit_paid THEN deposit_amount ELSE 0 END)
         FILTER (WHERE status = 'paid' AND remaining_method = 'cash'), 0)::int AS counter_cash,
       COALESCE(SUM(total_price - CASE WHEN deposit_paid THEN deposit_amount ELSE 0 END)
         FILTER (WHERE status = 'paid' AND remaining_method = 'instapay'), 0)::int AS counter_instapay,
       COUNT(*) FILTER (WHERE attendance = 'no_show')::int AS no_shows,
       COUNT(*) FILTER (WHERE status IN ('rejected','expired'))::int AS released
     FROM bookings
     WHERE kind <> 'block' AND business_date BETWEEN $1 AND $2
     GROUP BY business_date ORDER BY business_date`,
    [from, to],
  );
}
