import Link from "next/link";
import { CourtDrawing } from "@/components/CourtDrawing";
import { notFound } from "next/navigation";
import { availability } from "@/lib/bookings";
import { durationLabel, fill, isLang, num, t } from "@/lib/i18n";
import { priceFor } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { addDays, businessNow, formatTime } from "@/lib/time";
import { Icon, type IconName } from "@/components/Icon";

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

  const e = d.extra;
  const hours = `${formatTime(s.open_minute, lang)} – ${formatTime(s.close_minute, lang)}`;
  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: "clock", label: e.facts.open, value: hours },
    { icon: "calendar", label: e.facts.ahead, value: fill(e.facts.aheadValue, { days: num(s.days_ahead, lang) }) },
    { icon: "hourglass", label: e.facts.hold, value: fill(e.facts.holdValue, { hold }) },
    { icon: "wallet", label: e.facts.from, value: `${fill(e.facts.fromValue, { price: num(s.price_30, lang) })} · ${durationLabel(30, lang)}` },
  ];
  const steps: IconName[] = ["calendar", "wallet", "checkCircle", "ball"];
  const ruleIcons: IconName[] = ["info", "shield", "hourglass"];
  const lengths = [30, 60, 90, 120, 240, 480];

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

          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-night/75 p-3 backdrop-blur md:justify-self-end">
            {/* The court from above */}
            <CourtDrawing className="block w-full rounded-2xl" />
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

      {/* Key facts, overlapping the bottom of the hero */}
      <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-4 md:-mt-10 md:px-8" aria-label={d.place}>
        <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-edge bg-surface/95 backdrop-blur lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} className={`flex items-start gap-3 p-5 md:p-6 ${i % 2 ? "border-s border-edge" : ""} ${i > 1 ? "border-t border-edge lg:border-t-0" : ""} ${i === 2 ? "lg:border-s" : ""}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime/10 text-lime ring-1 ring-lime/25">
                <Icon name={f.icon} size={19} />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-dim rtl:tracking-normal">{f.label}</dt>
                <dd className="mt-1 font-semibold leading-snug">{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto max-w-6xl space-y-28 px-4 pt-24 md:px-8">
        {/* How booking works */}
        <section>
          <Eyebrow>{e.eyebrow.how}</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h2 className="gp-display max-w-xl text-4xl md:text-5xl">{h.howTitle}</h2>
            <p className="max-w-sm text-dim">{e.howLead}</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {h.steps.map((step, i) => (
              <li key={step.t} className="group relative flex flex-col rounded-3xl border border-edge bg-surface p-6 transition-colors hover:border-lime/40">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-raised text-lime ring-1 ring-edge transition-colors group-hover:ring-lime/40">
                    <Icon name={steps[i]} size={22} />
                  </span>
                  <span className="gp-figure text-4xl leading-none text-chalk/10">{lang === "ar" ? num(i + 1, lang) : `0${i + 1}`}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold">{step.t}</h3>
                <p className="mt-2 leading-relaxed text-dim">{fill(step.d, { hold })}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Prices */}
        <section id="prices" className="scroll-mt-24 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div>
            <Eyebrow>{e.eyebrow.prices}</Eyebrow>
            <h2 className="gp-display mt-4 text-4xl md:text-5xl">{h.pricesTitle}</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-dim">{e.pricesLead}</p>
            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl bg-lime p-5 text-night">
                <span className="text-sm font-semibold text-night/70">{durationLabel(30, lang)}</span>
                <span className="gp-figure mt-1 block text-4xl">{num(s.price_30, lang)}</span>
                <span className="text-sm font-semibold text-night/70">{h.egp}</span>
              </div>
              <div className="rounded-2xl border border-edge bg-surface p-5">
                <span className="text-sm font-semibold text-dim">{durationLabel(60, lang)}</span>
                <span className="gp-figure mt-1 block text-4xl">{num(s.price_60, lang)}</span>
                <span className="text-sm font-semibold text-dim">{h.egp}</span>
              </div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-dim">
              <Icon name="clock" size={16} className="text-lime" />
              {fill(h.hours, { open: formatTime(s.open_minute, lang), close: formatTime(s.close_minute, lang) })}
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-edge bg-surface">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-edge text-xs uppercase tracking-[0.12em] text-dim rtl:tracking-normal">
                  <th scope="col" className="px-6 py-4 text-start font-semibold">{e.length}</th>
                  <th scope="col" className="px-6 py-4 text-end font-semibold">{e.total}</th>
                  <th scope="col" className="px-6 py-4 text-end font-semibold">{h.deposit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {lengths.map((m) => {
                  const p = priceFor(s, m);
                  return (
                    <tr key={m} className="transition-colors hover:bg-raised/60">
                      <th scope="row" className="px-6 py-4 text-start font-semibold">{durationLabel(m, lang)}</th>
                      <td className="px-6 py-4 text-end">
                        <span className="gp-figure text-xl">{num(p.total, lang)}</span> <span className="text-sm text-dim">{h.egp}</span>
                      </td>
                      <td className="px-6 py-4 text-end text-dim">
                        {num(p.deposit, lang)} {h.egp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-4 border-t border-edge bg-raised/50 px-6 py-4">
              <p className="text-sm text-dim">{h.longerText}</p>
              <Link href={`/${lang}/book`} className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-lime hover:text-lime-hi">
                {h.cta}
                <Arrow />
              </Link>
            </div>
          </div>
        </section>

        {/* Good to know */}
        <section>
          <Eyebrow>{e.eyebrow.rules}</Eyebrow>
          <h2 className="gp-display mt-4 text-4xl md:text-5xl">{h.rulesTitle}</h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {h.rules.map((r, i) => (
              <li key={r} className="flex gap-4 rounded-3xl border border-edge bg-surface p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-lime ring-1 ring-edge">
                  <Icon name={ruleIcons[i % ruleIcons.length]} size={19} />
                </span>
                <span className="pt-1.5 leading-relaxed">{fill(r, { hold })}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Questions */}
        <section id="faq" className="scroll-mt-24 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>{e.eyebrow.faq}</Eyebrow>
            <h2 className="gp-display mt-4 text-4xl md:text-5xl">{e.faqTitle}</h2>
          </div>
          <div className="divide-y divide-edge overflow-hidden rounded-3xl border border-edge bg-surface">
            {e.faq.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold transition-colors hover:bg-raised/50 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-lime transition-transform group-open:rotate-45">
                    <Icon name="plus" size={16} strokeWidth={2.2} />
                  </span>
                </summary>
                <p className="px-6 pb-6 leading-relaxed text-dim">{fill(f.a, { hold })}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Find us */}
        <section id="find" className="scroll-mt-24 grid overflow-hidden rounded-3xl border border-edge bg-surface lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col p-7 md:p-10">
            <Eyebrow>{e.eyebrow.find}</Eyebrow>
            <h2 className="gp-display mt-4 text-4xl md:text-5xl">{h.findTitle}</h2>
            <dl className="mt-8 space-y-5">
              <div className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-lime ring-1 ring-edge">
                  <Icon name="pin" size={19} />
                </span>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-dim rtl:tracking-normal">{e.footerVisit}</dt>
                  <dd className="mt-1 font-semibold">{h.findText}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-lime ring-1 ring-edge">
                  <Icon name="clock" size={19} />
                </span>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-dim rtl:tracking-normal">{e.footerHours}</dt>
                  <dd className="mt-1 font-semibold">
                    {e.daily} · {hours}
                  </dd>
                </div>
              </div>
            </dl>
            <a
              href={MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-12 items-center gap-2 self-start rounded-full border border-edge px-6 font-semibold transition-colors hover:border-chalk"
            >
              <Icon name="map" size={18} />
              {e.directions}
            </a>
          </div>
          <div className="relative min-h-72 border-t border-edge lg:border-s lg:border-t-0">
            <iframe
              title={h.findText}
              src="https://www.google.com/maps?q=Avenue+Mall+Rehab+City&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 size-full border-0 [filter:grayscale(1)_invert(0.9)_contrast(0.9)_brightness(0.95)]"
            />
          </div>
        </section>

        {/* Closing call to book */}
        <section className="relative overflow-hidden rounded-3xl border border-edge">
          <div className="gp-photo absolute inset-0" aria-hidden />
          <div className="absolute inset-0 bg-linear-to-r from-night via-night/85 to-night/40 rtl:bg-linear-to-l" aria-hidden />
          <div className="relative flex flex-col items-start gap-6 p-8 md:p-14">
            <h2 className="gp-display max-w-2xl text-4xl md:text-6xl">{e.ctaTitle}</h2>
            <p className="max-w-md text-lg text-chalk/80">{e.ctaText}</p>
            <Link href={`/${lang}/book`} className="inline-flex items-center gap-2.5 rounded-full bg-lime px-7 py-4 text-base font-bold text-night transition-colors hover:bg-lime-hi">
              {h.cta}
              <Arrow />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-lime rtl:text-sm rtl:tracking-normal">
      <span aria-hidden className="h-px w-8 bg-lime/60" />
      {children}
    </p>
  );
}
