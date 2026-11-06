"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const out = await res.json().catch(() => ({}));
      setError(out.message ?? "Sign-in didn't work. Try again.");
    } catch {
      setError("Can't reach the server. Check the internet connection.");
    }
    setBusy(false);
  }

  return (
    <div className="gp-login grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-panel border border-edge bg-white p-7">
        <Logo size={44} />
        <h1 className="gp-display mt-6 text-3xl">Front desk</h1>
        <label className="mt-6 block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-chip border border-line bg-paper px-3.5 py-3 outline-none focus:border-court"
          />
        </label>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 w-full rounded-full bg-court px-5 py-3.5 font-bold text-court-line hover:bg-court-deep disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
