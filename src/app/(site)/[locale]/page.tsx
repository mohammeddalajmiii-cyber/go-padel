import Link from "next/link";
import { CourtDrawing } from "@/components/CourtDrawing";
import { notFound } from "next/navigation";
import { availability } from "@/lib/bookings";
import { durationLabel, fill, isLang, num, t } from "@/lib/i18n";
import { priceFor } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { addDays, businessNow, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const MAPS = "https://www.google.com/maps/search/?api=1&query=Avenue+Mall+Rehab+City";

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:rotate-180">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  const lang = locale;
  const d = t(lang);
  const h = d.home;

  const s = await getSettings();
  const today = businessNow(s).date;
  const { slots } = await availability(today);
  const free = slots.filter((x) => !x.taken && !x.past).slice(0, 6);
  const hold = num(s.hold_minutes, lang);

  // "One court. Open until 1 AM." → first sentence in white, the rest in lime.
  const cut = h.title.indexOf(". ");
  const titleA = cut > 0 ? h.title.slice(0, cut + 1) : h.title;
  const titleB = cut > 0 ? h.title.slice(cut + 2) : "";

  const prices = [
    { label: h.min30, price: s.price_30, deposit: s.deposit_30, featured: false },
    { label: h.min60, price: s.price_60, deposit: s.deposit_60, featured: true },
  ];

  return (
    <>
      {/* Hero: the court photo behind the headline, with what's free today */}
      <section className="gp-hero -mt-16 pt-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-24 md:min-h-[640px] md:grid-cols-[1.25fr_1fr] md:items-end md:px-8 md:pb-24 md:pt-32">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-sm text-chalk/85">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c8f031" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              {d.place}
            </p>
            <h1 className="gp-display mt-6 text-5xl md:text-7xl">
              {titleA}
              {titleB && (
                <>
                  <br />
                  <span className="text-lime">{titleB}</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-chalk/80">{h.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${lang}/book`}
                className="inline-flex items-center gap-2.5 rounded-full bg-lime px-7 py-4 text-base font-bold text-night hover:bg-lime-hi"
              >
                {h.cta}
                <Arrow />
              </Link>
              <a
                href="#prices"
                className="inline-flex items-center rounded-full border border-white/20 bg-black/20 px-6 py-4 text-base font-semibold hover:border-chalk"
              >
                {h.pricesTitle}
              </a>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-night/75 p-5 backdrop-blur md:justify-self-end">
            {/* The court from above */}
            <CourtDrawing className="w-full" />
            <h2 className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-chalk/70 rtl:tracking-normal">{h.nextFree}</h2>
            {free.length ? (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {free.map((x) => (
                  <li key={x.start}>
                    <Link
                      href={`/${lang}/book?date=${today}&start=${x.start}`}
                      className="flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-2 text-sm font-semibold hover:border-lime hover:text-lime"
                    >
                      {formatTime(x.start, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-chalk/85">
                <Link href={`/${lang}/book?date=${addDays(today, 1)}`} className="underline underline-offset-4 hover:text-lime">
                  {h.noneToday}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-4 pt-12 md:px-8">
        {/* Prices */}
        <section id="prices" className="scroll-mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="gp-display text-4xl md:text-5xl">{h.pricesTitle}</h2>
            <p className="text-dim">
              {fill(h.hours, { open: formatTime(s.open_minute, lang), close: formatTime(s.close_minute, lang) })}
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {prices.map((p) => (
              <div
                key={p.label}
                className={`flex flex-col gap-4 rounded-3xl p-7 ${p.featured ? "bg-lime text-night" : "border border-edge bg-surface"}`}
              >
                <span className={`text-sm font-bold uppercase tracking-[0.14em] rtl:tracking-normal ${p.featured ? "text-night/70" : "text-dim"}`}>
                  {p.label}
                </span>
                <span className="gp-figure text-5xl">
                  {num(p.price, lang)} <span className="text-lg font-semibold">{h.egp}</span>
                </span>
                <span className={p.featured ? "text-night/75" : "text-dim"}>
                  {h.deposit}: {num(p.deposit, lang)} {h.egp}
                </span>
              </div>
            ))}

            {/* 1½ to 4 hours, priced from the hourly and half-hour rates */}
            <div className="flex flex-col gap-4 rounded-3xl border border-edge bg-surface p-7">
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-dim rtl:tracking-normal">{h.longerTitle}</span>
              <dl className="divide-y divide-edge">
                {[90, 120, 240, 480].map((m) => (
                  <div key={m} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="font-semibold">{durationLabel(m, lang)}</dt>
                    <dd className="gp-figure text-xl">
                      {num(priceFor(s, m).total, lang)} <span className="text-sm font-semibold text-dim">{h.egp}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <span className="text-sm text-dim">{h.longerText}</span>
            </div>
          </div>
        </section>

        {/* How booking works: a real sequence, so it's numbered */}
        <section>
          <h2 className="gp-display text-4xl md:text-5xl">{h.howTitle}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {h.steps.map((step, i) => (
              <li key={step.t} className="flex flex-col gap-3 rounded-3xl border border-edge bg-surface p-6">
                <span className="gp-figure text-5xl leading-none text-lime">{lang === "ar" ? num(i + 1, lang) : `0${i + 1}`}</span>
                <h3 className="mt-2 text-lg font-bold">{step.t}</h3>
                <p className="leading-relaxed text-dim">{fill(step.d, { hold })}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Rules */}
          <section className="rounded-3xl border border-edge bg-surface p-7">
            <h2 className="gp-display text-3xl md:text-4xl">{h.rulesTitle}</h2>
            <ul className="mt-6 space-y-4">
              {h.rules.map((r) => (
                <li key={r} className="flex gap-3 leading-relaxed">
                  <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-lime" />
                  {fill(r, { hold })}
                </li>
              ))}
            </ul>
          </section>

          {/* Find us */}
          <section className="overflow-hidden rounded-3xl border border-edge bg-surface">
            <div className="gp-photo h-40" aria-hidden />
            <div className="p-7">
              <h2 className="gp-display text-3xl md:text-4xl">{h.findTitle}</h2>
              <p className="mt-3 leading-relaxed text-chalk/85">{h.findText}</p>
              <a
                href={MAPS}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 items-center rounded-full border border-edge px-6 font-semibold hover:border-chalk"
              >
                {h.map}
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
