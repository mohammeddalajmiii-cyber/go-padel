import type { NextRequest } from "next/server";
import { adminAction, confirmationWhatsapp, remainingDue, type AdminAction } from "@/lib/bookings";
import { admin, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

// POST /api/admin/bookings/:id  { action: "confirm" | "reject" | "collect" | "attendance" | "cancel", ... }
export function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return admin(req, async () => {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return json({ error: "not_found" }, 404);
    const body = await readJson(req);
    const booking = await adminAction(id, body as unknown as AdminAction);
    return json({
      ...booking,
      remaining: remainingDue(booking),
      whatsapp: booking.status === "confirmed" || booking.status === "paid" ? confirmationWhatsapp(booking) : null,
    });
  });
}
