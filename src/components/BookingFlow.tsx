"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { durationLabel, fill, num, t, type Lang } from "@/lib/i18n";
import { addDays, coveredSlots, fitsHours, formatDate, formatTime, type Hours } from "@/lib/time";
import { normalizePhone } from "@/lib/phone";
import { DURATIONS, DURATION_STEP, MAX_DURATION, MIN_DURATION, priceFor, type PriceTable } from "@/lib/pricing";
import { Icon, type IconName } from "./Icon";

type Slot = { start: number; taken: boolean; past: boolean };
type Duration = number;

export function BookingFlow(props: {
  lang: Lang;
  initialDate: string;
  initialStart: number | null;
  first: string;
  days: number;
  hours: Hours;
  prices: PriceTable;
  holdMinutes: number;
}) {
  const { lang, hours, prices } = props;
  const cost = (dur: Duration) => priceFor(prices, dur);
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
    // Fall back to the longest shorter length that still fits at this time.
    const shorter = [...DURATIONS].reverse().find((x) => x < duration && canStart(start, x));
    if (shorter) setDuration(shorter);
    else setStart(null);
  }, [slots, start, duration, canStart]);

  // Hide past times and starts that would run past closing; booked ones stay visible, crossed out.
  const visible = (slots ?? []).filter((s) => !s.past && fitsHours(hours, s.start, duration));
  const anyFree = visible.some((s) => canStart(s.start, duration));

  // − / + : half an hour at a time, 30 minutes to 8 hours. If the longer game no longer
  // fits at the chosen time, the time is cleared so they pick again.
  // With a time picked, + stops when the next half hour is booked or past closing.
  const canGrow =
    duration < MAX_DURATION && (start === null || !slots || canStart(start, duration + DURATION_STEP));

  function changeLength(delta: number) {
    const next = Math.min(MAX_DURATION, Math.max(MIN_DURATION, duration + delta));
    setDuration(next);
    if (start !== null && slots && !canStart(start, next)) setStart(null);
  }

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

  const e = d.extra;
  const dayLabel = (day: string, i: number) =>
    i === 0 ? b.today : i === 1 ? b.tomorrow : formatDate(day, lang, { weekday: "short", day: undefined, month: undefined });

  // Start times grouped the way people think about the evening.
  type Group = { key: string; label: string; icon: IconName; slots: Slot[] };
  const allGroups: Group[] = [
    { key: "a", label: e.groups.afternoon, icon: "sun", slots: visible.filter((x) => x.start < 18 * 60) },
    { key: "e", label: e.groups.evening, icon: "sunset", slots: visible.filter((x) => x.start >= 18 * 60 && x.start < 22 * 60) },
    { key: "l", label: e.groups.late, icon: "moon", slots: visible.filter((x) => x.start >= 22 * 60) },
  ];
  const groups = allGroups.filter((g) => g.slots.length);

  const price = cost(duration);
  const label = "text-xs font-bold uppercase tracking-[0.14em] text-dim rtl:text-sm rtl:tracking-normal";
  const panel = "rounded-3xl border border-edge bg-surface p-5 sm:p-7";

  return (
    <div className="mt-10 grid items-start gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:pb-0">
      <div className="min-w-0 space-y-6">
        {/* Day */}
        <section className={panel}>
          <h2 className={label}>{b.day}</h2>
          <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-7 sm:px-7">
            {dates.map((day, i) => {
              const on = day === date;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDate(day)}
                  aria-pressed={on}
                  className={`flex min-w-[5.25rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-3 transition-colors ${
                    on ? "border-lime bg-lime text-night" : "border-edge hover:border-chalk/60"
                  }`}
                >
                  <span className={`text-xs font-semibold ${on ? "text-night/70" : "text-dim"}`}>{dayLabel(day, i)}</span>
                  <span className="gp-figure mt-1 text-2xl leading-none">{formatDate(day, lang, { weekday: undefined, day: "numeric", month: undefined })}</span>
                  <span className={`mt-1 text-xs ${on ? "text-night/70" : "text-dim"}`}>{formatDate(day, lang, { weekday: undefined, day: undefined, month: "short" })}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Length */}
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className={label}>{b.length}</h2>
            <span className="text-sm text-dim">
              {num(cost(30).total, lang)} {d.home.egp} {e.perHalf}
            </span>
          </div>
          <div className="mt-4 flex max-w-md items-center gap-2 rounded-2xl border border-edge bg-night p-2">
            <button
              type="button"
              onClick={() => changeLength(-DURATION_STEP)}
              disabled={duration <= MIN_DURATION}
              aria-label={b.shorter}
              className="grid size-14 shrink-0 place-items-center rounded-xl bg-raised transition-colors hover:bg-edge disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                <path d="M5 12h14" />
              </svg>
            </button>
            <div className="min-w-0 flex-1 text-center" aria-live="polite">
              <span className="block text-xl font-bold">{durationLabel(duration, lang)}</span>
              <span className="block text-sm text-dim">
                {num(price.total, lang)} {d.home.egp}
              </span>
            </div>
            <button
              type="button"
              onClick={() => changeLength(DURATION_STEP)}
              disabled={!canGrow}
              aria-label={b.longer}
              className="grid size-14 shrink-0 place-items-center rounded-xl bg-lime text-night transition-colors hover:bg-lime-hi disabled:cursor-not-allowed disabled:bg-raised disabled:text-dim disabled:opacity-35"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                <path d="M5 12h14M12 5v14" />
              </svg>
            </button>
          </div>
        </section>

        {/* Start time */}
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className={label}>{b.time}</h2>
            <div className="flex items-center gap-4 text-xs text-dim">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded border border-edge" />
                {e.free}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded bg-lime" />
                {e.selected}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded bg-raised" />
                {b.taken}
              </span>
            </div>
          </div>
          {loadError ? (
            <p className="mt-4 rounded-2xl bg-alert-bg px-4 py-3 text-alert">{b.errors.generic}</p>
          ) : !slots ? (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label={b.loading}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className="h-12 animate-pulse rounded-xl bg-raised" />
              ))}
            </div>
          ) : !anyFree ? (
            <p className="mt-4 flex items-start gap-3 rounded-2xl bg-raised px-4 py-3.5">
              <Icon name="info" size={20} className="mt-0.5 shrink-0 text-lime" />
              {b.noTimes}
            </p>
          ) : (
            <div className="mt-5 space-y-6">
              {groups.map((g) => (
                <div key={g.key}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-chalk/80">
                    <Icon name={g.icon} size={17} className="text-lime" />
                    {g.label}
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                    {g.slots.map((x) => {
                      const ok = canStart(x.start, duration);
                      const on = start === x.start;
                      return (
                        <button
                          key={x.start}
                          type="button"
                          disabled={!ok}
                          aria-pressed={on}
                          onClick={() => setStart(x.start)}
                          className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
                            on
                              ? "border-lime bg-lime text-night shadow-[0_0_0_4px_rgba(200,240,49,0.15)]"
                              : ok
                                ? "border-edge hover:border-chalk/70 hover:bg-raised/40"
                                : "cursor-not-allowed border-transparent bg-raised text-dim/50 line-through"
                          }`}
                        >
                          {formatTime(x.start, lang)}
                          {x.taken && <span className="sr-only"> ({b.taken})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Summary and details: stays in view on large screens */}
      <form id="details" onSubmit={submit} noValidate className="scroll-mt-24 overflow-hidden rounded-3xl border border-edge bg-surface lg:sticky lg:top-24">
        <div className="border-b border-edge bg-raised/40 p-5 sm:p-7">
          <h2 className={label}>{e.summary}</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-dim">
                <Icon name="calendar" size={17} />
                {e.day}
              </dt>
              <dd className="text-end font-semibold">{formatDate(date, lang)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-dim">
                <Icon name="clock" size={17} />
                {e.time}
              </dt>
              <dd className="text-end font-semibold">
                {start === null ? <span className="text-dim">—</span> : fill(b.selected, { start: formatTime(start, lang), end: formatTime(start + duration, lang) })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-dim">
                <Icon name="hourglass" size={17} />
                {e.length}
              </dt>
              <dd className="text-end font-semibold">{durationLabel(duration, lang)}</dd>
            </div>
          </dl>
          {start === null ? (
            <p className="mt-5 rounded-2xl border border-dashed border-edge px-4 py-3 text-sm text-dim">{e.pickToSee}</p>
          ) : (
            <div className="mt-5 space-y-2 border-t border-edge pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-dim">{e.total}</span>
                <span>
                  <span className="gp-figure text-3xl">{num(price.total, lang)}</span> <span className="text-dim">{d.home.egp}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-lime px-3.5 py-2.5 text-night">
                <span className="font-semibold">{e.depositNow}</span>
                <span className="gp-figure text-lg">
                  {num(price.deposit, lang)} {d.home.egp}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-dim">
                <span>{e.atCounter}</span>
                <span>
                  {num(price.total - price.deposit, lang)} {d.home.egp}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <h2 className="text-lg font-bold">{b.details}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="text-sm font-semibold">{b.name}</span>
              <input
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                autoComplete="name"
                aria-invalid={!!errors.name}
                className="mt-1.5 w-full rounded-xl border border-edge bg-night px-3.5 py-3 text-chalk outline-none transition-colors placeholder:text-dim/60 focus:border-lime"
              />
              {errors.name && <span className="mt-1 block text-sm text-alert">{errors.name}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold">{b.phone}</span>
              <input
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="010 1234 5678"
                aria-invalid={!!errors.phone}
                className="mt-1.5 w-full rounded-xl border border-edge bg-night px-3.5 py-3 text-start text-chalk outline-none transition-colors placeholder:text-dim/60 focus:border-lime rtl:text-end"
              />
              <span className={`mt-1 block text-sm ${errors.phone ? "text-alert" : "text-dim"}`}>{errors.phone ?? b.phoneHint}</span>
            </label>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-edge p-4 transition-colors hover:border-chalk/40">
            <input type="checkbox" checked={agree} onChange={(ev) => setAgree(ev.target.checked)} className="mt-0.5 size-5 shrink-0 accent-lime" />
            <span className="text-sm leading-relaxed">{b.agree}</span>
          </label>
          {errors.agree && <p className="mt-1 text-sm text-alert">{errors.agree}</p>}

          {errors.form && <p className="mt-5 rounded-xl bg-alert-bg px-4 py-3 text-alert">{errors.form}</p>}

          <button
            type="submit"
            disabled={start === null || sending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-base font-bold text-night transition-colors hover:bg-lime-hi disabled:cursor-not-allowed disabled:bg-raised disabled:text-dim"
          >
            {sending ? b.holding : start === null ? b.pickTime : b.continue}
            {start !== null && !sending && <Icon name="arrow" size={18} strokeWidth={2.4} className="rtl:rotate-180" />}
          </button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-dim">
            <Icon name="shield" size={16} className="mt-px shrink-0 text-lime" />
            {fill(e.secure, { hold: num(props.holdMinutes, lang) })}
          </p>
        </div>
      </form>

      {/* Phones: the choice and the total stay at the bottom of the screen */}
      {start !== null && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block truncate font-semibold">
                {fill(b.selected, { start: formatTime(start, lang), end: formatTime(start + duration, lang) })}
              </span>
              <span className="block truncate text-sm text-dim">
                {durationLabel(duration, lang)} · {num(price.total, lang)} {d.home.egp}
              </span>
            </div>
            <a href="#details" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-lime px-6 font-bold text-night">
              {b.continue}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
