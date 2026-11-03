"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Schedule" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="bg-court-deep text-court-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="inline-block size-3.5 rounded-full bg-ball" />
          Go Padel front desk
        </span>
        <nav className="flex gap-1">
          {LINKS.map((l) => {
            const on = l.href === "/admin" ? path === "/admin" : path?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`rounded-chip px-3 py-1.5 text-sm font-medium ${on ? "bg-white/15" : "text-court-line/80 hover:bg-white/10"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-3 text-sm">
          <Link href="/ar" target="_blank" className="text-court-line/80 hover:underline">
            Open booking site
          </Link>
          <button type="button" onClick={signOut} className="rounded-chip px-3 py-1.5 text-court-line/80 hover:bg-white/10">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
