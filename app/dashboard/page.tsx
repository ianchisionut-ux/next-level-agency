import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { BroadcastTimeline, TimelineVariant } from "@/app/components/timeline/broadcast-timeline";
import { StatCard, StatIconLink, StatIconClock, StatIconCheck, StatIconWarning } from "@/app/components/ui/stat-card";
import { RecentPostsList } from "@/app/components/dashboard/recent-posts-list";
import { PageHeader } from "@/app/components/ui/page-header";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const workspace = await getActiveWorkspace();
  const workspaceId = workspace!.id;

  const [variants, recentPosts, accountsCount] = await Promise.all([
    // Filtram dupa "are o programare fie pe varianta, fie pe postarea
    // parinte" - PostVariant.scheduledAt e populat DOAR cand userul alege
    // manual o ora diferita per-platforma in Composer; in fluxul normal (o
    // singura ora, pentru toate platformele), ora reala sta pe Post.scheduledAt.
    prisma.postVariant.findMany({
      where: {
        post: { workspaceId },
        OR: [{ scheduledAt: { not: null } }, { post: { scheduledAt: { not: null } } }],
      },
      include: { post: { select: { scheduledAt: true } } },
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

  // Ora efectiva: override-ul per-platforma daca exista, altfel ora globala a postarii.
  function effectiveScheduledAt(v: (typeof variants)[number]): Date | null {
    return v.scheduledAt ?? v.post.scheduledAt ?? null;
  }

  const timelineData: TimelineVariant[] = variants.map((v) => ({
    id: v.id,
    platform: v.platform as PlatformKey,
    status: v.status,
    scheduledAt: effectiveScheduledAt(v)?.toISOString() ?? null,
    content: v.content,
  }));

  const scheduledCount = variants.filter((v) => v.status === "PENDING").length;
  const publishedThisWeek = variants.filter(
    (v) => v.status === "PUBLISHED" && v.publishedAt && v.publishedAt > new Date(Date.now() - 7 * 86400000)
  ).length;
  const failedCount = variants.filter((v) => v.status === "FAILED").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timeline"
        description="Tot ce se publică, pe toate platformele, dintr-o privire."
        actions={
          <Link
            href="/dashboard/compose"
            className="rounded-xl bg-signal hover:bg-signal-bright active:scale-[0.98] transition-all duration-150 shadow-floating text-white text-sm font-medium px-4 py-2.5"
          >
            + Postare nouă
          </Link>
        }
      />

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
