import { query } from "./db";
import { priceFor } from "./pricing";

export type Settings = {
  open_minute: number;
  close_minute: number;
  price_30: number;
  price_60: number;
  deposit_30: number;
  deposit_60: number;
  hold_minutes: number;
  days_ahead: number;
  instapay_link: string;
  instapay_address: string;
};

const FIELDS =
  "open_minute, close_minute, price_30, price_60, deposit_30, deposit_60, hold_minutes, days_ahead, instapay_link, instapay_address";

export async function getSettings(): Promise<Settings> {
  const rows = await query<Settings>(`SELECT ${FIELDS} FROM settings WHERE id = 1`);
  if (rows[0]) return rows[0];
  // The settings row was deleted by hand: put the defaults back.
  await query("INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
  return (await query<Settings>(`SELECT ${FIELDS} FROM settings WHERE id = 1`))[0];
}

export function pricing(s: Settings, duration: number): { total: number; deposit: number } {
  return priceFor(s, duration);
}

/** Checks and saves new settings. Returns an error message or null. */
export async function updateSettings(input: Partial<Settings>): Promise<string | null> {
  const s = { ...(await getSettings()), ...input };
  const ints: (keyof Settings)[] = [
    "open_minute", "close_minute", "price_30", "price_60",
    "deposit_30", "deposit_60", "hold_minutes", "days_ahead",
  ];
  for (const k of ints) {
    const v = Number(s[k]);
    if (!Number.isInteger(v) || v < 0) return `${k} must be a whole number`;
    (s as Record<string, unknown>)[k] = v;
  }
  if (s.open_minute % 30 || s.close_minute % 30) return "Opening and closing times must be on the hour or half hour";
  if (s.open_minute >= 1440) return "Opening time must be before midnight";
  if (s.close_minute <= s.open_minute) return "Closing time must be after opening time";
  if (s.close_minute - s.open_minute > 1440) return "The venue can't be open more than 24 hours";
  if (s.deposit_30 > s.price_30 || s.deposit_60 > s.price_60) return "A deposit can't be more than the price";
  if (s.hold_minutes < 5 || s.hold_minutes > 120) return "Payment time must be between 5 and 120 minutes";
  if (s.days_ahead < 1 || s.days_ahead > 90) return "Days ahead must be between 1 and 90";
  const link = String(s.instapay_link ?? "").trim();
  if (link && !/^https:\/\//.test(link)) return "The InstaPay link must start with https://";

  await query(
    `UPDATE settings SET open_minute=$1, close_minute=$2, price_30=$3, price_60=$4,
       deposit_30=$5, deposit_60=$6, hold_minutes=$7, days_ahead=$8,
       instapay_link=$9, instapay_address=$10, updated_at=now()
     WHERE id = 1`,
    [
      s.open_minute, s.close_minute, s.price_30, s.price_60, s.deposit_30, s.deposit_60,
      s.hold_minutes, s.days_ahead, link, String(s.instapay_address ?? "").trim(),
    ],
  );
  return null;
}
