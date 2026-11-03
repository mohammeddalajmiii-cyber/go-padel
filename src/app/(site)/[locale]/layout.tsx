import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../globals.css";
import { FontLinks } from "@/components/FontLinks";
import { LangSwitch } from "@/components/LangSwitch";
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

  return (
    <html lang={locale} dir={d.dir}>
      <head>
        <FontLinks />
        <meta name="theme-color" content="#11307c" />
      </head>
      <body className="min-h-dvh">
        <header className="bg-court-deep text-court-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-semibold tracking-tight" dir="ltr">
              <span aria-hidden className="inline-block size-4 rounded-full bg-ball shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.12)]" />
              Go Padel
            </Link>
            <nav className="flex items-center gap-1">
              <LangSwitch lang={locale} label={d.switchLang} />
              <Link
                href={`/${locale}/book`}
                className="rounded-chip bg-ball px-4 py-2 text-sm font-semibold text-ink hover:bg-ball-deep"
              >
                {d.nav.book}
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted">
            <span dir="ltr">Go Padel</span>
            <span>{d.place}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
