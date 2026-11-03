"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fill, num, t, type Lang } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/time";
import { shrinkImage } from "@/lib/image";

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

export function BookingStatus({ lang, code }: { lang: Lang; code: string }) {
  const d = t(lang);
  const st = d.status;
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

  if (missing) return <p className="rounded-panel bg-white p-6">{st.notFound}</p>;
  if (!data) return <p className="text-muted">{d.book.loading}</p>;

  const when = (
    <>
      <span className="block font-semibold">{formatDate(data.date, lang)}</span>
      <span className="block text-muted">
        {formatTime(data.start, lang)} – {formatTime(data.start + data.duration, lang)}
        {" · "}
        {data.duration === 30 ? d.home.min30 : d.home.min60}
      </span>
    </>
  );
  const egp = d.home.egp;

  const closed = (title: string, text: string, tone: "bad" | "muted", extra?: React.ReactNode) => (
    <section className="rounded-panel border border-line bg-white p-6">
      <h2 className={`text-2xl font-semibold ${tone === "bad" ? "text-bad" : ""}`}>{title}</h2>
      <p className="mt-3 leading-relaxed">{text}</p>
      {extra}
      <div className="mt-5 border-t border-line pt-5">{when}</div>
      <Link
        href={`/${lang}/book`}
        className="mt-6 inline-block rounded-chip bg-ball px-5 py-3 font-semibold text-ink hover:bg-ball-deep"
      >
        {st.bookAgain}
      </Link>
    </section>
  );

  switch (data.status) {
    case "holding":
      return <PayDeposit lang={lang} code={code} data={data} left={left ?? 0} when={when} onDone={refresh} />;

    case "reviewing":
      return (
        <section className="rounded-panel border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="gp-pulse size-3 rounded-full bg-court" aria-hidden />
            <h2 className="text-2xl font-semibold">{st.reviewingTitle}</h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted" role="status">
            {st.reviewingText}
          </p>
          <div className="mt-5 border-t border-line pt-5">{when}</div>
          <p className="mt-5 text-sm text-muted">{st.keepLink}</p>
        </section>
      );

    case "confirmed":
    case "paid": {
      const paid = data.status === "paid";
      return (
        <section className="overflow-hidden rounded-panel bg-court-deep text-court-line" role="status">
          <div className="p-6">
            <span className="grid size-12 place-items-center rounded-full bg-ball text-2xl text-ink" aria-hidden>
              ✓
            </span>
            <h2 className="mt-4 text-3xl font-semibold">{paid ? st.paidTitle : st.confirmedTitle}</h2>
            <p className="mt-2 leading-relaxed text-court-line/85">
              {paid ? st.paidText : fill(st.confirmedText, { amount: num(data.remaining, lang) })}
            </p>
          </div>
          <div className="bg-white p-6 text-ink">
            {when}
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row label={st.total} value={`${num(data.total, lang)} ${egp}`} />
              {!paid && <Row label={st.remaining} value={`${num(data.remaining, lang)} ${egp}`} strong />}
            </dl>
            <p className="mt-5 text-sm text-muted">{st.keepLink}</p>
          </div>
        </section>
      );
    }

    case "rejected":
      return closed(
        st.rejectedTitle,
        st.rejectedText,
        "bad",
        data.rejectReason ? (
          <p className="mt-3 rounded-chip bg-bad-soft px-4 py-3 text-bad">
            {st.reason}: {data.rejectReason}
          </p>
        ) : null,
      );
    case "expired":
      return closed(st.expiredTitle, fill(st.expiredText, { hold: num(data.holdMinutes, lang) }), "muted");
    default:
      return closed(st.cancelledTitle, st.cancelledText, "muted");
  }
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{value}</dd>
    </div>
  );
}

function PayDeposit({
  lang,
  code,
  data,
  left,
  when,
  onDone,
}: {
  lang: Lang;
  code: string;
  data: Data;
  left: number;
  when: React.ReactNode;
  onDone: () => void;
}) {
  const d = t(lang);
  const st = d.status;
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

  return (
    <div className="space-y-5">
      <p
        className={`rounded-chip px-4 py-3 font-medium ${urgent ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}
        role="timer"
        aria-live={urgent ? "polite" : "off"}
      >
        {fill(st.timer, { time: clock })}
      </p>

      <section className="rounded-panel border border-line bg-white p-6">
        <h2 className="text-sm font-medium text-muted">{st.summary}</h2>
        <div className="mt-2">{when}</div>
        <dl className="mt-5 space-y-2 border-t border-line pt-5">
          <Row label={st.total} value={`${num(data.total, lang)} ${egp}`} />
          <div className="flex items-baseline justify-between gap-4 rounded-chip bg-ball/40 px-3 py-2.5">
            <dt className="font-semibold">{st.depositNow}</dt>
            <dd className="text-2xl font-semibold">
              {num(data.deposit, lang)} <span className="text-base">{egp}</span>
            </dd>
          </div>
          <Row label={st.remaining} value={`${num(data.remaining, lang)} ${egp}`} />
        </dl>
      </section>

      <section className="rounded-panel border border-line bg-white p-6">
        <h2 className="text-xl font-semibold">{st.payTitle}</h2>
        <ol className="mt-4 space-y-2.5">
          {[fill(st.payStep1, { amount: num(data.deposit, lang) }), st.payStep2, st.payStep3].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-court text-sm font-semibold text-court-line">
                {num(i + 1, lang)}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {data.instapayLink && (
          <a
            href={data.instapayLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center rounded-chip bg-court px-6 py-4 text-base font-semibold text-court-line hover:bg-court-deep"
          >
            {st.openInstapay}
          </a>
        )}
        {data.instapayAddress && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-chip bg-glass px-4 py-3">
            <div className="min-w-0">
              <span className="block text-xs text-muted">{st.instapayAddress}</span>
              <span className="block truncate font-semibold" dir="ltr">
                {data.instapayAddress}
              </span>
            </div>
            <button type="button" onClick={copy} className="shrink-0 rounded-chip border border-line bg-white px-3 py-1.5 text-sm font-medium">
              {copied ? st.copied : st.copy}
            </button>
          </div>
        )}

        <label className="mt-6 block cursor-pointer rounded-chip border-2 border-dashed border-line p-4 text-center hover:border-court">
          <input
            type="file"
            accept="image/*,.heic,.heif"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="mx-auto max-h-64 rounded-chip object-contain" />
              <span className="mt-3 block text-sm font-medium text-court">{st.change}</span>
            </>
          ) : (
            <span className="block py-6 font-medium text-court">{st.upload}</span>
          )}
        </label>

        {error && <p className="mt-4 rounded-chip bg-bad-soft px-4 py-3 text-bad">{error}</p>}

        <button
          type="button"
          onClick={send}
          disabled={!file || sending || left === 0}
          className="mt-5 w-full rounded-chip bg-ball px-6 py-4 text-base font-semibold text-ink hover:bg-ball-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? st.uploading : st.confirm}
        </button>
      </section>

      <p className="text-sm text-muted">{st.keepLink}</p>
    </div>
  );
}
