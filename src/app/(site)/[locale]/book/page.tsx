import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { bookableRange } from "@/lib/bookings";
import { isLang, t } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { isDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: t(isLang(locale) ? locale : "ar").book.title };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  const sp = await searchParams;
  const s = await getSettings();
  const range = bookableRange(s);

  const wantDate = typeof sp.date === "string" && isDate(sp.date) ? sp.date : range.first;
  const date = wantDate >= range.first && wantDate <= range.last ? wantDate : range.first;
  const start = typeof sp.start === "string" && /^\d+$/.test(sp.start) ? Number(sp.start) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 md:px-8 md:pt-14">
      <h1 className="gp-display text-5xl md:text-6xl">{t(locale).book.title}</h1>
      <BookingFlow
        lang={locale}
        initialDate={date}
        initialStart={start}
        first={range.first}
        days={s.days_ahead}
        hours={{ open_minute: s.open_minute, close_minute: s.close_minute }}
        prices={{ price_30: s.price_30, price_60: s.price_60, deposit_30: s.deposit_30, deposit_60: s.deposit_60 }}
      />
    </div>
  );
}
