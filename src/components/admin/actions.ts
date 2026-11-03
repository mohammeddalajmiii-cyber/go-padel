import { api, type AdminBooking } from "./types";

export const act = (id: string, body: Record<string, unknown>) =>
  api<AdminBooking>(`/api/admin/bookings/${id}`, { method: "POST", body: JSON.stringify(body) });

export const REJECT_REASONS = [
  "Wrong amount",
  "Screenshot is unclear",
  "Transfer not received",
  "Screenshot is from an old transfer",
];
