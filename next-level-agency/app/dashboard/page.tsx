import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { BroadcastTimeline, TimelineVariant } from "@/app/components/timeline/broadcast-timeline";
import { StatCard } from "@/app/components/ui/stat-card";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const workspace = await getActiveWorkspace();
  const workspaceId = workspace!.id;

  const [variants, recentPosts, accountsCount] = await Promise.all([
    prisma.postVariant.findMany({
      where: { scheduledAt: { not: null }, post: { workspaceId } },
      orderBy: { scheduledAt: "asc" },
      take: 200,
    }),
    prisma.post.findMany({
      where: { workspaceId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { variants: true },
    }),
    prisma.connectedAccount.count({ where: { isActive: true, workspaceId } }),
  ]);

  const timelineData: TimelineVariant[] = variants.map((v) => ({
    id: v.id,
    platform: v.platform as PlatformKey,
    status: v.status,
    scheduledAt: v.scheduledAt?.toISOString() ?? null,
    content: v.content,
  }));

  const scheduledCount = variants.filter((v) => v.status === "PENDING").length;
  const publishedThisWeek = variants.filter(
    (v) => v.status === "PUBLISHED" && v.scheduledAt && v.scheduledAt > new Date(Date.now() - 7 * 86400000)
  ).length;
  const failedCount = variants.filter((v) => v.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Timeline</h1>
          <p className="text-sm text-mist-500 mt-1">Tot ce se publică, pe toate platformele, dintr-o privire.</p>
        </div>
        <Link
          href="/dashboard/compose"
          className="rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium px-4 py-2.5"
        >
          + Postare nouă
        </Link>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Conturi conectate" value={String(accountsCount)} />
        <StatCard label="Programate" value={String(scheduledCount)} accent="signal" />
        <StatCard label="Publicate (7 zile)" value={String(publishedThisWeek)} accent="success" />
        <StatCard label="Eșuate" value={String(failedCount)} accent={failedCount > 0 ? "error" : "signal"} />
      </div>

      <BroadcastTimeline variants={timelineData} />

      <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-display font-semibold text-base">Postări recente</h2>
        </div>
        <div className="divide-y divide-ink-700">
          {recentPosts.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-mist-500 text-sm">
                Nicio postare încă. Prima ta postare durează două minute.
              </p>
              <Link
                href="/dashboard/compose"
                className="inline-block mt-3 text-signal-bright text-sm font-medium hover:underline"
              >
                Creează prima postare →
              </Link>
            </div>
          )}
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/dashboard/posts/${post.id}`}
              className="px-5 py-4 flex items-center justify-between hover:bg-ink-900/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {post.title || post.variants[0]?.content.slice(0, 60) || "(fără conținut)"}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {post.variants.map((v) => (
                    <PlatformIcon key={v.id} platform={v.platform as PlatformKey} size={14} />
                  ))}
                  <span className="text-xs text-mist-500 font-mono ml-1">
                    {post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "fără programare"}
                  </span>
                </div>
              </div>
              <StatusBadge status={post.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
