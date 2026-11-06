"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Same page in the other language: /ar/book ↔ /en/book */
export function LangSwitch({ lang, label }: { lang: "ar" | "en"; label: string }) {
  const path = usePathname() || `/${lang}`;
  const other = lang === "ar" ? "en" : "ar";
  const href = path.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`);
  return (
    <Link
      href={href}
      lang={other}
      className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-sm font-semibold text-chalk hover:border-chalk"
    >
      {label}
    </Link>
  );
}
