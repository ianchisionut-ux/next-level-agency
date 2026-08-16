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
}

const CONNECT_CONFIG: Record<
  PlatformKey,
  { available: boolean; href: string; note?: string }
> = {
  FACEBOOK: { available: true, href: "/api/accounts/connect/meta" },
  INSTAGRAM: { available: true, href: "/api/accounts/connect/meta", note: "Se conectează odată cu Facebook" },
  TIKTOK: { available: true, href: "/api/accounts/connect/tiktok", note: "Necesită aplicație TikTok aprobată pentru Content Posting API" },
  GOOGLE_BUSINESS: { available: true, href: "/api/accounts/connect/google" },
};

export function AccountsList({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

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
      <div className="grid grid-cols-2 gap-4">
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
                {config.available ? (
                  <a
                    href={config.href}
                    className="text-xs font-medium text-signal-bright hover:underline"
                  >
                    + Conectează
                  </a>
                ) : (
                  <span className="text-xs text-mist-700">Curând</span>
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
                      <div>
                        <p className="text-sm text-mist-100">{acc.accountName}</p>
                        <p className="text-xs text-mist-500">
                          Conectat {new Date(acc.connectedAt).toLocaleDateString("ro-RO")}
                        </p>
                      </div>
                      <button
                        onClick={() => disconnect(acc.id)}
                        disabled={disconnecting === acc.id}
                        className="text-xs text-state-error hover:underline disabled:opacity-50"
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
