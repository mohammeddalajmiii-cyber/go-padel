"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

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
    <header className="border-b border-edge bg-night text-chalk">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <span className="flex items-center gap-3">
          <Logo size={36} />
          <span className="rounded-full border border-edge px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-dim">Front desk</span>
        </span>
        <nav className="flex gap-1 rounded-full border border-edge bg-surface p-1">
          {LINKS.map((l) => {
            const on = l.href === "/admin" ? path === "/admin" : path?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-lime text-night" : "text-dim hover:text-chalk"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2 text-sm">
          <Link href="/ar" target="_blank" className="rounded-full px-3 py-2 text-dim hover:text-chalk">
            Open booking site
          </Link>
          <button type="button" onClick={signOut} className="rounded-full border border-edge px-4 py-2 font-semibold hover:border-chalk">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
