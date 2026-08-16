"use client";

import { useEffect, useState } from "react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}
interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export function MembersPanel({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/workspaces/members?workspaceId=${workspaceId}`);
    const data = await res.json();
    if (res.ok) {
      setMembers(data.members);
      setInvitations(data.invitations);
      setCurrentUserRole(data.currentUserRole);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setInviting(true);
    try {
      const res = await fetch("/api/workspaces/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la invitare");
      setEmail("");
      if (data.warning) setNotice(data.warning);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la invitare");
    } finally {
      setInviting(false);
    }
  }

  const canInvite = currentUserRole === "OWNER";

  if (loading) return <p className="text-sm text-mist-500">Se încarcă…</p>;

  return (
    <div className="space-y-6">
      {canInvite && (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <p className="text-sm font-medium mb-3">Invită un coleg</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coleg@agentie.ro"
              className="input flex-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
              className="bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-sm text-mist-100 outline-none focus:border-signal"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Vizualizare</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium px-4 disabled:opacity-50"
            >
              Invită
            </button>
          </form>
          {error && <p className="text-xs text-state-error mt-2">{error}</p>}
          {notice && <p className="text-xs text-state-warning mt-2">{notice}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-display font-semibold text-base">Membri</h2>
        </div>
        <div className="divide-y divide-ink-700">
          {members.map((m) => (
            <div key={m.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-mist-100">{m.name}</p>
                <p className="text-xs text-mist-500">{m.email}</p>
              </div>
              <span className="text-xs text-mist-500 uppercase tracking-wide">{roleLabel(m.role)}</span>
            </div>
          ))}
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
          <div className="px-5 py-4 border-b border-ink-700">
            <h2 className="font-display font-semibold text-base">Invitații în așteptare</h2>
          </div>
          <div className="divide-y divide-ink-700">
            {invitations.map((i) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-mist-300">{i.email}</p>
                <span className="text-xs text-mist-500 uppercase tracking-wide">{roleLabel(i.role)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "OWNER") return "Proprietar";
  if (role === "EDITOR") return "Editor";
  return "Vizualizare";
}
