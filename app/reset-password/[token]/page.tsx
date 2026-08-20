"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la resetare");
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la resetare");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full-transparent.png" alt="Next Level Advertising Agency" className="h-14 w-auto object-contain" />
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-6">
          <h1 className="font-display font-semibold text-lg text-mist-100 mb-1">Parolă nouă</h1>
          <p className="text-sm text-mist-500 mb-6">Alege o parolă nouă pentru contul tău.</p>

          {success ? (
            <p className="text-sm text-state-success">Parola a fost schimbată. Te ducem la autentificare…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolă nouă (minim 8 caractere)"
                className="input"
              />
              {error && (
                <div className="rounded-lg border border-state-error/30 bg-state-error/10 px-3 py-2 text-xs text-state-error">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium py-2.5 disabled:opacity-50"
              >
                {loading ? "Se salvează…" : "Salvează parola nouă"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
