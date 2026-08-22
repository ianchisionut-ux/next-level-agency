import Link from "next/link";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PlatformKey } from "@/lib/platform-meta";

export interface MiniWeekPost {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  platforms: PlatformKey[];
}

const DAY_LABELS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-mist-500",
  SCHEDULED: "bg-signal",
  PUBLISHING: "bg-state-warning",
  PUBLISHED: "bg-state-success",
  FAILED: "bg-state-error",
  PARTIALLY_PUBLISHED: "bg-state-warning",
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Calendar mic, read-only, al saptamanii curente (Luni-Duminica) - un
 * rezumat compact langa Timeline, pentru cine vrea sa vada dintr-o privire
 * cum arata saptamana fara sa navigheze la pagina completa de Calendar.
 */
export function MiniWeekCalendar({ posts }: { posts: MiniWeekPost[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = startOfWeek(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayKey = dateKey(today);

  const postsByDay = new Map<string, MiniWeekPost[]>();
  for (const post of posts) {
    const key = dateKey(new Date(post.scheduledAt));
    const list = postsByDay.get(key) ?? [];
    list.push(post);
    postsByDay.set(key, list);
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
        <h2 className="font-display font-semibold text-base">Săptămâna aceasta</h2>
        <Link href="/dashboard/calendar?view=week" className="text-xs text-signal-bright hover:underline font-medium">
          Calendar complet →
        </Link>
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = dateKey(day);
          const isToday = key === todayKey;
          const dayPosts = postsByDay.get(key) ?? [];

          return (
            <div key={key} className="border-l border-ink-700 first:border-l-0 p-2 min-h-[110px]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-mist-500 uppercase">{DAY_LABELS[i]}</span>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono ${
                    isToday ? "bg-signal text-white font-semibold" : "text-mist-300"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 2).map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/posts/${post.id}`}
                    className="flex items-center gap-1 rounded-md border border-ink-600 bg-ink-900 px-1.5 py-1 text-[10px] text-mist-300 hover:border-signal transition-colors"
                    title={post.title}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[post.status] ?? "bg-mist-500"}`} />
                    {post.platforms[0] && <PlatformIcon platform={post.platforms[0]} size={9} />}
                    <span className="truncate">{post.title}</span>
                  </Link>
                ))}
                {dayPosts.length > 2 && (
                  <p className="text-[9px] text-mist-500 pl-1">+{dayPosts.length - 2} mai multe</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
