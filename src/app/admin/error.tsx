"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen lang="en" reset={reset} />;
}
