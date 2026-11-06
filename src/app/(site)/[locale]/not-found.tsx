"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { t } from "@/lib/i18n";

export default function NotFound() {
  const lang = usePathname()?.startsWith("/en") ? "en" : "ar";
  const e = t(lang).extra;
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
      <span className="gp-figure text-8xl text-lime/20">404</span>
      <h1 className="gp-display mt-4 text-4xl md:text-5xl">{e.notFoundTitle}</h1>
      <p className="mt-4 max-w-md text-lg text-dim">{e.notFoundText}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${lang}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-edge px-6 font-semibold transition-colors hover:border-chalk">
          {e.home}
        </Link>
        <Link href={`/${lang}/book`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lime px-6 font-bold text-night transition-colors hover:bg-lime-hi">
          {t(lang).nav.book}
          <Icon name="arrow" size={18} strokeWidth={2.4} className="rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
}
