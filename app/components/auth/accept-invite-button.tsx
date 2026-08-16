"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la acceptare");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la acceptare");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={accept}
        disabled={loading}
        className="w-full rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium py-2.5 disabled:opacity-50"
      >
        {loading ? "Se procesează…" : "Acceptă invitația"}
      </button>
      {error && <p className="text-xs text-state-error mt-2">{error}</p>}
    </div>
  );
}
