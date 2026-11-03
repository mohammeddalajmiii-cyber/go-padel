import { NextResponse, type NextRequest } from "next/server";
import { BookingError } from "./bookings";
import { isAdminRequest } from "./auth";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Turns thrown errors into clear JSON responses. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof BookingError) {
      const status = err.code === "not_found" ? 404 : err.code === "taken" ? 409 : 400;
      return json({ error: err.code, message: err.message }, status);
    }
    console.error(err);
    return json({ error: "server", message: "Something went wrong on the server" }, 500);
  });
}

/** Wraps an admin-only route: rejects requests without a front desk login. */
export function admin(req: NextRequest, fn: () => Promise<Response>): Promise<Response> {
  if (!isAdminRequest(req)) return Promise.resolve(json({ error: "unauthorized", message: "Sign in again" }, 401));
  return handle(fn);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
