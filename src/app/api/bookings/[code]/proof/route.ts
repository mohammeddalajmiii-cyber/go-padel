import { submitProof } from "@/lib/bookings";
import { handle, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // the page shrinks screenshots before sending
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// POST /api/bookings/:code/proof  (form field "file") → saves the InstaPay screenshot
export function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof Blob) || file.size === 0) return json({ error: "file" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "tooBig" }, 413);
    const mime = file.type || "image/jpeg";
    if (!TYPES.includes(mime)) return json({ error: "file" }, 400);
    await submitProof(code, Buffer.from(await file.arrayBuffer()), mime);
    return json({ ok: true });
  });
}
