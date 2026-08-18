"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface WorkspaceOption {
  id: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  async function switchTo(id: string) {
    await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    setOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setCreating(false);
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-nav-bg-hover transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-nav-text truncate">{active?.name ?? "Spațiu de lucru"}</p>
          <p className="text-xs text-nav-text-muted">{roleLabel(active?.role)}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8F9C" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-nav-border-strong bg-nav-bg shadow-card z-20 overflow-hidden">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => switchTo(w.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-nav-bg-hover transition-colors ${
                w.id === activeId ? "text-signal-bright" : "text-nav-text"
              }`}
            >
              {w.name}
            </button>
          ))}
          <div className="border-t border-nav-border p-2">
            {creating ? (
              <form onSubmit={createWorkspace} className="flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nume client/brand"
                  className="input-on-dark flex-1"
                />
                <button type="submit" className="text-xs text-signal-bright font-medium px-2">
                  Creează
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-1 py-1 text-xs text-nav-text-muted hover:text-nav-text transition-colors"
              >
                + Spațiu nou (client/brand)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function roleLabel(role?: string) {
  if (role === "OWNER") return "Proprietar";
  if (role === "EDITOR") return "Editor";
  if (role === "VIEWER") return "Vizualizare";
  return "";
}
