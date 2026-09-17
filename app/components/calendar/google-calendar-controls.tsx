"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, RefreshCw, Unlink } from "lucide-react";
import { useToast } from "@/app/components/ui/toast";

type Props = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  connectedMessage?: string;
  importedCount?: string;
  errorMessage?: string;
};

export function GoogleCalendarControls({
  configured,
  connected,
  accountEmail,
  lastSyncedAt,
  connectedMessage,
  importedCount,
  errorMessage,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const handledMessage = useRef(false);

  useEffect(() => {
    if (handledMessage.current) return;
    handledMessage.current = true;
    if (errorMessage) toast.error(errorMessage);
    if (connectedMessage) {
      const suffix = importedCount ? ` · ${importedCount} evenimente preluate` : "";
      toast.success(`Google Calendar conectat${suffix}.`);
    }
    if (errorMessage || connectedMessage) {
      window.history.replaceState({}, "", "/dashboard/calendar");
    }
  }, [connectedMessage, errorMessage, importedCount, toast]);

  async function syncNow() {
    setBusy(true);
    const response = await fetch("/api/calendar/google/sync", { method: "POST" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return toast.error(data.error || "Sincronizarea a eșuat.");
    toast.success(
      `Sincronizare finalizată: ${data.created} noi, ${data.updated} actualizate, ${data.deleted} șterse.`
    );
    router.refresh();
  }

  async function disconnect() {
    if (!window.confirm("Deconectezi Google Calendar? Evenimentele deja importate rămân în calendarul intern.")) return;
    setBusy(true);
    const response = await fetch("/api/calendar/google/disconnect", { method: "DELETE" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return toast.error(data.error || "Deconectarea a eșuat.");
    toast.success("Google Calendar a fost deconectat.");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-500/15 p-2 text-blue-300">
            <CalendarCheck2 size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-mist-100">Google Calendar</h2>
            {!configured ? (
              <p className="mt-1 text-xs text-state-warning">
                Integrarea așteaptă configurarea variabilelor OAuth Google.
              </p>
            ) : connected ? (
              <p className="mt-1 text-xs text-mist-500">
                Conectat{accountEmail ? ` ca ${accountEmail}` : ""}
                {lastSyncedAt
                  ? ` · ultima sincronizare ${new Date(lastSyncedAt).toLocaleString("ro-RO")}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-mist-500">
                Evenimentele personale sunt sincronizate bidirecțional cu calendarul principal Google.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <button
                type="button"
                onClick={syncNow}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                {busy ? "Se sincronizează…" : "Sincronizează acum"}
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-mist-500 hover:text-state-error disabled:opacity-50"
              >
                <Unlink size={14} /> Deconectează
              </button>
            </>
          ) : (
            <a
              href={configured ? "/api/calendar/google/connect" : undefined}
              aria-disabled={!configured}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                configured ? "bg-blue-600 hover:bg-blue-500" : "cursor-not-allowed bg-ink-600 opacity-50"
              }`}
            >
              <CalendarCheck2 size={14} /> Conectează Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
