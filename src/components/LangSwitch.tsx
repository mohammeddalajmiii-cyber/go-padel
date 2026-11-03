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
      className="rounded-chip px-3 py-2 text-sm font-medium text-court-line/90 hover:bg-white/10"
    >
      {label}
    </Link>
  );
}
