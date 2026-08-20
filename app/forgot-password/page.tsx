"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full-dark.png" alt="Next Level Advertising Agency" className="h-8 w-auto object-contain" />
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-6">
          <h1 className="font-display font-semibold text-lg text-mist-100 mb-1">Ai uitat parola?</h1>
          <p className="text-sm text-mist-500 mb-6">
            Îți trimitem un link de resetare pe email.
          </p>

          {sent ? (
            <p className="text-sm text-state-success">
              Dacă există un cont cu acest email, vei primi instrucțiuni în câteva momente.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@agentie.ro"
                className="input"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium py-2.5 disabled:opacity-50"
              >
                {loading ? "Se trimite…" : "Trimite link de resetare"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-mist-500 mt-4">
          <Link href="/login" className="text-signal-bright hover:underline">
            Înapoi la autentificare
          </Link>
        </p>
      </div>
    </div>
  );
}
