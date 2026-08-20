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
    </div>
  );
}
