"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";
import { useToast } from "@/app/components/ui/toast";

export interface TimelineVariant {
  id: string;
  postId: string;
  postStatus: string;
  platform: PlatformKey;
  status: string;
  scheduledAt: string | null; // ISO
  content: string;
}

interface Props {
  variants: TimelineVariant[];
}

const DAY_COUNT = 7;
const HOUR_START = 6;
const HOUR_END = 23;

export function BroadcastTimeline({ variants }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [hovered, setHovered] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  async function deletePost(postId: string) {
    if (!confirm("Sigur vrei să ștergi această postare din Timeline? Acțiunea nu poate fi anulată.")) return;

    setDeletingPostId(postId);
    try {
      const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Postarea nu a putut fi ștearsă");
      setHovered(null);
      toast.success("Postarea a fost ștearsă din Timeline.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Postarea nu a putut fi ștearsă");
    } finally {
      setDeletingPostId(null);
    }
  }

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineVariant[]>();
    for (const day of days) map.set(day.toDateString(), []);
    for (const v of variants) {
      if (!v.scheduledAt) continue;
      const d = new Date(v.scheduledAt);
      const key = d.toDateString();
      if (map.has(key)) map.get(key)!.push(v);
    }
    return map;
  }, [variants, days]);

  const totalHours = HOUR_END - HOUR_START;
  const hasAnyItem = Array.from(grouped.values()).some((items) => items.length > 0);

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-base">Ce se publică următoarele 7 zile</h2>
          <p className="text-xs text-mist-500 mt-0.5">Fiecare punct e o postare programată pe o platformă</p>
        </div>
        <Legend />
      </div>

      {!hasAnyItem ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-mist-500">Nimic programat în următoarele 7 zile.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* header cu zile */}
            <div className="grid grid-cols-7 border-b border-ink-700">
              {days.map((day, i) => (
                <div key={i} className="px-3 py-2 text-center border-l border-ink-700 first:border-l-0">
                  <div className="text-xs text-mist-500 uppercase tracking-wide">
                    {day.toLocaleDateString("ro-RO", { weekday: "short" })}
                  </div>
                  <div className="text-sm font-medium font-mono">{day.getDate()}</div>
                </div>
              ))}
            </div>

            {/* lanes cu postari */}
            <div className="grid grid-cols-7 relative" style={{ height: 130 }}>
            {days.map((day, i) => {
              const items = grouped.get(day.toDateString()) ?? [];
              return (
                <div key={i} className="relative border-l border-ink-700 first:border-l-0">
                  {items.map((item) => {
                    const d = new Date(item.scheduledAt!);
                    const hour = d.getHours() + d.getMinutes() / 60;
                    const clamped = Math.min(Math.max(hour, HOUR_START), HOUR_END);
                    const topPct = ((clamped - HOUR_START) / totalHours) * 100;
                    const meta = PLATFORM_META[item.platform];
                    const isHovered = hovered === item.id;

                    return (
                      <div
                        key={item.id}
                        className="absolute left-1/2 -translate-x-1/2 group"
                        style={{ top: `${topPct}%` }}
                        onMouseEnter={() => setHovered(item.id)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <div
                          className="h-3 w-3 rounded-full ring-2 ring-ink-800 cursor-pointer transition-transform"
                          style={{
                            background: meta.color,
                            transform: isHovered ? "scale(1.5)" : "scale(1)",
                            opacity: item.status === "FAILED" ? 0.5 : 1,
                          }}
                        />
                        {isHovered && (
                          <div className="absolute z-10 left-1/2 -translate-x-1/2 top-5 w-56 rounded-xl border border-ink-600 bg-ink-950 shadow-card p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <PlatformIcon platform={item.platform} size={14} />
                              <span className="text-xs font-medium text-mist-100">{meta.label}</span>
                              <span className="text-xs text-mist-500 ml-auto font-mono">
                                {d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs text-mist-300 line-clamp-3">{item.content}</p>
                            {item.postStatus !== "PUBLISHED" && item.postStatus !== "PUBLISHING" && (
                              <button
                                type="button"
                                disabled={deletingPostId === item.postId}
                                onClick={() => deletePost(item.postId)}
                                className="mt-2.5 w-full rounded-lg border border-state-error/30 px-2.5 py-1.5 text-xs font-medium text-state-error transition hover:bg-state-error/10 disabled:cursor-wait disabled:opacity-50"
                              >
                                {deletingPostId === item.postId ? "Se șterge…" : "Șterge postarea"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const entries = Object.entries(PLATFORM_META) as [PlatformKey, (typeof PLATFORM_META)[PlatformKey]][];
  return (
    <div className="flex items-center gap-3">
      {entries.map(([key, meta]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          <span className="text-xs text-mist-500">{meta.short}</span>
        </div>
      ))}
    </div>
  );
}
