"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoalProgress({
  workspaceId,
  goal,
  currentEngagement,
}: {
  workspaceId: string;
  goal: number | null;
  currentEngagement: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/workspaces/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, goal: value || null }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!goal) {
    return editing ? (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ex: 50000"
          className="input w-32"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-signal hover:bg-signal-bright transition-colors text-white text-xs font-medium px-3 py-2 disabled:opacity-50"
        >
          Salvează
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-mist-500 hover:text-mist-100">
          Anulează
        </button>
      </div>
    ) : (
      <button
        onClick={() => setEditing(true)}
        className="rounded-xl border border-dashed border-ink-600 hover:border-signal text-mist-500 hover:text-signal-bright transition-colors text-xs font-medium px-4 py-2.5"
      >
        + Setează un obiectiv lunar de interacțiuni
      </button>
    );
  }

  const pct = Math.round((currentEngagement / goal) * 100);
  const reached = pct >= 100;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-4 min-w-[260px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-mist-500 uppercase tracking-wide">Obiectiv lunar</span>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input w-24 !py-1 !text-xs"
            />
            <button onClick={save} disabled={saving} className="text-xs text-signal-bright font-medium">
              OK
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-mist-500 hover:text-mist-100">
            Editează
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-xl font-semibold ${reached ? "text-state-success" : "text-mist-100"}`}>
          {pct}%
        </span>
        <span className="text-xs text-mist-500">din obiectiv</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden mt-2">
        <div
          className={`h-full rounded-full ${reached ? "bg-state-success" : "bg-signal"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-xs text-mist-500 mt-1.5">
        {currentEngagement.toLocaleString("ro-RO")} / {goal.toLocaleString("ro-RO")} interacțiuni
      </p>
    </div>
  );
}
