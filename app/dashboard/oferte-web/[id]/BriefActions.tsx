"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUS_OPTIONS = [
  { value: "NEW", label: "Nou" },
  { value: "CONTACTED", label: "Contactat" },
  { value: "ARCHIVED", label: "Arhivat" },
];

export function BriefActions({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  async function updateStatus(next: string) {
    setCurrent(next);
    await fetch(`/api/oferte-web/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    await fetch(`/api/oferte-web/${id}`, { method: "DELETE" });
    router.push("/dashboard/oferte-web");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <div className="flex items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-800 p-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateStatus(opt.value)}
            disabled={isPending}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              current === opt.value
                ? "bg-signal text-white"
                : "text-mist-500 hover:bg-ink-700 hover:text-mist-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-800 px-4 py-2 text-xs font-semibold text-mist-100 transition-colors hover:bg-ink-700"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Printează
      </button>

      <button
        onClick={handleDelete}
        onBlur={() => setConfirmDelete(false)}
        disabled={isDeleting}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
          confirmDelete
            ? "border-state-error bg-state-error text-white"
            : "border-ink-700 bg-ink-800 text-state-error hover:bg-state-error/10"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isDeleting ? "Se șterge..." : confirmDelete ? "Sigur? Apasă din nou" : "Șterge"}
      </button>
    </div>
  );
}
