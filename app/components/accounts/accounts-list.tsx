"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export interface AccountRow {
  id: string;
  platform: PlatformKey;
  accountName: string;
  connectedAt: string;
  tokenExpiresAt: string | null;
  overview?: { followers: number | null; pictureUrl: string | null; extra?: string } | null;
}

const CONNECT_CONFIG: Record<
  PlatformKey,
  { available: boolean; href: string | null; note?: string }
> = {
  FACEBOOK: { available: false, href: null, note: "Conectat automat prin Sincronizare Business Portfolio, mai sus" },
  INSTAGRAM: { available: false, href: null, note: "Conectat automat prin Sincronizare Business Portfolio, mai sus" },
  TIKTOK: { available: true, href: "/api/accounts/connect/tiktok", note: "Necesită aplicație TikTok aprobată pentru Content Posting API" },
  GOOGLE_BUSINESS: { available: true, href: "/api/accounts/connect/google" },
};

export function AccountsList({ accounts, workspaceId }: { accounts: AccountRow[]; workspaceId: string }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/accounts/sync-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la sincronizare");
      const saved = (data.analytics?.postInsights?.saved ?? 0) + (data.analytics?.pageInsights?.saved ?? 0);
      const errors = [
        ...(data.analytics?.postInsights?.errors ?? []),
        ...(data.analytics?.pageInsights?.errors ?? []),
        ...(data.analytics?.demographics?.errors ?? []),
      ];
      setSyncResult(
        `${data.connected} cont(uri) sincronizat(e); ${saved} snapshot(uri) analytics actualizat(e).` +
          (data.tokenDiagnostic?.missingScopes?.length
            ? ` Lipsesc din System User Token: ${data.tokenDiagnostic.missingScopes.join(", ")}.`
            : "")
      );
      if (errors.length) setSyncError(`Meta: ${errors.slice(0, 3).join(" | ")}`);
      router.refresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Eroare la sincronizare");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect(id: string) {
    setDisconnecting(id);
    try {
      await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDisconnecting(null);
    }
  }

  const platforms = Object.keys(CONNECT_CONFIG) as PlatformKey[];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-signal/30 bg-signal-soft p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-mist-100">Sincronizează din Business Portfolio</p>
            <p className="text-xs text-mist-500 mt-0.5">
              Aduce automat toate paginile de Facebook și conturile Instagram la care System User-ul
              agenției are acces (inclusiv cele ale clienților, partajate prin Business Portfolio).
            </p>
          </div>
          <div className="shrink-0 flex flex-wrap justify-end gap-2">
            <a
              href="/api/accounts/connect/meta"
              className="rounded-xl border border-signal/40 bg-ink-800 px-4 py-2.5 text-sm font-medium text-signal-bright hover:border-signal transition-colors"
            >
              Reconectează Meta
            </a>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-xl bg-signal hover:bg-signal-bright active:scale-[0.98] shadow-floating transition-all duration-150 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
            {syncing && (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
              </svg>
            )}
            {syncing ? "Se sincronizează…" : "Sincronizează acum"}
            </button>
          </div>
        </div>
        {syncResult && <p className="text-xs text-state-success mt-3">{syncResult}</p>}
        {syncError && <p className="text-xs text-state-error mt-3">{syncError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const meta = PLATFORM_META[platform];
          const config = CONNECT_CONFIG[platform];
          const connected = accounts.filter((a) => a.platform === platform);

          return (
            <div key={platform} className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <PlatformIcon platform={platform} size={20} />
                  <span className="font-medium text-sm">{meta.label}</span>
                </div>
                {config.href ? (
                  <a
                    href={config.href}
                    className="text-xs font-medium text-signal-bright hover:underline"
                  >
                    + Conectează
                  </a>
                ) : (
                  <span className="text-xs text-mist-700">Automat</span>
                )}
              </div>

              {config.note && <p className="text-xs text-mist-500 mb-3">{config.note}</p>}

              {connected.length === 0 ? (
                <p className="text-xs text-mist-700">Niciun cont conectat.</p>
              ) : (
                <div className="space-y-2">
                  {connected.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {acc.overview?.pictureUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={acc.overview.pictureUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-mist-100 truncate">{acc.accountName}</p>
                          {acc.overview ? (
                            <p className="text-xs text-mist-500">
                              {acc.overview.followers != null
                                ? `${acc.overview.followers.toLocaleString("ro-RO")} urmăritori`
                                : "Statistici indisponibile"}
                              {acc.overview.extra ? ` · ${acc.overview.extra}` : ""}
                            </p>
                          ) : (
                            <p className="text-xs text-mist-500">
                              Conectat {new Date(acc.connectedAt).toLocaleDateString("ro-RO")}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => disconnect(acc.id)}
                        disabled={disconnecting === acc.id}
                        className="shrink-0 text-xs text-state-error hover:underline disabled:opacity-50"
                      >
                        Deconectează
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
