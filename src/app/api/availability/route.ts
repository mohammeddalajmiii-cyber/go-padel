import type { NextRequest } from "next/server";
import { availability } from "@/lib/bookings";
import { handle, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/availability?date=2026-11-07 → which half hours are free
export function GET(req: NextRequest) {
  return handle(async () => json(await availability(req.nextUrl.searchParams.get("date") ?? "")));
}
