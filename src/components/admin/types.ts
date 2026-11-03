export type AdminBooking = {
  id: string;
  code: string;
  kind: "online" | "manual" | "block";
  status: "holding" | "reviewing" | "confirmed" | "paid" | "rejected" | "expired" | "cancelled";
  business_date: string;
  start_minute: number;
  duration: number;
  customer_name: string;
  phone: string;
  lang: "ar" | "en";
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  remaining_method: "cash" | "instapay" | null;
  has_proof: boolean;
  proof_uploaded_at: string | null;
  attendance: "arrived" | "no_show" | null;
  note: string;
  seconds_left: number | null;
  remaining: number;
  whatsapp: string | null;
};

export type DayData = {
  date: string;
  today: string;
  nowMinute: number;
  hours: { open_minute: number; close_minute: number };
  prices: { price_30: number; price_60: number; deposit_30: number; deposit_60: number };
  bookings: AdminBooking[];
  review: AdminBooking[];
};

/** Calls an admin API route and returns its JSON, throwing the server's message on failure. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Signed out");
  }
  const data = await res.json().catch(() => ({}));
  if (data.error === "taken") throw new Error("That time is already booked. Pick another time.");
  if (!res.ok) throw new Error(data.message || "That didn't work. Try again.");
  return data as T;
}

export const egp = (n: number) => `${new Intl.NumberFormat("en-US").format(n)} EGP`;
