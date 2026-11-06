"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, coveredSlots, formatDate, formatTime, slotStarts } from "@/lib/time";
import { api, egp, type AdminBooking, type DayData } from "./types";
import { BookingPanel } from "./BookingPanel";
import { AddBooking } from "./AddBooking";
import { ReviewList } from "./ReviewList";
import { statusOf } from "./status";

const time = (m: number) => formatTime(m, "en");

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* sound not available */
  }
}

export function Schedule() {
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<DayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ start: number | null; kind: "manual" | "block" } | null>(null);
  const [notice, setNotice] = useState<{ text: string; whatsapp?: string | null } | null>(null);
  const reviewCount = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api<DayData>(`/api/admin/day${date ? `?date=${date}` : ""}`);
      setData(next);
      setError(null);
      if (!date) setDate(next.date);
      const n = next.review.length;
      if (reviewCount.current !== null && n > reviewCount.current) beep();
      reviewCount.current = n;
      document.title = n ? `(${n}) Schedule · Go Padel` : "Schedule · Go Padel";
    } catch (e) {
      setError((e as Error).message);
    }
  }, [date]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const rows = useMemo(() => (data ? slotStarts(data.hours) : []), [data]);
  const covering = useMemo(() => {
    const map = new Map<number, AdminBooking>();
    for (const b of data?.bookings ?? []) for (const m of coveredSlots(b.start_minute, b.duration)) map.set(m, b);
    return map;
  }, [data]);

  const all = [...(data?.bookings ?? []), ...(data?.review ?? [])];
  const open = all.find((b) => b.id === openId) ?? null;

  const onChanged = (msg?: string, b?: AdminBooking) => {
    if (msg) setNotice({ text: msg, whatsapp: b?.whatsapp });
    load();
  };

  if (!data) return <p className="text-muted">{error ?? "Loading schedule…"}</p>;

  const isToday = data.date === data.today;
  const live = data.bookings.filter((b) => b.kind !== "block");
  const due = live.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.remaining, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        {/* Day navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setDate(addDays(data.date, -1))} className="rounded-chip border border-line bg-white px-3 py-2" aria-label="Previous day">
            ‹
          </button>
          <button type="button" onClick={() => setDate(data.today)} disabled={isToday} className="rounded-chip border border-line bg-white px-3 py-2 text-sm font-medium disabled:opacity-50">
            Today
          </button>
          <button type="button" onClick={() => setDate(addDays(data.date, 1))} className="rounded-chip border border-line bg-white px-3 py-2" aria-label="Next day">
            ›
          </button>
          <input
            type="date"
            value={data.date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-chip border border-line bg-white px-3 py-1.5 text-sm"
            aria-label="Pick a day"
          />
          <div className="ms-auto flex gap-2">
            <button type="button" onClick={() => setAdding({ start: null, kind: "block" })} className="rounded-chip border border-line bg-white px-3 py-2 text-sm font-medium">
              Block time
            </button>
            <button type="button" onClick={() => setAdding({ start: null, kind: "manual" })} className="rounded-chip bg-court px-4 py-2 text-sm font-semibold text-court-line hover:bg-court-deep">
              Add booking
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="gp-display text-3xl md:text-4xl">
            {formatDate(data.date, "en")}
            {isToday && <span className="ms-3 rounded-full bg-lime px-3 py-1 align-middle [font-family:Inter,sans-serif] [font-stretch:normal] text-sm font-bold not-italic normal-case text-night">Today</span>}
          </h1>
          <p className="text-sm text-muted">
            {live.length} booking{live.length === 1 ? "" : "s"} · {egp(due)} still to collect
          </p>
        </div>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}

        {notice && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-chip bg-ok-soft px-4 py-3 text-ok" role="status">
            <span className="font-medium">{notice.text}</span>
            <span className="flex gap-2">
              {notice.whatsapp && (
                <a href={notice.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-chip bg-ok px-3 py-1.5 text-sm font-semibold text-night">
                  Send WhatsApp
                </a>
              )}
              <button type="button" onClick={() => setNotice(null)} className="rounded-chip px-2 py-1.5 text-sm" aria-label="Dismiss">
                ✕
              </button>
            </span>
          </div>
        )}

        {/* The court's day, half hour by half hour */}
        <ol className="mt-5 overflow-hidden rounded-panel border border-line bg-white">
          {rows.map((m) => {
            const b = covering.get(m);
            const now = isToday && data.nowMinute >= m && data.nowMinute < m + 30;
            const past = isToday && data.nowMinute >= m + 30;
            if (b && b.start_minute !== m) return null; // shown by its first half hour
            const span = b ? b.duration / 30 : 1;
            return (
              <li
                key={m}
                className={`grid grid-cols-[92px_1fr] border-b border-line last:border-b-0 ${now ? "bg-ball/10" : ""}`}
                style={{ minHeight: `${span * 56}px` }}
              >
                <div className={`border-e border-line px-3 py-2 text-sm ${past ? "text-muted/60" : "text-muted"}`}>
                  {coveredSlots(m, span * 30).map((x) => (
                    <span key={x} className="block h-10 whitespace-nowrap">
                      {time(x)}
                    </span>
                  ))}
                </div>
                <div className="p-1.5">
                  {b ? (
                    <button
                      type="button"
                      onClick={() => setOpenId(b.id)}
                      className={`flex h-full w-full flex-col items-start justify-between gap-1 rounded-chip border px-3 py-2 text-start ${statusOf(b).cls}`}
                    >
                      <span className="flex w-full flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-semibold">
                          {b.kind === "block" ? b.customer_name || "Blocked" : b.customer_name}
                          {b.attendance === "arrived" && <span className="ms-2 text-xs font-medium">· arrived</span>}
                          {b.attendance === "no_show" && <span className="ms-2 text-xs font-medium">· no-show</span>}
                        </span>
                        <span className="text-xs font-medium">{statusOf(b).label}</span>
                      </span>
                      <span className="text-xs opacity-80">
                        {time(b.start_minute)} – {time(b.start_minute + b.duration)}
                        {b.kind !== "block" && b.phone && <> · <span dir="ltr">{b.phone}</span></>}
                        {b.status === "confirmed" && b.kind !== "block" && <> · {egp(b.remaining)} due</>}
                        {b.kind === "manual" && <> · walk-in/phone</>}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding({ start: m, kind: "manual" })}
                      className="flex h-full min-h-10 w-full items-center rounded-chip px-3 text-sm text-muted/70 hover:bg-paper hover:text-court"
                    >
                      Free{!past && " · add booking"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <ReviewList items={data.review} onOpen={setOpenId} onChanged={onChanged} />
      </aside>

      {open && <BookingPanel booking={open} onClose={() => setOpenId(null)} onChanged={onChanged} />}
      {adding && (
        <AddBooking
          date={data.date}
          kind={adding.kind}
          initialStart={adding.start}
          hours={data.hours}
          prices={data.prices}
          taken={new Set(covering.keys())}
          onClose={() => setAdding(null)}
          onDone={(msg) => {
            setAdding(null);
            onChanged(msg);
          }}
        />
      )}
    </div>
  );
}
