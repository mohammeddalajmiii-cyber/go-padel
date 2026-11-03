"use client";

import { useCallback, useEffect, useState } from "react";
import { addDays, cairoNow, formatDate } from "@/lib/time";
import { api, egp } from "./types";

type Day = {
  date: string;
  bookings: number;
  hours: number;
  deposits: number;
  counter_cash: number;
  counter_instapay: number;
  no_shows: number;
  released: number;
};

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

export function Reports() {
  const today = cairoNow().date;
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDays((await api<{ days: Day[] }>(`/api/admin/report?from=${from}&to=${to}`)).days);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const sum = (k: keyof Day) => (days ?? []).reduce((s, d) => s + Number(d[k]), 0);
  const instapay = sum("deposits") + sum("counter_instapay");
  const cash = sum("counter_cash");

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="me-auto text-2xl font-semibold">Reports</h1>
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => {
              setFrom(addDays(today, -(p.days - 1)));
              setTo(today);
            }}
            className="rounded-chip border border-line bg-white px-3 py-2 text-sm font-medium"
          >
            {p.label}
          </button>
        ))}
        <label className="text-sm">
          From
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="ms-2 rounded-chip border border-line bg-white px-2 py-1.5" />
        </label>
        <label className="text-sm">
          To
          <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="ms-2 rounded-chip border border-line bg-white px-2 py-1.5" />
        </label>
      </div>

      {error && <p className="mt-4 text-bad">{error}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-4">
        {[
          { k: "Money received", v: egp(instapay + cash) },
          { k: "By InstaPay", v: egp(instapay) },
          { k: "In cash", v: egp(cash) },
          { k: "Court hours booked", v: String(sum("hours")) },
        ].map((x) => (
          <div key={x.k} className="bg-white p-5">
            <dt className="text-sm text-muted">{x.k}</dt>
            <dd className="mt-1 text-2xl font-semibold">{x.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 overflow-x-auto rounded-panel border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-start text-muted">
            <tr>
              {["Day", "Bookings", "Hours", "Deposits", "Counter cash", "Counter InstaPay", "No-shows", "Released"].map((h, i) => (
                <th key={h} className={`px-4 py-3 font-medium ${i ? "text-end" : "text-start"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {days && days.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-muted">
                  No bookings in these dates yet.
                </td>
              </tr>
            )}
            {days?.map((d) => (
              <tr key={d.date}>
                <td className="px-4 py-3">{formatDate(d.date, "en", { weekday: "short", month: "short" })}</td>
                <td className="px-4 py-3 text-end">{d.bookings}</td>
                <td className="px-4 py-3 text-end">{d.hours}</td>
                <td className="px-4 py-3 text-end">{egp(d.deposits)}</td>
                <td className="px-4 py-3 text-end">{egp(d.counter_cash)}</td>
                <td className="px-4 py-3 text-end">{egp(d.counter_instapay)}</td>
                <td className="px-4 py-3 text-end">{d.no_shows}</td>
                <td className="px-4 py-3 text-end">{d.released}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        Released means a slot was freed because the deposit was rejected or not sent in time. Days follow the venue&apos;s hours, so
        bookings after midnight count for the evening before.
      </p>
    </div>
  );
}
