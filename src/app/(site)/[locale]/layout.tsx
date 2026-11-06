import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../globals.css";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { SiteFontLinks } from "@/components/SiteFontLinks";
import { Icon } from "@/components/Icon";
import { getSettings } from "@/lib/settings";
import { formatTime } from "@/lib/time";
import { LANGS, isLang, t } from "@/lib/i18n";

export function generateStaticParams() {
  return LANGS.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lang = isLang(locale) ? locale : "ar";
  return {
    title: { default: `Go Padel · ${t(lang).place}`, template: "%s · Go Padel" },
    description: t(lang).home.lead,
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  const d = t(locale);
  const e = d.extra;
  // Opening hours for the footer; if the database is unreachable the page's own error screen explains why.
  const s = await getSettings().catch(() => null);
  const hours = s ? `${formatTime(s.open_minute, locale)} – ${formatTime(s.close_minute, locale)}` : null;

  return (
    <html lang={locale} dir={d.dir}>
      <head>
        <SiteFontLinks />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="gp-site min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-night/70 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
            <Link href={`/${locale}`} aria-label="Go Padel">
              <Logo size={40} />
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link href={`/${locale}#prices`} className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-chalk/75 transition-colors hover:text-chalk md:inline-flex">
                {d.home.pricesTitle}
              </Link>
              <Link href={`/${locale}#faq`} className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-chalk/75 transition-colors hover:text-chalk md:inline-flex">
                {e.eyebrow.faq}
              </Link>
              <Link href={`/${locale}#find`} className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-chalk/75 transition-colors hover:text-chalk lg:inline-flex">
                {e.eyebrow.find}
              </Link>
              <LangSwitch lang={locale} label={d.switchLang} />
              <Link
                href={`/${locale}/book`}
                className="inline-flex min-h-11 items-center rounded-full bg-lime px-5 text-sm font-bold text-night transition-colors hover:bg-lime-hi"
              >
                {d.nav.book}
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-28 border-t border-edge bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo size={40} />
              <p className="mt-5 max-w-xs leading-relaxed text-dim">{e.footerAbout}</p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-chalk/60 rtl:tracking-normal">{e.footerVisit}</h2>
              <p className="mt-4 flex gap-2 leading-relaxed text-dim">
                <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-lime" />
                {d.home.findText}
              </p>
              <a href="https://www.google.com/maps/search/?api=1&query=Avenue+Mall+Rehab+City" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lime hover:text-lime-hi">
                {e.directions}
                <Icon name="arrow" size={15} className="rtl:rotate-180" />
              </a>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-chalk/60 rtl:tracking-normal">{e.footerHours}</h2>
              <p className="mt-4 flex gap-2 leading-relaxed text-dim">
                <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-lime" />
                <span>
                  {e.daily}
                  {hours && (
                    <>
                      <br />
                      <span className="font-semibold text-chalk">{hours}</span>
                    </>
                  )}
                </span>
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-chalk/60 rtl:tracking-normal">{e.footerBook}</h2>
              <ul className="mt-4 space-y-2.5 text-dim">
                <li>
                  <Link href={`/${locale}/book`} className="transition-colors hover:text-chalk">{d.nav.book}</Link>
                </li>
                <li>
                  <Link href={`/${locale}#prices`} className="transition-colors hover:text-chalk">{d.home.pricesTitle}</Link>
                </li>
                <li>
                  <Link href={`/${locale}#faq`} className="transition-colors hover:text-chalk">{e.faqTitle}</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-edge">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-dim md:px-8">
              <span>
                © {new Date().getFullYear()} Go Padel · {e.rights}
              </span>
              <span>{d.place}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
