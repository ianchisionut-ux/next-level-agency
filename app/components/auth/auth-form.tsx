"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { email: identifier, password, name, workspaceName }
            : { identifier, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "A apărut o eroare");

      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "A apărut o eroare");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full-dark.png" alt="Next Level Advertising Agency" className="h-10 w-auto object-contain" />
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-6">
          <h1 className="font-display font-semibold text-lg text-mist-100 mb-1">
            {mode === "signup" ? "Creează cont" : "Autentificare"}
          </h1>
          <p className="text-sm text-mist-500 mb-6">
            {mode === "signup"
              ? "Un spațiu de lucru nou pentru brandul sau clientul tău."
              : "Bine ai revenit."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Numele tău">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="Ion Popescu"
                  />
                </Field>
                <Field label="Numele spațiului de lucru">
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="input"
                    placeholder="Next Level Agency"
                  />
                </Field>
              </>
            )}
            <Field label={mode === "signup" ? "Email" : "Email sau username"}>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input"
                placeholder={mode === "signup" ? "tu@agentie.ro" : "email sau username"}
              />
            </Field>
            <Field label="Parolă">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-state-error/30 bg-state-error/10 px-3 py-2 text-xs text-state-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium py-2.5 disabled:opacity-50 mt-2"
            >
              {loading ? "Se procesează…" : mode === "signup" ? "Creează cont" : "Intră în cont"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mist-500 mt-4">
          {mode === "signup" ? (
            <>
              Ai deja cont?{" "}
              <Link href="/login" className="text-signal-bright hover:underline">
                Autentifică-te
              </Link>
            </>
          ) : (
            <Link href="/forgot-password" className="text-signal-bright hover:underline">
              Ai uitat parola?
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-mist-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
