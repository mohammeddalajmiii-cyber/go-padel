import type { NextRequest } from "next/server";
import { confirmationWhatsapp, dayBookings, remainingDue, reviewQueue } from "@/lib/bookings";
import { getSettings } from "@/lib/settings";
import { businessNow } from "@/lib/time";
import { admin, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/admin/day?date=YYYY-MM-DD → the schedule for that day plus payments waiting for review
export function GET(req: NextRequest) {
  return admin(req, async () => {
    const s = await getSettings();
    const now = businessNow(s);
    const date = req.nextUrl.searchParams.get("date") || now.date;
    const [bookings, review] = await Promise.all([dayBookings(date), reviewQueue()]);
    const withExtras = (b: (typeof bookings)[number]) => ({
      ...b,
      remaining: remainingDue(b),
      whatsapp: b.status === "confirmed" || b.status === "paid" ? confirmationWhatsapp(b) : null,
    });
    return json({
      date,
      today: now.date,
      nowMinute: now.minute,
      hours: { open_minute: s.open_minute, close_minute: s.close_minute },
      prices: { price_30: s.price_30, price_60: s.price_60, deposit_30: s.deposit_30, deposit_60: s.deposit_60 },
      bookings: bookings.map(withExtras),
      review: review.map(withExtras),
    });
  });
}
