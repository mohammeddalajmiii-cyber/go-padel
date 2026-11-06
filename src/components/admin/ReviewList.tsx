"use client";

import { useState } from "react";
import { formatDate, formatTime } from "@/lib/time";
import { act } from "./actions";
import { RejectForm } from "./RejectForm";
import { egp, type AdminBooking } from "./types";

/** Payments waiting for the front desk to check the InstaPay screenshot. */
export function ReviewList({
  items,
  onOpen,
  onChanged,
}: {
  items: AdminBooking[];
  onOpen: (id: string) => void;
  onChanged: (msg?: string, b?: AdminBooking) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(b: AdminBooking, body: Record<string, unknown>, msg: string) {
    setBusy(b.id);
    setError(null);
    try {
      const updated = await act(b.id, body);
      setRejecting(null);
      onChanged(msg, updated);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <section className="rounded-panel border border-line bg-white">
      <h2 className="flex items-center justify-between border-b border-line px-4 py-3 font-semibold">
        Payments to check
        <span className={`rounded-full px-2.5 py-0.5 text-sm ${items.length ? "bg-court text-court-line" : "bg-paper text-muted"}`}>
          {items.length}
        </span>
      </h2>
      {error && <p className="px-4 pt-3 text-sm text-bad">{error}</p>}
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No payments waiting. New InstaPay screenshots show up here automatically.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((b) => (
            <li key={b.id} className="p-4">
              <div className="flex gap-3">
                <button type="button" onClick={() => onOpen(b.id)} className="shrink-0" aria-label={`Open ${b.customer_name}'s booking`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/admin/proof/${b.id}`} alt="InstaPay screenshot" className="h-24 w-16 rounded-chip border border-line object-cover" />
                </button>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">{b.customer_name}</p>
                  <p className="text-muted" dir="ltr">
                    {b.phone}
                  </p>
                  <p className="mt-1">
                    {formatDate(b.business_date, "en", { weekday: "short", month: "short" })}, {formatTime(b.start_minute, "en")} ·{" "}
                    {b.duration} min
                  </p>
                  <p className="mt-1 font-semibold">Deposit: {egp(b.deposit_amount)}</p>
                </div>
              </div>
              {rejecting === b.id ? (
                <RejectForm busy={busy === b.id} onCancel={() => setRejecting(null)} onReject={(reason) => run(b, { action: "reject", reason }, `Payment rejected for ${b.customer_name}`)} />
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy === b.id}
                    onClick={() => run(b, { action: "confirm" }, `Booking confirmed for ${b.customer_name}`)}
                    className="rounded-chip bg-ok px-3 py-2 text-sm font-semibold text-night disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={busy === b.id}
                    onClick={() => setRejecting(b.id)}
                    className="rounded-chip border border-line px-3 py-2 text-sm font-medium"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
