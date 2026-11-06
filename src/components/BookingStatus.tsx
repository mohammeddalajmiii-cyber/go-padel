"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { durationLabel, fill, num, t, type Lang } from "@/lib/i18n";
import { addDays, formatDate, formatTime } from "@/lib/time";
import { shrinkImage } from "@/lib/image";
import { BookingSteps } from "./BookingSteps";
import { Icon, type IconName } from "./Icon";

type Data = {
  status: "holding" | "reviewing" | "confirmed" | "paid" | "rejected" | "expired" | "cancelled";
  date: string;
  start: number;
  duration: number;
  name: string;
  total: number;
  deposit: number;
  remaining: number;
  hasProof: boolean;
  secondsLeft: number | null;
  rejectReason: string | null;
  instapayLink: string;
  instapayAddress: string;
  holdMinutes: number;
};

const POLL: Partial<Record<Data["status"], number>> = { holding: 5000, reviewing: 4000, confirmed: 20000 };
const MAPS = "https://www.google.com/maps/search/?api=1&query=Avenue+Mall+Rehab+City";
const panel = "rounded-3xl border border-edge bg-surface";

export function BookingStatus({ lang, code }: { lang: Lang; code: string }) {
  const d = t(lang);
  const st = d.status;
  const e = d.extra;
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const deadline = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${code}`, { cache: "no-store" });
      if (res.status === 404) return setMissing(true);
      if (!res.ok) return;
      const next: Data = await res.json();
      deadline.current = next.secondsLeft !== null ? Date.now() + next.secondsLeft * 1000 : null;
      setLeft(next.secondsLeft);
      setData(next);
    } catch {
      /* offline for a moment: the next poll will catch up */
    }
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates: check again every few seconds while something can still change.
  useEffect(() => {
    const every = data ? POLL[data.status] : undefined;
    if (!every) return;
    const id = setInterval(refresh, every);
    return () => clearInterval(id);
  }, [data, refresh]);

  // Countdown for paying the deposit.
  useEffect(() => {
    if (data?.status !== "holding") return;
    const id = setInterval(() => {
      if (deadline.current === null) return;
      const s = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) refresh();
    }, 1000);
    return () => clearInterval(id);
  }, [data?.status, refresh]);

  if (missing)
    return (
      <div className={`${panel} p-8 text-center`}>
        <Icon name="info" size={32} className="mx-auto text-lime" />
        <p className="mt-4 text-lg">{st.notFound}</p>
        <Link href={`/${lang}/book`} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-lime px-6 font-bold text-night hover:bg-lime-hi">
          {d.nav.book}
        </Link>
      </div>
    );

  if (!data)
    return (
      <div className="space-y-4" aria-label={d.book.loading}>
        <div className="h-8 w-56 animate-pulse rounded-full bg-raised" />
        <div className="h-48 animate-pulse rounded-3xl bg-surface" />
        <div className="h-72 animate-pulse rounded-3xl bg-surface" />
      </div>
    );

  const egp = d.home.egp;
  const timeRange = `${formatTime(data.start, lang)} – ${formatTime(data.start + data.duration, lang)}`;

  const summary = (
    <dl className="space-y-3">
      <Row icon="calendar" label={e.day} value={formatDate(data.date, lang)} />
      <Row icon="clock" label={e.time} value={timeRange} />
      <Row icon="hourglass" label={e.length} value={durationLabel(data.duration, lang)} />
    </dl>
  );

  const closed = (title: string, text: string, bad: boolean, extra?: React.ReactNode) => (
    <section className={`${panel} overflow-hidden`}>
      <div className="p-7">
        <span className={`grid size-12 place-items-center rounded-full ${bad ? "bg-alert-bg text-alert" : "bg-raised text-dim"}`}>
          <Icon name="info" size={24} />
        </span>
        <h2 className="gp-display mt-5 text-3xl">{title}</h2>
        <p className="mt-3 leading-relaxed text-dim">{text}</p>
        {extra}
      </div>
      <div className="border-t border-edge bg-raised/40 p-7">{summary}</div>
      <div className="p-7 pt-0">
        <Link href={`/${lang}/book`} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-lime px-6 font-bold text-night transition-colors hover:bg-lime-hi">
          {st.bookAgain}
          <Icon name="arrow" size={18} strokeWidth={2.4} className="rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );

  switch (data.status) {
    case "holding":
      return (
        <div className="space-y-8">
          <BookingSteps lang={lang} current={2} />
          <PayDeposit lang={lang} code={code} data={data} left={left ?? 0} summary={summary} onDone={refresh} />
        </div>
      );

    case "reviewing":
      return (
        <div className="space-y-8">
          <BookingSteps lang={lang} current={3} />
          <section className={`${panel} overflow-hidden`} role="status">
            <div className="flex flex-col items-center p-8 text-center sm:p-10">
              <span className="relative grid size-20 place-items-center">
                <span className="gp-pulse absolute inset-0 rounded-full bg-lime/15" aria-hidden />
                <span className="absolute inset-3 rounded-full bg-lime/20" aria-hidden />
                <span className="relative grid size-12 place-items-center rounded-full bg-lime text-night">
                  <Icon name="hourglass" size={22} strokeWidth={2.2} />
                </span>
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-lime rtl:text-sm rtl:tracking-normal">{e.waiting}</p>
              <h2 className="gp-display mt-3 text-4xl">{st.reviewingTitle}</h2>
              <p className="mt-4 max-w-md leading-relaxed text-dim">{st.reviewingText}</p>
            </div>
            <div className="border-t border-edge bg-raised/40 p-7">{summary}</div>
          </section>
          <KeepLink text={st.keepLink} />
        </div>
      );

    case "confirmed":
    case "paid": {
      const paid = data.status === "paid";
      return (
        <div className="space-y-8">
          <BookingSteps lang={lang} current={3} />
          <section className="overflow-hidden rounded-3xl border border-lime/30 bg-surface shadow-[0_30px_80px_-40px_rgba(200,240,49,0.35)]" role="status">
            {/* Ticket head */}
            <div className="relative bg-lime p-7 text-night sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-night/70 rtl:text-sm rtl:tracking-normal">
                  Go Padel · {e.ticket}
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-night text-lime">
                  <Icon name="check" size={22} strokeWidth={2.8} />
                </span>
              </div>
              <h2 className="gp-display mt-6 text-4xl sm:text-5xl">{paid ? st.paidTitle : st.confirmedTitle}</h2>
              <p className="mt-3 max-w-md leading-relaxed text-night/80">
                {paid ? st.paidText : fill(st.confirmedText, { amount: num(data.remaining, lang) })}
              </p>
            </div>
            {/* Perforation */}
            <div className="relative h-0" aria-hidden>
              <span className="absolute -start-3 -top-3 size-6 rounded-full bg-night" />
              <span className="absolute -end-3 -top-3 size-6 rounded-full bg-night" />
              <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-edge" />
            </div>
            {/* Ticket body */}
            <dl className="grid gap-6 p-7 sm:grid-cols-2 sm:p-8">
              <TicketField label={e.player} value={data.name} />
              <TicketField label={e.day} value={formatDate(data.date, lang)} />
              <TicketField label={e.time} value={timeRange} />
              <TicketField label={e.length} value={durationLabel(data.duration, lang)} />
            </dl>
            <div className="mx-7 mb-7 rounded-2xl bg-raised/60 p-5 sm:mx-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-dim">{st.total}</span>
                <span className="font-semibold">
                  {num(data.total, lang)} {egp}
                </span>
              </div>
              {!paid && (
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="font-semibold">{st.remaining}</span>
                  <span className="gp-figure text-2xl text-lime">
                    {num(data.remaining, lang)} <span className="text-base">{egp}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-edge p-7 sm:p-8">
              <button
                type="button"
                onClick={() => downloadIcs(code, data, e.calendarTitle, d.home.findText)}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-chalk px-6 font-bold text-night transition-colors hover:bg-white"
              >
                <Icon name="calendar" size={18} />
                {e.addCalendar}
              </button>
              <a
                href={MAPS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-edge px-6 font-semibold transition-colors hover:border-chalk"
              >
                <Icon name="map" size={18} />
                {e.directions}
              </a>
            </div>
          </section>
          <KeepLink text={st.keepLink} />
        </div>
      );
    }

    case "rejected":
      return closed(
        st.rejectedTitle,
        st.rejectedText,
        true,
        data.rejectReason ? (
          <p className="mt-4 rounded-xl bg-alert-bg px-4 py-3 text-alert">
            {st.reason}: {data.rejectReason}
          </p>
        ) : null,
      );
    case "expired":
      return closed(st.expiredTitle, fill(st.expiredText, { hold: num(data.holdMinutes, lang) }), false);
    default:
      return closed(st.cancelledTitle, st.cancelledText, false);
  }
}

function Row({ icon, label, value }: { icon?: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-dim">
        {icon && <Icon name={icon} size={17} />}
        {label}
      </dt>
      <dd className="text-end font-semibold">{value}</dd>
    </div>
  );
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-dim rtl:tracking-normal">{label}</dt>
      <dd className="mt-1.5 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function KeepLink({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-dim">
      <Icon name="info" size={16} className="shrink-0 text-lime" />
      {text}
    </p>
  );
}

/** A calendar file for the booking, in Cairo time (bookings after midnight fall on the next calendar day). */
function downloadIcs(code: string, data: Data, title: string, place: string) {
  const stamp = (minute: number) => {
    const day = addDays(data.date, Math.floor(minute / 1440));
    const m = minute % 1440;
    return `${day.replace(/-/g, "")}T${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
  };
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Go Padel//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${code}@gopadel`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Africa/Cairo:${stamp(data.start)}`,
    `DTEND;TZID=Africa/Cairo:${stamp(data.start + data.duration)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(place)}`,
    `URL:${typeof window !== "undefined" ? window.location.href : ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "go-padel-booking.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function PayDeposit({
  lang,
  code,
  data,
  left,
  summary,
  onDone,
}: {
  lang: Lang;
  code: string;
  data: Data;
  left: number;
  summary: React.ReactNode;
  onDone: () => void;
}) {
  const d = t(lang);
  const st = d.status;
  const e = d.extra;
  const egp = d.home.egp;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const clock = lang === "ar" ? `${num(mm, lang)}:${num(Number(ss[0]), lang)}${num(Number(ss[1]), lang)}` : `${mm}:${ss}`;
  const urgent = left <= 120;
  const total = Math.max(1, data.holdMinutes * 60);
  const frac = Math.max(0, Math.min(1, left / total));
  const R = 34;
  const C = 2 * Math.PI * R;

  function choose(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/") && !/\.(heic|heif)$/i.test(f.name)) return setError(st.errors.file);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function send() {
    if (!file) return setError(st.errors.file);
    setSending(true);
    setError(null);
    try {
      const blob = await shrinkImage(file);
      if (blob.size > 4 * 1024 * 1024) {
        setSending(false);
        return setError(st.errors.tooBig);
      }
      const form = new FormData();
      form.append("file", blob, "instapay.jpg");
      const res = await fetch(`/api/bookings/${code}/proof`, { method: "POST", body: form });
      const out = await res.json().catch(() => ({}));
      if (res.ok) return onDone();
      setError(
        out.error === "expired" ? st.errors.expired : out.error === "tooBig" ? st.errors.tooBig : out.error === "file" ? st.errors.file : st.errors.generic,
      );
      if (out.error === "expired") onDone();
    } catch {
      setError(st.errors.generic);
    }
    setSending(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.instapayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not allowed: the address is still visible to copy by hand */
    }
  }

  const steps = [fill(st.payStep1, { amount: num(data.deposit, lang) }), st.payStep2, st.payStep3];

  return (
    <div className="space-y-6">
      {/* Countdown */}
      <section className={`${panel} flex items-center gap-5 p-5 sm:p-6 ${urgent ? "border-alert/40" : ""}`} role="timer" aria-live={urgent ? "polite" : "off"}>
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--color-raised)" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={urgent ? "var(--color-alert)" : "var(--color-lime)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className={`gp-figure absolute inset-0 grid place-items-center text-lg ${urgent ? "text-alert" : ""}`} dir="ltr">
            {clock}
          </span>
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-[0.14em] rtl:text-sm rtl:tracking-normal ${urgent ? "text-alert" : "text-lime"}`}>{e.payIn}</p>
          <p className="mt-1 leading-relaxed">{fill(st.timer, { time: clock })}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        {/* What you're paying for */}
        <section className={`${panel} overflow-hidden`}>
          <div className="p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-dim rtl:text-sm rtl:tracking-normal">{st.summary}</h2>
            <div className="mt-4">{summary}</div>
          </div>
          <div className="space-y-2 border-t border-edge bg-raised/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-dim">{st.total}</span>
              <span className="font-semibold">
                {num(data.total, lang)} {egp}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 rounded-xl bg-lime px-4 py-3 text-night">
              <span className="font-bold">{st.depositNow}</span>
              <span className="gp-figure text-2xl">
                {num(data.deposit, lang)} <span className="text-base">{egp}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-dim">
              <span>{st.remaining}</span>
              <span>
                {num(data.remaining, lang)} {egp}
              </span>
            </div>
          </div>
        </section>

        {/* How to pay */}
        <section className={`${panel} p-6`}>
          <h2 className="text-xl font-bold">{st.payTitle}</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-night">{num(i + 1, lang)}</span>
                <span className="pt-1 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {data.instapayLink && (
            <a
              href={data.instapayLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-chalk px-6 py-4 text-base font-bold text-night transition-colors hover:bg-white"
            >
              <Icon name="phone" size={19} />
              {st.openInstapay}
            </a>
          )}
          {data.instapayAddress && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-edge bg-night px-4 py-3">
              <div className="min-w-0">
                <span className="block text-xs text-dim">{st.instapayAddress}</span>
                <span className="block truncate font-semibold" dir="ltr">
                  {data.instapayAddress}
                </span>
              </div>
              <button
                type="button"
                onClick={copy}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  copied ? "border-lime text-lime" : "border-edge hover:border-chalk"
                }`}
              >
                <Icon name={copied ? "check" : "copy"} size={15} />
                {copied ? st.copied : st.copy}
              </button>
            </div>
          )}

          <label className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-edge p-5 text-center transition-colors hover:border-lime/70 hover:bg-raised/30">
            <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={(ev) => choose(ev.target.files?.[0])} />
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="mx-auto max-h-64 rounded-xl object-contain" />
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
                  <Icon name="upload" size={16} />
                  {st.change}
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-3 py-5">
                <span className="grid size-12 place-items-center rounded-full bg-lime/10 text-lime ring-1 ring-lime/30">
                  <Icon name="upload" size={22} />
                </span>
                <span className="font-semibold text-lime">{st.upload}</span>
              </span>
            )}
          </label>

          {error && <p className="mt-4 rounded-xl bg-alert-bg px-4 py-3 text-alert">{error}</p>}

          <button
            type="button"
            onClick={send}
            disabled={!file || sending || left === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-base font-bold text-night transition-colors hover:bg-lime-hi disabled:cursor-not-allowed disabled:bg-raised disabled:text-dim"
          >
            {sending ? st.uploading : st.confirm}
            {!sending && <Icon name="check" size={18} strokeWidth={2.6} />}
          </button>
        </section>
      </div>

      <KeepLink text={st.keepLink} />
    </div>
  );
}
