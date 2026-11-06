"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fill, num, t, type Lang } from "@/lib/i18n";
import { addDays, coveredSlots, fitsHours, formatDate, formatTime, type Hours } from "@/lib/time";
import { normalizePhone } from "@/lib/phone";

type Slot = { start: number; taken: boolean; past: boolean };
type Duration = 30 | 60;

export function BookingFlow(props: {
  lang: Lang;
  initialDate: string;
  initialStart: number | null;
  first: string;
  days: number;
  hours: Hours;
  prices: Record<Duration, number>;
  deposits: Record<Duration, number>;
}) {
  const { lang, hours, prices, deposits } = props;
  const d = t(lang);
  const b = d.book;
  const router = useRouter();

  const [date, setDate] = useState(props.initialDate);
  const [duration, setDuration] = useState<Duration>(60);
  const [start, setStart] = useState<number | null>(props.initialStart);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "agree" | "form", string>>>({});
  const [sending, setSending] = useState(false);

  const dates = useMemo(() => Array.from({ length: props.days }, (_, i) => addDays(props.first, i)), [props.first, props.days]);

  const load = useCallback(async (day: string) => {
    setSlots(null);
    setLoadError(false);
    try {
      const res = await fetch(`/api/availability?date=${day}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setSlots((await res.json()).slots);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const byStart = useMemo(() => new Map((slots ?? []).map((s) => [s.start, s])), [slots]);
  const canStart = useCallback(
    (s: number, dur: Duration) =>
      fitsHours(hours, s, dur) &&
      coveredSlots(s, dur).every((m) => {
        const x = byStart.get(m);
        return x && !x.taken && !x.past;
      }),
    [byStart, hours],
  );

  // Keep the chosen time valid when the day, length or availability changes.
  useEffect(() => {
    if (!slots || start === null) return;
    if (canStart(start, duration)) return;
    if (duration === 60 && canStart(start, 30)) setDuration(30);
    else setStart(null);
  }, [slots, start, duration, canStart]);

  // Hide past times and starts that would run past closing; booked ones stay visible, crossed out.
  const visible = (slots ?? []).filter((s) => !s.past && fitsHours(hours, s.start, duration));
  const anyFree = visible.some((s) => canStart(s.start, duration));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = b.errors.name;
    if (!normalizePhone(phone)) next.phone = b.errors.phone;
    if (!agree) next.agree = b.errors.agree;
    setErrors(next);
    if (Object.keys(next).length || start === null) return;

    setSending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, start, duration, name, phone, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.code) {
        router.push(`/${lang}/booking/${data.code}`);
        return;
      }
      if (res.status === 409 || data.error === "past") {
        setErrors({ form: b.errors.taken });
        setStart(null);
        load(date);
      } else if (data.message === "phone") setErrors({ phone: b.errors.phone });
      else if (data.message === "name") setErrors({ name: b.errors.name });
      else setErrors({ form: b.errors.generic });
    } catch {
      setErrors({ form: b.errors.generic });
    }
    setSending(false);
  }

  const dayLabel = (day: string, i: number) =>
    i === 0 ? b.today : i === 1 ? b.tomorrow : formatDate(day, lang, { weekday: "short", day: "numeric", month: undefined });

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-10">
      {/* Day */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-dim rtl:text-sm rtl:tracking-normal">{b.day}</h2>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {dates.map((day, i) => {
            const on = day === date;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setDate(day)}
                aria-pressed={on}
                className={`min-w-[5.5rem] shrink-0 rounded-2xl border px-4 py-3 text-start text-sm ${
                  on ? "border-lime bg-lime text-night" : "border-edge hover:border-chalk"
                }`}
              >
                <span className="block font-semibold">{dayLabel(day, i)}</span>
                <span className={`block text-xs ${on ? "text-night/70" : "text-dim"}`}>
                  {formatDate(day, lang, { weekday: undefined, day: "numeric", month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Length */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-dim rtl:text-sm rtl:tracking-normal">{b.length}</h2>
        <div className="mt-3 grid max-w-md grid-cols-2 gap-2" role="radiogroup" aria-label={b.length}>
          {([30, 60] as Duration[]).map((dur) => {
            const on = dur === duration;
            return (
              <button
                key={dur}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDuration(dur)}
                className={`rounded-2xl border px-4 py-3.5 text-start ${
                  on ? "border-lime bg-lime text-night" : "border-edge hover:border-chalk"
                }`}
              >
                <span className="block font-semibold">{dur === 30 ? d.home.min30 : d.home.min60}</span>
                <span className={`block text-sm ${on ? "text-night/70" : "text-dim"}`}>
                  {num(prices[dur], lang)} {d.home.egp}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start time */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-dim rtl:text-sm rtl:tracking-normal">{b.time}</h2>
        {loadError ? (
          <p className="mt-3 text-alert">{b.errors.generic}</p>
        ) : !slots ? (
          <p className="mt-3 text-dim">{b.loading}</p>
        ) : !anyFree ? (
          <p className="mt-3 rounded-2xl bg-raised px-4 py-3">{b.noTimes}</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((s) => {
              const ok = canStart(s.start, duration);
              const on = start === s.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  disabled={!ok}
                  aria-pressed={on}
                  onClick={() => setStart(s.start)}
                  className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-semibold ${
                    on
                      ? "border-lime bg-lime text-night"
                      : ok
                        ? "border-edge hover:border-chalk"
                        : "cursor-not-allowed border-transparent bg-raised text-dim/60 line-through"
                  }`}
                >
                  {formatTime(s.start, lang)}
                  {s.taken && <span className="sr-only"> ({b.taken})</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      </div>

      {/* Details */}
      <form onSubmit={submit} noValidate className="rounded-3xl border border-edge bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-bold">{b.details}</h2>
        <p className="mt-2 text-dim">
          {start === null ? (
            b.pickTime
          ) : (
            <>
              <span className="font-semibold text-chalk">{formatDate(date, lang)}</span>,{" "}
              {fill(b.selected, { start: formatTime(start, lang), end: formatTime(start + duration, lang) })}
              {" · "}
              {num(prices[duration], lang)} {d.home.egp} ({d.home.deposit}: {num(deposits[duration], lang)})
            </>
          )}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <label className="block">
            <span className="text-sm font-medium">{b.name}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={!!errors.name}
              className="mt-1.5 w-full rounded-xl border border-edge bg-night px-3.5 py-3 text-chalk placeholder:text-dim/60 outline-none focus:border-lime"
            />
            {errors.name && <span className="mt-1 block text-sm text-alert">{errors.name}</span>}
          </label>
          <label className="block">
            <span className="text-sm font-medium">{b.phone}</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="010 1234 5678"
              aria-invalid={!!errors.phone}
              className="mt-1.5 w-full rounded-xl border border-edge bg-night px-3.5 py-3 text-chalk placeholder:text-dim/60 text-start outline-none focus:border-lime rtl:text-end"
            />
            <span className={`mt-1 block text-sm ${errors.phone ? "text-alert" : "text-dim"}`}>
              {errors.phone ?? b.phoneHint}
            </span>
          </label>
        </div>

        <label className="mt-5 flex items-start gap-3">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 size-5 shrink-0 accent-lime"
          />
          <span className="leading-relaxed">{b.agree}</span>
        </label>
        {errors.agree && <p className="mt-1 text-sm text-alert">{errors.agree}</p>}

        {errors.form && <p className="mt-5 rounded-xl bg-alert-bg px-4 py-3 text-alert">{errors.form}</p>}

        <button
          type="submit"
          disabled={start === null || sending}
          className="mt-6 w-full rounded-full bg-lime px-6 py-4 text-base font-bold text-night hover:bg-lime-hi disabled:cursor-not-allowed disabled:bg-raised disabled:text-dim"
        >
          {sending ? b.holding : start === null ? b.pickTime : b.continue}
        </button>
      </form>
    </div>
  );
}
