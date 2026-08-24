"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/toast";

export interface RegistryEntryData {
  id: string;
  orderNumber: number;
  projectName: string;
  amount: string;
  isPaid: boolean;
  createdAt: string;
}

function formatAmount(amount: string) {
  return Number(amount).toLocaleString("ro-RO", { minimumFractionDigits: 2 });
}

export function RegistryTable({ initialEntries }: { initialEntries: RegistryEntryData[] }) {
  const router = useRouter();
  const toast = useToast();
  const [entries, setEntries] = useState(initialEntries);
  const [adding, setAdding] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la adăugare");
      setEntries((prev) => [data.entry, ...prev]);
      setProjectName("");
      setAmount("");
      setAdding(false);
      toast.success("Proiect adăugat în registru.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare la adăugare");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePaid(entry: RegistryEntryData) {
    setTogglingId(entry.id);
    const nextPaid = !entry.isPaid;
    // Optimist - schimbam local imediat, revenim daca da eroare.
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, isPaid: nextPaid } : e)));
    try {
      const res = await fetch(`/api/registry/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: nextPaid }),
      });
      if (!res.ok) throw new Error("Eroare la actualizare");
    } catch (err) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, isPaid: entry.isPaid } : e)));
      toast.error("Nu am putut actualiza statusul.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/registry/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Eroare la ștergere");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Intrare ștearsă.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare la ștergere");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-700">
        <h2 className="font-display font-semibold text-base">Proiecte</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-signal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-signal-bright"
          >
            + Adaugă proiect
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-900/40 px-5 py-3.5">
          <input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Denumire proiect"
            className="min-w-[200px] flex-1 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-mist-100 outline-none focus:border-signal"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Sumă (lei)"
            type="number"
            step="0.01"
            min="0"
            className="w-32 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-mist-100 outline-none focus:border-signal"
          />
          <button
            type="submit"
            disabled={submitting || !projectName.trim() || !amount}
            className="rounded-lg bg-signal px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-signal-bright disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Se salvează…" : "Salvează"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setProjectName("");
              setAmount("");
            }}
            className="rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-mist-500 hover:text-mist-100"
          >
            Anulează
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-mist-500">Niciun proiect în registru încă.</p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-xs uppercase tracking-wide text-mist-500">
              <th className="px-5 py-3 font-semibold w-16">Nr.</th>
              <th className="px-5 py-3 font-semibold">Denumire proiect</th>
              <th className="px-5 py-3 font-semibold">Sumă</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-ink-700 last:border-0 hover:bg-ink-900/40">
                <td className="px-5 py-3 font-mono text-mist-500">{entry.orderNumber}</td>
                <td className="px-5 py-3 text-mist-100 font-medium">{entry.projectName}</td>
                <td className="px-5 py-3 font-mono text-mist-100">{formatAmount(entry.amount)} lei</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => togglePaid(entry)}
                    disabled={togglingId === entry.id}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      entry.isPaid
                        ? "bg-state-success/15 text-state-success hover:bg-state-success/25"
                        : "bg-state-warning/15 text-state-warning hover:bg-state-warning/25"
                    }`}
                  >
                    {entry.isPaid ? "Achitat" : "Neachitat"}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  {confirmDeleteId === entry.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="rounded-lg bg-state-error px-2.5 py-1 text-xs font-semibold text-white hover:bg-state-error/80 disabled:opacity-50"
                      >
                        {deletingId === entry.id ? "…" : "Șterge"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-ink-600 px-2.5 py-1 text-xs font-semibold text-mist-500 hover:text-mist-100"
                      >
                        Anulează
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-lg p-1.5 text-mist-500 transition-colors hover:bg-ink-700 hover:text-state-error"
                      title="Șterge"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
