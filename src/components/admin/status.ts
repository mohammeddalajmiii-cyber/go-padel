import type { AdminBooking } from "./types";

export const STATUS: Record<string, { label: string; cls: string }> = {
  holding: { label: "Waiting for deposit", cls: "bg-warn-soft text-warn border-warn/30" },
  reviewing: { label: "Check payment", cls: "bg-glass text-court border-court/40" },
  confirmed: { label: "Confirmed", cls: "bg-ok-soft text-ok border-ok/30" },
  paid: { label: "Paid in full", cls: "bg-ok text-night border-ok" },
  block: { label: "Blocked", cls: "bg-line/60 text-muted border-line" },
};
export const statusOf = (b: AdminBooking) => (b.kind === "block" ? STATUS.block : STATUS[b.status]);
