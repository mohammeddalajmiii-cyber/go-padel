import type { NextRequest } from "next/server";
import { proofImage } from "@/lib/bookings";
import { admin, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/admin/proof/:id → the InstaPay screenshot (front desk only)
export function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return admin(req, async () => {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return json({ error: "not_found" }, 404);
    const img = await proofImage(id);
    if (!img) return json({ error: "not_found" }, 404);
    return new Response(new Uint8Array(img.data), {
      headers: { "Content-Type": img.mime, "Cache-Control": "private, max-age=3600" },
    });
  });
}
