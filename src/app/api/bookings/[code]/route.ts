import { getByCode, remainingDue } from "@/lib/bookings";
import { getSettings } from "@/lib/settings";
import { handle, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/bookings/:code → the customer's booking status (polled by the booking page)
export function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    const b = await getByCode(code);
    if (!b) return json({ error: "not_found" }, 404);
    const s = await getSettings();
    return json({
      status: b.status,
      date: b.business_date,
      start: b.start_minute,
      duration: b.duration,
      name: b.customer_name,
      total: b.total_price,
      deposit: b.deposit_amount,
      remaining: remainingDue({ ...b, deposit_paid: b.deposit_paid || b.status === "reviewing" || b.status === "holding" }),
      hasProof: b.has_proof,
      secondsLeft: b.status === "holding" ? b.seconds_left : null,
      rejectReason: b.status === "rejected" ? b.reject_reason : null,
      instapayLink: s.instapay_link,
      instapayAddress: s.instapay_address,
      holdMinutes: s.hold_minutes,
    });
  });
}
