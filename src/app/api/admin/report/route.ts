import type { NextRequest } from "next/server";
import { report } from "@/lib/bookings";
import { admin, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/admin/report?from=YYYY-MM-DD&to=YYYY-MM-DD
export function GET(req: NextRequest) {
  return admin(req, async () => {
    const p = req.nextUrl.searchParams;
    return json({ days: await report(p.get("from") ?? "", p.get("to") ?? "") });
  });
}
