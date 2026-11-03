import { checkPassword, createSessionToken, sessionCookie } from "@/lib/auth";
import { handle, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const { password } = await readJson(req);
    if (!checkPassword(String(password ?? ""))) {
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return json({ error: "wrong", message: "That password isn't right" }, 401);
    }
    const res = json({ ok: true });
    res.cookies.set(sessionCookie(createSessionToken()));
    return res;
  });
}
