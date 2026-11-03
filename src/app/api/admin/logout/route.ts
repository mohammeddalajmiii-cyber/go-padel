import { COOKIE } from "@/lib/auth";
import { json } from "@/lib/api";

export function POST() {
  const res = json({ ok: true });
  res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
