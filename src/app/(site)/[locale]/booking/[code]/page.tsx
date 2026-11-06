import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingStatus } from "@/components/BookingStatus";
import { isLang, t } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false } };

export default async function BookingPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  if (!isLang(locale) || !/^[\w-]{6,40}$/.test(code)) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 md:px-8 md:pt-14">
      <h1 className="sr-only">{t(locale).status.summary}</h1>
      <BookingStatus lang={locale} code={code} />
    </div>
  );
}
