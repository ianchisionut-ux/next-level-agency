"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  goal: number | null;
  startDate: string | null;
  endDate: string | null;
  postsCount: number;
  publishedCount: number;
  engagement: number;
  progressPct: number | null;
};

export function CampaignsList({ workspaceId, campaigns }: { workspaceId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, campaignId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (confirmDeleteId !== campaignId) {
      setConfirmDeleteId(campaignId);
      return;
    }

    setDeletingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la ștergere");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Eroare la ștergere");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Numele campaniei e obligatoriu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name,
          description,
          goal: goal ? Number(goal) : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la creare");
      router.refresh();
      setCreating(false);
      setName("");
      setDescription("");
      setGoal("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la creare");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-xl bg-signal hover:bg-signal-bright active:scale-[0.98] shadow-floating transition-all duration-150 text-white text-sm font-medium px-4 py-2.5"
        >
          {creating ? "Anulează" : "+ Campanie nouă"}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Numele campaniei (ex: Lansare colecție toamnă)"
            className="input"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descriere (opțional)"
            rows={2}
            className="w-full bg-ink-900 border border-ink-600 rounded-xl p-3 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal outline-none resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-xs text-mist-500">
              Obiectiv (interacțiuni)
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                type="number"
                placeholder="ex: 5000"
                className="input mt-1"
              />
            </label>
            <label className="block text-xs text-mist-500">
              Start
              <input
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                className="input mt-1"
              />
            </label>
            <label className="block text-xs text-mist-500">
              Final
              <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="input mt-1" />
            </label>
          </div>
          {error && <p className="text-sm text-state-error">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-lg bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? "Se creează…" : "Creează campania"}
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-800 p-10 text-center">
          <p className="text-mist-500 text-sm">
            Nicio campanie încă. Grupează postările sub un obiectiv comun ca să urmărești progresul agregat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/dashboard/campaigns/${c.id}`);
              }}
              className="cursor-pointer rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5 hover:border-signal/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-mist-100">{c.name}</p>
                  {c.description && <p className="text-xs text-mist-500 mt-0.5">{c.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-mist-500">
                    {c.postsCount} {c.postsCount === 1 ? "postare" : "postări"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, c.id)}
                    onMouseLeave={() => confirmDeleteId === c.id && setConfirmDeleteId(null)}
                    disabled={deletingId === c.id}
                    title={confirmDeleteId === c.id ? "Sigur? Apasă din nou" : "Șterge campania"}
                    className={`relative z-10 rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                      confirmDeleteId === c.id
                        ? "bg-state-error text-white"
                        : "text-mist-500 hover:bg-ink-700 hover:text-state-error"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {c.goal ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-mist-500">
                      {c.engagement.toLocaleString("ro-RO")} / {c.goal.toLocaleString("ro-RO")} interacțiuni
                    </span>
                    <span className="font-mono text-signal-bright">{c.progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-signal"
                      style={{ width: `${Math.min(100, c.progressPct ?? 0)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-mist-500">
                  {c.engagement.toLocaleString("ro-RO")} interacțiuni totale · {c.publishedCount} publicate
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
