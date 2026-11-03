import { createOnlineBooking } from "@/lib/bookings";
import { handle, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

// POST /api/bookings → holds the slot and returns the booking code
export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const result = await createOnlineBooking({
      date: String(b.date ?? ""),
      start: Number(b.start),
      duration: Number(b.duration),
      name: String(b.name ?? ""),
      phone: String(b.phone ?? ""),
      lang: b.lang === "en" ? "en" : "ar",
    });
    return json(result, 201);
  });
}
