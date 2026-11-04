"use client";

import { usePathname } from "next/navigation";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = usePathname()?.startsWith("/en") ? "en" : "ar";
  return <ErrorScreen lang={lang} reset={reset} />;
}
