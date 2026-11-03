"use client";

import { useState } from "react";
import { REJECT_REASONS } from "./actions";

/** Asks why a payment is rejected; the customer sees this reason. */
export function RejectForm({ onReject, onCancel, busy }: { onReject: (reason: string) => void; onCancel: () => void; busy: boolean }) {
  const [choice, setChoice] = useState(REJECT_REASONS[0]);
  const [other, setOther] = useState("");
  const reason = choice === "other" ? other.trim() : choice;

  return (
    <div className="mt-3 rounded-chip border border-bad/30 bg-bad-soft p-3">
      <label className="block text-sm font-medium text-bad">
        Reason shown to the customer
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="mt-1.5 w-full rounded-chip border border-line bg-white px-3 py-2 text-ink"
        >
          {REJECT_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
          <option value="other">Other…</option>
        </select>
      </label>
      {choice === "other" && (
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Write the reason"
          className="mt-2 w-full rounded-chip border border-line bg-white px-3 py-2"
        />
      )}
      <p className="mt-2 text-xs text-bad">The slot will be released and the customer can book again.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !reason}
          onClick={() => onReject(reason)}
          className="rounded-chip bg-bad px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Reject payment
        </button>
        <button type="button" onClick={onCancel} className="rounded-chip px-3 py-2 text-sm">
          Keep it
        </button>
      </div>
    </div>
  );
}
