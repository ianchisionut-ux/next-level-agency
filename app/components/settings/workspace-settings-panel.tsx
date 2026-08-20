"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type WorkspaceRow = {
  id: string;
  name: string;
  role: string;
};

function roleLabel(role: string) {
  if (role === "OWNER") return "Proprietar";
  if (role === "EDITOR") return "Editor";
  return "Vizualizare";
}

export function WorkspaceSettingsPanel({ workspaces }: { workspaces: WorkspaceRow[] }) {
  return (
    <div className="space-y-4">
      {workspaces.map((w) => (
        <WorkspaceCard key={w.id} workspace={w} />
      ))}
    </div>
  );
}

function WorkspaceCard({ workspace }: { workspace: WorkspaceRow }) {
  const router = useRouter();
  const isOwner = workspace.role === "OWNER";

  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === workspace.name) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut redenumi spațiul");
      setSavedMsg("Salvat.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut șterge spațiul");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
      setDeleting(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl border border-ink-700 bg-ink-800 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-mist-100">{workspace.name}</p>
          <p className="text-xs text-mist-500">{roleLabel(workspace.role)}</p>
        </div>
      </div>

      {!isOwner ? (
        <p className="mt-4 text-xs italic text-mist-500">
          Doar proprietarul spațiului poate redenumi sau șterge.
        </p>
      ) : (
        <>
          <form onSubmit={handleRename} className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSavedMsg(null);
              }}
              className="input max-w-xs"
              placeholder="Numele spațiului"
            />
            <button
              type="submit"
              disabled={saving || !name.trim() || name.trim() === workspace.name}
              className="rounded-xl bg-signal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-signal-bright disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Se salvează..." : "Redenumește"}
            </button>
            {savedMsg && <span className="text-xs text-state-success">{savedMsg}</span>}
          </form>

          {error && (
            <p className="mt-2 rounded-lg bg-state-error/10 px-3 py-2 text-xs text-state-error">{error}</p>
          )}

          <div className="mt-5 rounded-xl border border-state-error/30 bg-state-error/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-state-error">Zonă periculoasă</p>
            <p className="mt-1 text-xs text-mist-500">
              Șterge definitiv acest spațiu, împreună cu toate postările, conturile conectate,
              campaniile și datele de analiză asociate. Nu poate fi anulat.
            </p>

            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="mt-3 rounded-lg border border-state-error px-4 py-2 text-xs font-semibold text-state-error transition-colors hover:bg-state-error/10"
              >
                Șterge spațiul
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-mist-300">
                  Scrie <span className="font-mono font-bold text-mist-100">{workspace.name}</span> ca să confirmi:
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    autoFocus
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="input max-w-xs"
                    placeholder={workspace.name}
                  />
                  <button
                    onClick={handleDelete}
                    disabled={confirmText !== workspace.name || deleting}
                    className="rounded-lg bg-state-error px-4 py-2 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deleting ? "Se șterge..." : "Confirmă ștergerea"}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmOpen(false);
                      setConfirmText("");
                    }}
                    className="rounded-lg border border-ink-700 px-4 py-2 text-xs font-semibold text-mist-500 hover:text-mist-100"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
