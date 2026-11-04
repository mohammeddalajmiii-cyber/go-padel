// Front desk login: one shared password (ADMIN_PASSWORD) and a signed cookie.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { badSessionSecret, missingAdminPassword } from "./setup";

export const COOKIE = "gp_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // stay signed in for 14 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw badSessionSecret();
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw missingAdminPassword();
  // Compare hashes so the check takes the same time whatever is typed.
  const h = (v: string) => createHmac("sha256", "gp").update(v).digest("hex");
  return safeEqual(h(String(input ?? "")), h(real));
}

export function createSessionToken(): string {
  const payload = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${payload}.${sign(payload)}`;
}

function validToken(token: string | undefined): boolean {
  if (!token) return false;
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) return false; // not set up yet
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  return Number(payload) > Date.now() / 1000;
}

export const sessionCookie = (token: string) => ({
  name: COOKIE,
  value: token,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
});

/** For pages and layouts. */
export async function isAdmin(): Promise<boolean> {
  return validToken((await cookies()).get(COOKIE)?.value);
}

/** For API routes. */
export function isAdminRequest(req: NextRequest): boolean {
  return validToken(req.cookies.get(COOKIE)?.value);
}
