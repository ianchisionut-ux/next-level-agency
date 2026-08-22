"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { PlatformKey } from "@/lib/platform-meta";

export interface CalendarPost {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  platforms: PlatformKey[];
}

export type CalendarViewMode = "month" | "week" | "day";

const DAY_LABELS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const DAY_LABELS_LONG = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const MONTH_LABELS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

function buildMonthGrid(year: number, month: number): Date[] {
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

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeekGrid(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
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
  viewMode,
  anchorDate,
  posts,
}: {
  viewMode: CalendarViewMode;
  anchorDate: string;
  posts: CalendarPost[];
}) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const anchor = new Date(anchorDate);
  const today = dateKey(new Date());

  const postsByDay = new Map<string, CalendarPost[]>();
  for (const post of posts) {
    const key = dateKey(new Date(post.scheduledAt));
    const list = postsByDay.get(key) ?? [];
    list.push(post);
    postsByDay.set(key, list);
  }

  function navigate(mode: CalendarViewMode, date: Date) {
    const d = dateKey(date);
    router.push(`/dashboard/calendar?view=${mode}&date=${d}`);
  }

  function shiftAnchor(delta: number) {
    const d = new Date(anchor);
    if (viewMode === "day") d.setDate(d.getDate() + delta);
    else if (viewMode === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta, 1);
    navigate(viewMode, d);
  }

  async function reschedulePost(post: CalendarPost, newDate: Date) {
    const original = new Date(post.scheduledAt);
    const target = new Date(newDate);
    target.setHours(original.getHours(), original.getMinutes(), 0, 0);

    if (post.status === "PUBLISHED" || post.status === "PUBLISHING") {
      setError("Nu poți reprograma o postare deja publicată.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: target.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la reprogramare");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la reprogramare");
      setTimeout(() => setError(null), 3000);
    }
  }

  async function handleDrop(day: Date) {
    setDragOverDay(null);
    if (!draggingId) return;
    const post = posts.find((p) => p.id === draggingId);
    setDraggingId(null);
    if (!post) return;
    await reschedulePost(post, day);
  }

  const headerLabel =
    viewMode === "day"
      ? `${DAY_LABELS_LONG[(anchor.getDay() + 6) % 7]}, ${anchor.getDate()} ${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : viewMode === "week"
        ? (() => {
            const start = startOfWeek(anchor);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const sameMonth = start.getMonth() === end.getMonth();
            return sameMonth
              ? `${start.getDate()}–${end.getDate()} ${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`
              : `${start.getDate()} ${MONTH_LABELS[start.getMonth()]} – ${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`;
          })()
        : `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const prevLabel = viewMode === "day" ? "← Ziua trecută" : viewMode === "week" ? "← Săptămâna trecută" : "← Luna trecută";
  const nextLabel = viewMode === "day" ? "Ziua următoare →" : viewMode === "week" ? "Săptămâna următoare →" : "Luna viitoare →";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{headerLabel}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-ink-700 bg-ink-800 p-1">
            {(["month", "week", "day"] as CalendarViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => navigate(m, anchor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === m ? "bg-signal text-white" : "text-mist-500 hover:bg-ink-700 hover:text-mist-100"
                }`}
              >
                {m === "month" ? "Lună" : m === "week" ? "Săptămână" : "Zi"}
              </button>
            ))}
          </div>
          <button
            onClick={() => shiftAnchor(-1)}
            className="rounded-lg border border-ink-600 hover:border-ink-500 px-3 py-1.5 text-sm text-mist-100 transition-colors"
          >
            {prevLabel}
          </button>
          <button
            onClick={() => navigate(viewMode, new Date())}
            className="rounded-lg border border-ink-600 hover:border-ink-500 px-3 py-1.5 text-sm text-mist-100 transition-colors"
          >
            Azi
          </button>
          <button
            onClick={() => shiftAnchor(1)}
            className="rounded-lg border border-ink-600 hover:border-ink-500 px-3 py-1.5 text-sm text-mist-100 transition-colors"
          >
            {nextLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-2.5 text-sm text-state-error">
          {error}
        </div>
      )}

      {viewMode === "month" && (
        <MonthGrid
          anchor={anchor}
          postsByDay={postsByDay}
          today={today}
          draggingId={draggingId}
          dragOverDay={dragOverDay}
          setDraggingId={setDraggingId}
          setDragOverDay={setDragOverDay}
          onDrop={handleDrop}
        />
      )}

      {viewMode === "week" && (
        <WeekGrid
          anchor={anchor}
          postsByDay={postsByDay}
          today={today}
          draggingId={draggingId}
          dragOverDay={dragOverDay}
          setDraggingId={setDraggingId}
          setDragOverDay={setDragOverDay}
          onDrop={handleDrop}
        />
      )}

      {viewMode === "day" && <DayList posts={postsByDay.get(dateKey(anchor)) ?? []} />}

      <p className="text-xs text-mist-500">
        Trage orice postare (cu excepția celor deja publicate) pe altă zi ca s-o reprogramezi — ora rămâne neschimbată.
      </p>
    </div>
  );
}

interface GridProps {
  anchor: Date;
  postsByDay: Map<string, CalendarPost[]>;
  today: string;
  draggingId: string | null;
  dragOverDay: string | null;
  setDraggingId: (id: string | null) => void;
  setDragOverDay: (key: string | null) => void;
  onDrop: (day: Date) => void;
}

function DayCard({ post, draggingId, setDraggingId }: { post: CalendarPost; draggingId: string | null; setDraggingId: (id: string | null) => void }) {
  return (
    <Link
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
  );
}

function MonthGrid({ anchor, postsByDay, today, draggingId, dragOverDay, setDraggingId, setDragOverDay, onDrop }: GridProps) {
  const days = buildMonthGrid(anchor.getFullYear(), anchor.getMonth() + 1);

  return (
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
          const isCurrentMonth = day.getMonth() === anchor.getMonth();
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
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(day);
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
                  <DayCard key={post.id} post={post} draggingId={draggingId} setDraggingId={setDraggingId} />
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
  );
}

function WeekGrid({ anchor, postsByDay, today, draggingId, dragOverDay, setDraggingId, setDragOverDay, onDrop }: GridProps) {
  const days = buildWeekGrid(anchor);

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink-700">
        {days.map((day) => {
          const isToday = dateKey(day) === today;
          return (
            <div key={dateKey(day)} className="px-2 py-2.5 text-center border-l border-ink-700 first:border-l-0">
              <div className="text-xs text-mist-500 uppercase tracking-wide">
                {DAY_LABELS[(day.getDay() + 6) % 7]}
              </div>
              <div
                className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono ${
                  isToday ? "bg-signal text-white font-semibold" : "text-mist-300"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7" style={{ minHeight: 320 }}>
        {days.map((day) => {
          const key = dateKey(day);
          const dayPosts = postsByDay.get(key) ?? [];
          const isDragOver = dragOverDay === key;

          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDay(key);
              }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(day);
              }}
              className={`border-l border-ink-700 first:border-l-0 p-2 space-y-1.5 transition-colors ${
                isDragOver ? "bg-signal-soft" : ""
              }`}
            >
              {dayPosts.length === 0 ? (
                <p className="text-[10px] text-mist-700 text-center pt-4">—</p>
              ) : (
                dayPosts.map((post) => {
                  const time = new Date(post.scheduledAt);
                  return (
                    <Link
                      key={post.id}
                      href={`/dashboard/posts/${post.id}`}
                      draggable
                      onDragStart={() => setDraggingId(post.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`block rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5 text-xs hover:border-signal transition-colors cursor-grab active:cursor-grabbing ${
                        draggingId === post.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[post.status] ?? "bg-mist-500"}`} />
                        <span className="text-mist-500 font-mono text-[10px]">{formatTime(time)}</span>
                        {post.platforms.map((p, i) => (
                          <PlatformIcon key={i} platform={p} size={11} />
                        ))}
                      </div>
                      <p className="text-mist-300 truncate">{post.title}</p>
                    </Link>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayList({ posts }: { posts: CalendarPost[] }) {
  const sorted = [...posts].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-800 p-10 text-center">
        <p className="text-sm text-mist-500">Nimic programat în această zi.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card divide-y divide-ink-700">
      {sorted.map((post) => (
        <Link
          key={post.id}
          href={`/dashboard/posts/${post.id}`}
          className="flex items-center gap-4 px-5 py-4 hover:bg-ink-900/50 transition-colors"
        >
          <div className="w-14 shrink-0 font-mono text-sm text-mist-300">
            {formatTime(new Date(post.scheduledAt))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {post.platforms.map((p, i) => (
              <PlatformIcon key={i} platform={p} size={15} />
            ))}
          </div>
          <p className="flex-1 min-w-0 truncate text-sm text-mist-100">{post.title}</p>
          <StatusBadge status={post.status} />
        </Link>
      ))}
    </div>
  );
}
