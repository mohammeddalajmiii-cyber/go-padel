"use client";

import { useEffect, useState } from "react";

/**
 * Shown when a page fails to load. Asks the server whether the setup is
 * incomplete (missing Vercel settings, database unreachable) and says what to fix.
 */
export function ErrorScreen({ lang, reset }: { lang: "ar" | "en"; reset: () => void }) {
  const [problems, setProblems] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/setup-check", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProblems(Array.isArray(d.problems) ? d.problems : []))
      .catch(() => setProblems([]));
  }, []);

  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-xl px-4 py-16" dir={ar ? "rtl" : "ltr"}>
      {problems && problems.length > 0 ? (
        <div dir="ltr" lang="en" className="rounded-panel border border-warn/30 bg-warn-soft p-6 text-warn">
          <h1 className="text-2xl font-semibold">Setup isn&apos;t finished</h1>
          <p className="mt-2">The site is online, but it needs these fixed before it can load:</p>
          <ul className="mt-4 list-disc space-y-2 ps-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            Settings only reach the site after a new deploy: in Vercel open Deployments, click ⋯ on the top one and choose Redeploy.
            Each setting needs the Production box ticked.
          </p>
        </div>
      ) : (
        <div className="rounded-panel border border-line bg-white p-6 text-ink">
          <h1 className="text-2xl font-semibold">{ar ? "الصفحة مفتحتش" : "This page didn't load"}</h1>
          <p className="mt-2 text-muted">
            {problems === null
              ? ar ? "بنشوف المشكلة…" : "Checking what went wrong…"
              : ar ? "جرب تاني بعد لحظة." : "Try again in a moment."}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-chip bg-court px-5 py-3 font-semibold text-court-line hover:bg-court-deep"
      >
        {ar ? "جرب تاني" : "Try again"}
      </button>
    </div>
  );
}
