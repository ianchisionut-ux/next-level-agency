"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PlatformKey } from "@/lib/platform-meta";

export interface CalendarPost {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  platforms: PlatformKey[];
}

const DAY_LABELS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const MONTH_LABELS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

function buildMonthGrid(year: number, month: number): Date[] {
  // month e 1-12. Construim o grila de saptamani complete (Luni->Duminica)
  // care acopera toata luna, incepand cu prima zi de Luni din saptamana in
  // care cade ziua 1, si terminand cu ultima Duminica din saptamana in care
  // cade ultima zi a lunii.
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Luni
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  const lastWeekday = (lastOfMonth.getDay() + 6) % 7;
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - lastWeekday));

  const days: Date[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-mist-500",
  SCHEDULED: "bg-signal",
  PUBLISHING: "bg-state-warning",
  PUBLISHED: "bg-state-success",
  FAILED: "bg-state-error",
  PARTIALLY_PUBLISHED: "bg-state-warning",
};

export function CalendarView({
  year,
  month,
  posts,
}: {
  year: number;
  month: number;
  posts: CalendarPost[];
}) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = buildMonthGrid(year, month);
  const today = dateKey(new Date());

  const postsByDay = new Map<string, CalendarPost[]>();
  for (const post of posts) {
    const key = dateKey(new Date(post.scheduledAt));
    const list = postsByDay.get(key) ?? [];
    list.push(post);
    postsByDay.set(key, list);
  }

  function goToMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/dashboard/calendar?month=${m}`);
  }

  async function handleDrop(day: Date) {
    setDragOverDay(null);
    if (!draggingId) return;
    const post = posts.find((p) => p.id === draggingId);
    setDraggingId(null);
    if (!post) return;

    // Pastram ora existenta a postarii, doar schimbam ziua.
    const original = new Date(post.scheduledAt);
    const newDate = new Date(day);
    newDate.setHours(original.getHours(), original.getMinutes(), 0, 0);

    // Nu are sens sa "reprogramam" o postare deja publicata.
    if (post.status === "PUBLISHED" || post.status === "PUBLISHING") {
      setError("Nu poți reprograma o postare deja publicată.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newDate.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la reprogramare");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la reprogramare");
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          {MONTH_LABELS[month - 1]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded-lg border border-ink-600 hover:border-ink-500 px-3 py-1.5 text-sm text-mist-100 transition-colors"
          >
            ← Luna trecută
          </button>
          <button
            onClick={() => router.push("/dashboard/calendar")}
            className="rounded-lg border border-ink-600 hover:border-ink-500 px-3 py-1.5 text-sm text-mist-100 transition-colors"
          >
            Azi
          </button>
          <button
            onClick={() => goToMonth(1)}
            className="rounded-lg border border-ink-600 hover:border-ink-500 px-3 py-1.5 text-sm text-mist-100 transition-colors"
          >
            Luna viitoare →
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-2.5 text-sm text-state-error">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-ink-700">
          {DAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2.5 text-center text-xs font-semibold text-mist-500 uppercase">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dateKey(day);
            const isCurrentMonth = day.getMonth() === month - 1;
            const isToday = key === today;
            const dayPosts = postsByDay.get(key) ?? [];
            const isDragOver = dragOverDay === key;

            return (
              <div
                key={key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverDay(key);
                }}
                onDragLeave={() => setDragOverDay((prev) => (prev === key ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(day);
                }}
                className={`min-h-[92px] border-b border-r border-ink-700 p-1.5 sm:p-2 transition-colors ${
                  isCurrentMonth ? "bg-transparent" : "bg-ink-900/40"
                } ${isDragOver ? "bg-signal-soft" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono ${
                    isToday
                      ? "bg-signal text-white font-semibold"
                      : isCurrentMonth
                        ? "text-mist-300"
                        : "text-mist-700"
                  }`}
                >
                  {day.getDate()}
                </span>

                <div className="mt-1 space-y-1">
                  {dayPosts.slice(0, 3).map((post) => (
                    <Link
                      key={post.id}
                      href={`/dashboard/posts/${post.id}`}
                      draggable
                      onDragStart={() => setDraggingId(post.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`flex items-center gap-1 rounded-md border border-ink-600 bg-ink-900 px-1.5 py-1 text-[10px] text-mist-300 hover:border-signal transition-colors cursor-grab active:cursor-grabbing ${
                        draggingId === post.id ? "opacity-40" : ""
                      }`}
                      title={post.title}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[post.status] ?? "bg-mist-500"}`} />
                      {post.platforms[0] && <PlatformIcon platform={post.platforms[0]} size={10} />}
                      <span className="truncate">{post.title}</span>
                    </Link>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-[10px] text-mist-500 pl-1">+{dayPosts.length - 3} mai multe</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-mist-500">
        Trage orice postare (cu excepția celor deja publicate) pe altă zi ca s-o reprogramezi — ora rămâne neschimbată.
      </p>
    </div>
  );
}
