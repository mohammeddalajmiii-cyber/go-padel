"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/time";
import { act } from "./actions";
import { RejectForm } from "./RejectForm";
import { statusOf } from "./status";
import { egp, type AdminBooking } from "./types";

export function BookingPanel({
  booking: b,
  onClose,
  onChanged,
}: {
  booking: AdminBooking;
  onClose: () => void;
  onChanged: (msg?: string, b?: AdminBooking) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [bigImage, setBigImage] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(body: Record<string, unknown>, msg: string, close = false) {
    setBusy(true);
    setError(null);
    try {
      const updated = await act(b.id, body);
      onChanged(msg, body.action === "confirm" ? updated : undefined);
      if (close) onClose();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
    setRejecting(false);
    setCancelling(false);
  }

  const isBlock = b.kind === "block";
  const s = statusOf(b);
  const btn = "rounded-chip px-3 py-2.5 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Booking details"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
            <h2 className="mt-2 text-2xl font-semibold">{isBlock ? b.customer_name || "Blocked time" : b.customer_name}</h2>
            {b.phone && (
              <a href={`tel:${b.phone}`} className="text-court underline underline-offset-4" dir="ltr">
                {b.phone}
              </a>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-chip px-2 py-1 text-xl text-muted" aria-label="Close">
            ✕
          </button>
        </div>

        <dl className="mt-6 space-y-2 border-y border-line py-4 text-sm">
          <Item label="Day" value={formatDate(b.business_date, "en")} />
          <Item label="Time" value={`${formatTime(b.start_minute, "en")} – ${formatTime(b.start_minute + b.duration, "en")} (${b.duration} min)`} />
          {!isBlock && (
            <>
              <Item label="Total" value={egp(b.total_price)} />
              <Item label="Deposit" value={b.deposit_paid ? `${egp(b.deposit_amount)} received` : b.kind === "manual" ? "None" : `${egp(b.deposit_amount)} pending`} />
              <Item
                label="At the counter"
                value={b.status === "paid" ? `Collected (${b.remaining_method === "cash" ? "cash" : "InstaPay"})` : `${egp(b.remaining)} due`}
                strong={b.status === "confirmed"}
              />
              <Item label="Booked" value={b.kind === "online" ? `Online (${b.lang === "ar" ? "Arabic" : "English"})` : "Walk-in / phone"} />
            </>
          )}
          {b.note && <Item label="Note" value={b.note} />}
        </dl>

        {b.has_proof && (
          <div className="mt-5">
            <button type="button" onClick={() => setBigImage(!bigImage)} className="block w-full text-start text-sm font-medium text-court">
              InstaPay screenshot {bigImage ? "(tap to shrink)" : "(tap to enlarge)"}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/proof/${b.id}`}
              alt="InstaPay screenshot"
              onClick={() => setBigImage(!bigImage)}
              className={`mt-2 w-full cursor-zoom-in rounded-chip border border-line object-contain ${bigImage ? "" : "max-h-72"}`}
            />
          </div>
        )}

        {error && <p className="mt-4 rounded-chip bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

        <div className="mt-6 space-y-3">
          {b.status === "holding" && (
            <p className="rounded-chip bg-warn-soft px-3 py-2 text-sm text-warn">
              Waiting for the customer to send the deposit
              {b.seconds_left !== null && ` (${Math.ceil(b.seconds_left / 60)} min left before the slot is released)`}.
            </p>
          )}

          {b.status === "reviewing" &&
            (rejecting ? (
              <RejectForm busy={busy} onCancel={() => setRejecting(false)} onReject={(reason) => run({ action: "reject", reason }, `Payment rejected for ${b.customer_name}`, true)} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => run({ action: "confirm" }, `Booking confirmed for ${b.customer_name}`)} className={`${btn} bg-ok text-white`}>
                  Confirm payment
                </button>
                <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${btn} border border-line`}>
                  Reject
                </button>
              </div>
            ))}

          {b.status === "confirmed" && !isBlock && (
            <div>
              <p className="text-sm font-medium">Collect {egp(b.remaining)} at the counter</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => run({ action: "collect", method: "cash" }, `${egp(b.remaining)} collected in cash`)} className={`${btn} bg-court text-court-line`}>
                  Paid cash
                </button>
                <button type="button" disabled={busy} onClick={() => run({ action: "collect", method: "instapay" }, `${egp(b.remaining)} collected by InstaPay`)} className={`${btn} bg-court text-court-line`}>
                  Paid InstaPay
                </button>
              </div>
            </div>
          )}

          {(b.status === "confirmed" || b.status === "paid") && !isBlock && (
            <div>
              <p className="text-sm font-medium">Attendance</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={b.attendance === "arrived"}
                  onClick={() => run({ action: "attendance", value: b.attendance === "arrived" ? null : "arrived" }, "Attendance saved")}
                  className={`${btn} border ${b.attendance === "arrived" ? "border-ok bg-ok-soft text-ok" : "border-line"}`}
                >
                  Arrived
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={b.attendance === "no_show"}
                  onClick={() => run({ action: "attendance", value: b.attendance === "no_show" ? null : "no_show" }, "Attendance saved")}
                  className={`${btn} border ${b.attendance === "no_show" ? "border-bad bg-bad-soft text-bad" : "border-line"}`}
                >
                  No-show
                </button>
              </div>
            </div>
          )}

          {b.whatsapp && (
            <a href={b.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn} block bg-ok-soft text-center text-ok`}>
              Send WhatsApp confirmation
            </a>
          )}

          <div className="border-t border-line pt-4">
            {cancelling ? (
              <div className="rounded-chip bg-bad-soft p-3 text-sm text-bad">
                <p>{isBlock ? "Remove this block and free the time?" : "Cancel this booking? The time becomes free again. Customer bookings normally can't be cancelled."}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => run({ action: "cancel" }, isBlock ? "Blocked time removed" : "Booking cancelled", true)} className={`${btn} bg-bad text-white`}>
                    {isBlock ? "Remove block" : "Cancel booking"}
                  </button>
                  <button type="button" onClick={() => setCancelling(false)} className={`${btn} text-ink`}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setCancelling(true)} className="text-sm font-medium text-bad">
                {isBlock ? "Remove block" : "Cancel booking"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-end ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
