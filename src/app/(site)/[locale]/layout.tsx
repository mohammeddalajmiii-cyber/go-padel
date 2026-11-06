import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../globals.css";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { SiteFontLinks } from "@/components/SiteFontLinks";
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
        <SiteFontLinks />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="gp-site min-h-dvh">
        <header className="relative z-20 border-b border-white/10">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
            <Link href={`/${locale}`} aria-label="Go Padel">
              <Logo size={40} />
            </Link>
            <nav className="flex items-center gap-2">
              <LangSwitch lang={locale} label={d.switchLang} />
              <Link
                href={`/${locale}/book`}
                className="inline-flex min-h-11 items-center rounded-full bg-lime px-5 text-sm font-bold text-night hover:bg-lime-hi"
              >
                {d.nav.book}
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t border-edge">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-dim md:px-8">
            <Logo size={32} />
            <span>
              {d.place} · © {new Date().getFullYear()} Go Padel
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
