import Link from "next/link";
import { notFound } from "next/navigation";
import { CourtDrawing } from "@/components/CourtDrawing";
import { availability } from "@/lib/bookings";
import { fill, isLang, num, t } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { addDays, businessNow, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const MAPS = "https://www.google.com/maps/search/?api=1&query=Avenue+Mall+Rehab+City";

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

  return (
    <>
      {/* Hero: the court itself, with what's free today */}
      <section className="bg-court-deep text-court-line">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-14 pt-12 md:grid-cols-[1fr_1.15fr] md:pb-20 md:pt-16">
          <div>
            <h1 className="text-[2.6rem] font-semibold leading-[1.08] tracking-tight md:text-6xl">{h.title}</h1>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-court-line/80">{h.lead}</p>
            <Link
              href={`/${lang}/book`}
              className="mt-8 inline-flex items-center rounded-chip bg-ball px-6 py-3.5 text-base font-semibold text-ink hover:bg-ball-deep"
            >
              {h.cta}
            </Link>
          </div>

          <div>
            <CourtDrawing className="w-full" />
            <h2 className="mt-6 text-sm font-medium text-court-line/70">{h.nextFree}</h2>
            {free.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {free.map((x) => (
                  <li key={x.start}>
                    <Link
                      href={`/${lang}/book?date=${today}&start=${x.start}`}
                      className="block rounded-chip border border-court-line/25 bg-court/70 px-3.5 py-2 text-sm font-medium backdrop-blur hover:border-ball hover:text-ball"
                    >
                      {formatTime(x.start, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-court-line/80">
                <Link href={`/${lang}/book?date=${addDays(today, 1)}`} className="underline underline-offset-4">
                  {h.noneToday}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-14 px-4 pt-14 md:grid-cols-[1fr_1.2fr] md:gap-20">
        {/* Prices */}
        <section>
          <h2 className="text-2xl font-semibold">{h.pricesTitle}</h2>
          <p className="mt-2 text-muted">
            {fill(h.hours, { open: formatTime(s.open_minute, lang), close: formatTime(s.close_minute, lang) })}
          </p>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {[
              { label: h.min30, price: s.price_30, deposit: s.deposit_30 },
              { label: h.min60, price: s.price_60, deposit: s.deposit_60 },
            ].map((p) => (
              <div key={p.label} className="flex items-baseline justify-between gap-4 py-4">
                <dt className="font-medium">{p.label}</dt>
                <dd className="text-end">
                  <span className="text-2xl font-semibold">{num(p.price, lang)}</span>{" "}
                  <span className="text-muted">{h.egp}</span>
                  <span className="block text-sm text-muted">
                    {h.deposit}: {num(p.deposit, lang)} {h.egp}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* How booking works: a real sequence, so it's numbered */}
        <section>
          <h2 className="text-2xl font-semibold">{h.howTitle}</h2>
          <ol className="mt-6 space-y-6">
            {h.steps.map((step, i) => (
              <li key={step.t} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-court text-sm font-semibold text-court-line">
                  {num(i + 1, lang)}
                </span>
                <div>
                  <h3 className="font-semibold">{step.t}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{fill(step.d, { hold })}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">{h.rulesTitle}</h2>
          <ul className="mt-5 space-y-3">
            {h.rules.map((r) => (
              <li key={r} className="flex gap-3 leading-relaxed">
                <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-court" />
                {fill(r, { hold })}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">{h.findTitle}</h2>
          <p className="mt-3 leading-relaxed">{h.findText}</p>
          <a
            href={MAPS}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-medium text-court underline underline-offset-4"
          >
            {h.map}
          </a>
        </section>
      </div>
    </>
  );
}
