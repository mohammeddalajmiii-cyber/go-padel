"use client";

import { useMemo, useState } from "react";
import { coveredSlots, fitsHours, formatDate, formatTime, slotStarts, type Hours } from "@/lib/time";
import { api, egp } from "./types";
import { DURATIONS, priceFor } from "@/lib/pricing";

export function AddBooking(props: {
  date: string;
  kind: "manual" | "block";
  initialStart: number | null;
  hours: Hours;
  prices: { price_30: number; price_60: number; deposit_30: number; deposit_60: number };
  taken: Set<number>;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { hours, taken, prices } = props;
  const [kind, setKind] = useState(props.kind);
  const [duration, setDuration] = useState(() => {
    // Clicking a free half hour that's followed by a booking should default to 30 minutes.
    const s = props.initialStart;
    return s !== null && (taken.has(s + 30) || !fitsHours(hours, s, 60)) ? 30 : 60;
  });
  const [start, setStart] = useState<number | null>(props.initialStart);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const free = (s: number, d: number) => fitsHours(hours, s, d) && coveredSlots(s, d).every((m) => !taken.has(m));
  const starts = useMemo(() => slotStarts(hours).filter((s) => free(s, duration)), [hours, taken, duration]); // eslint-disable-line react-hooks/exhaustive-deps
  const lengths: number[] = kind === "manual" ? [...DURATIONS] : Array.from({ length: (hours.close_minute - hours.open_minute) / 30 }, (_, i) => (i + 1) * 30);
  const { total: price, deposit } = priceFor(prices, duration);
  const validStart = start !== null && free(start, duration);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!validStart) return setError("Choose a free start time");
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/bookings", {
        method: "POST",
        body: JSON.stringify({ kind, date: props.date, start, duration, name, phone, depositPaid, note }),
      });
      props.onDone(kind === "block" ? "Time blocked" : `Booking added for ${name.trim()}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field = "mt-1.5 w-full rounded-chip border border-line bg-paper px-3 py-2.5 outline-none focus:border-court";
  const tab = (on: boolean) => `rounded-chip px-3 py-2 text-sm font-medium ${on ? "bg-court text-court-line" : "border border-line"}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={props.onClose} role="presentation">
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={kind === "block" ? "Block time" : "Add booking"}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-panel bg-white p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{kind === "block" ? "Block time" : "Add booking"}</h2>
          <button type="button" onClick={props.onClose} className="text-xl text-muted" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">{formatDate(props.date, "en")}</p>

        <div className="mt-5 flex gap-2">
          <button type="button" className={tab(kind === "manual")} onClick={() => { setKind("manual"); if (!DURATIONS.includes(duration)) setDuration(60); }}>
            Walk-in or phone booking
          </button>
          <button type="button" className={tab(kind === "block")} onClick={() => setKind("block")}>
            Block time
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Length
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
              {lengths.map((l) => (
                <option key={l} value={l}>
                  {l < 60 ? `${l} min` : l % 60 ? `${Math.floor(l / 60)} h ${l % 60} min` : `${l / 60} hour${l > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Start
            <select value={validStart ? String(start) : ""} onChange={(e) => setStart(e.target.value ? Number(e.target.value) : null)} className={field}>
              <option value="">{starts.length ? "Choose…" : "No free time"}</option>
              {starts.map((s) => (
                <option key={s} value={s}>
                  {formatTime(s, "en")} – {formatTime(s + duration, "en")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {kind === "manual" ? (
          <>
            <label className="mt-4 block text-sm font-medium">
              Customer name
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} required />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Mobile number <span className="font-normal text-muted">(optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" dir="ltr" placeholder="010 1234 5678" className={field} />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={depositPaid} onChange={(e) => setDepositPaid(e.target.checked)} className="size-5 accent-court" />
              Deposit of {egp(deposit)} already paid
            </label>
            <p className="mt-3 rounded-chip bg-paper px-3 py-2 text-sm">
              Total {egp(price)} · {egp(depositPaid ? price - deposit : price)} to collect at the counter
            </p>
          </>
        ) : (
          <label className="mt-4 block text-sm font-medium">
            Reason <span className="font-normal text-muted">(shown only to staff)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maintenance, private event" className={field} />
          </label>
        )}

        <label className="mt-4 block text-sm font-medium">
          Note <span className="font-normal text-muted">(optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </label>

        {error && <p className="mt-4 rounded-chip bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

        <button type="submit" disabled={busy || !validStart} className="mt-6 w-full rounded-chip bg-court px-5 py-3 font-semibold text-court-line disabled:opacity-50">
          {busy ? "Saving…" : kind === "block" ? "Block time" : "Add booking"}
        </button>
      </form>
    </div>
  );
}
