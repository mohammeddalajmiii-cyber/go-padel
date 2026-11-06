"use client";

import { useEffect, useState } from "react";
import { fromClock, toClock } from "@/lib/time";
import { api } from "./types";

type S = {
  open_minute: number;
  close_minute: number;
  price_30: number;
  price_60: number;
  deposit_30: number;
  deposit_60: number;
  hold_minutes: number;
  days_ahead: number;
  instapay_link: string;
  instapay_address: string;
};

export function SettingsForm() {
  const [s, setS] = useState<S | null>(null);
  const [open, setOpen] = useState("15:00");
  const [close, setClose] = useState("01:00");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<S>("/api/admin/settings")
      .then((x) => {
        setS(x);
        setOpen(toClock(x.open_minute));
        setClose(toClock(x.close_minute));
      })
      .catch((e) => setMsg({ ok: false, text: (e as Error).message }));
  }, []);

  if (!s) return <p className="text-muted">{msg?.text ?? "Loading settings…"}</p>;

  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const o = fromClock(open);
    let c = fromClock(close);
    if (o === null || c === null) return setMsg({ ok: false, text: "Enter opening and closing times" });
    if (c <= o) c += 1440; // closing after midnight
    setBusy(true);
    setMsg(null);
    try {
      const saved = await api<S>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ ...s, open_minute: o, close_minute: c }),
      });
      setS(saved);
      setMsg({ ok: true, text: "Settings saved. The booking site uses them right away." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  const field = "mt-1.5 w-full rounded-chip border border-line bg-paper px-3 py-2.5 outline-none focus:border-court";
  const num = (k: keyof S, label: string, hint?: string) => (
    <label className="block text-sm font-medium">
      {label}
      <input type="number" min={0} value={s[k] as number} onChange={set(k)} className={field} />
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );

  return (
    <form onSubmit={save} className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-panel border border-line bg-white p-6">
        <h2 className="font-semibold">InstaPay</h2>
        <p className="mt-1 text-sm text-muted">Customers see these on the payment screen.</p>
        <label className="mt-4 block text-sm font-medium">
          InstaPay payment link
          <input value={s.instapay_link} onChange={set("instapay_link")} placeholder="https://ipn.eg/S/…" dir="ltr" className={field} />
          <span className="mt-1 block text-xs font-normal text-muted">Copy the venue's payment link from the InstaPay app and paste it here.</span>
        </label>
        <label className="mt-4 block text-sm font-medium">
          InstaPay address
          <input value={s.instapay_address} onChange={set("instapay_address")} placeholder="gopadel@instapay" dir="ltr" className={field} />
        </label>
      </section>

      <section className="rounded-panel border border-line bg-white p-6">
        <h2 className="font-semibold">Prices (EGP)</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {num("price_30", "30 minutes")}
          {num("deposit_30", "Deposit for 30 minutes")}
          {num("price_60", "60 minutes")}
          {num("deposit_60", "Deposit for 60 minutes")}
        </div>
        <p className="mt-4 text-sm text-muted">
          Longer bookings (1½, 2, 3 and 4 hours) are priced from these: each hour at the 60-minute price and deposit, plus
          the 30-minute price and deposit for a half hour. For example 1½ hours = 60-minute price + 30-minute price.
        </p>
      </section>

      <section className="rounded-panel border border-line bg-white p-6">
        <h2 className="font-semibold">Hours and booking rules</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Opens
            <input type="time" step={1800} value={open} onChange={(e) => setOpen(e.target.value)} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Closes
            <input type="time" step={1800} value={close} onChange={(e) => setClose(e.target.value)} className={field} />
            <span className="mt-1 block text-xs font-normal text-muted">A closing time earlier than opening means after midnight.</span>
          </label>
          {num("hold_minutes", "Minutes to pay the deposit", "The slot is released if no screenshot arrives in time.")}
          {num("days_ahead", "Days people can book ahead")}
        </div>
      </section>

      {msg && <p className={`rounded-chip px-4 py-3 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}

      <button type="submit" disabled={busy} className="rounded-chip bg-court px-6 py-3 font-semibold text-court-line disabled:opacity-50">
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
