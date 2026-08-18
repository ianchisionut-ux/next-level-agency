import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { BroadcastTimeline, TimelineVariant } from "@/app/components/timeline/broadcast-timeline";
import { StatCard, StatIconLink, StatIconClock, StatIconCheck, StatIconWarning } from "@/app/components/ui/stat-card";
import { RecentPostsList } from "@/app/components/dashboard/recent-posts-list";
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

      {accountsCount === 0 && (
        <div className="rounded-2xl border border-signal/30 bg-signal-soft px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-mist-100">
              Conectează primul tău cont ca să poți publica
            </p>
            <p className="text-sm text-mist-500 mt-0.5">
              Facebook, Instagram, TikTok sau Google Business — durează un minut.
            </p>
          </div>
          <Link
            href="/dashboard/accounts"
            className="shrink-0 rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium px-4 py-2.5"
          >
            Conectează un cont
          </Link>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Conturi conectate" value={String(accountsCount)} icon={<StatIconLink />} />
        <StatCard label="Programate" value={String(scheduledCount)} accent="signal" icon={<StatIconClock />} />
        <StatCard label="Publicate (7 zile)" value={String(publishedThisWeek)} accent="success" icon={<StatIconCheck />} />
        <StatCard
          label="Eșuate"
          value={String(failedCount)}
          accent={failedCount > 0 ? "error" : "signal"}
          icon={<StatIconWarning />}
        />
      </div>

      <BroadcastTimeline variants={timelineData} />

      <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-display font-semibold text-base">Postări recente</h2>
        </div>
        <div className="divide-y divide-ink-700">
          <RecentPostsList
            posts={recentPosts.map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status,
              scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
              variants: p.variants.map((v) => ({ id: v.id, platform: v.platform, content: v.content })),
            }))}
            accountsCount={accountsCount}
          />
        </div>
      </div>
    </div>
  );
}
