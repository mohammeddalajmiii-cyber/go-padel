import type { NextRequest } from "next/server";
import { adminCreate } from "@/lib/bookings";
import { admin, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

// POST /api/admin/bookings → add a walk-in / phone booking, or block time
export function POST(req: NextRequest) {
  return admin(req, async () => {
    const b = await readJson(req);
    const booking = await adminCreate({
      kind: b.kind === "block" ? "block" : "manual",
      date: String(b.date ?? ""),
      start: Number(b.start),
      duration: Number(b.duration),
      name: String(b.name ?? ""),
      phone: String(b.phone ?? ""),
      depositPaid: Boolean(b.depositPaid),
      note: String(b.note ?? ""),
    });
    return json(booking, 201);
  });
}
