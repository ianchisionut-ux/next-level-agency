import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ciornă",
  SCHEDULED: "Programată",
  PUBLISHING: "Se publică",
  PUBLISHED: "Publicată",
  FAILED: "Eșuată",
  PARTIALLY_PUBLISHED: "Parțial publicată",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/login");

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.workspaceId !== workspace.id) notFound();

  const posts = await prisma.post.findMany({
    where: { campaignId: id },
    include: { variants: { include: { account: true, insights: true } } },
    orderBy: { createdAt: "desc" },
  });

  let totalEngagement = 0;
  let totalImpressions = 0;
  for (const post of posts) {
    for (const variant of post.variants) {
      for (const insight of variant.insights) {
        totalEngagement += insight.likes + insight.comments + insight.shares + insight.saves;
        totalImpressions += insight.impressions;
      }
    }
  }
  const progressPct = campaign.goal ? Math.min(100, Math.round((totalEngagement / campaign.goal) * 100)) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/campaigns" className="text-sm text-signal-bright hover:underline">
          ← Toate campaniile
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">{campaign.name}</h1>
            {campaign.description && <p className="text-sm text-mist-500 mt-1">{campaign.description}</p>}
            {(campaign.startDate || campaign.endDate) && (
              <p className="text-xs text-mist-500 mt-1">
                {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString("ro-RO") : "…"}
                {" – "}
                {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString("ro-RO") : "…"}
              </p>
            )}
          </div>
          <Link
            href={`/dashboard/compose?campaignId=${campaign.id}`}
            className="shrink-0 rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium px-4 py-2.5"
          >
            + Postare în campanie
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <p className="text-xs text-mist-500 uppercase tracking-wide">Postări</p>
          <p className="font-mono text-2xl font-semibold text-mist-100 mt-1">{posts.length}</p>
        </div>
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <p className="text-xs text-mist-500 uppercase tracking-wide">Afișări totale</p>
          <p className="font-mono text-2xl font-semibold text-mist-100 mt-1">
            {totalImpressions.toLocaleString("ro-RO")}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <p className="text-xs text-mist-500 uppercase tracking-wide">Interacțiuni totale</p>
          <p className="font-mono text-2xl font-semibold text-signal-bright mt-1">
            {totalEngagement.toLocaleString("ro-RO")}
          </p>
        </div>
      </div>

      {campaign.goal && (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-mist-300">Progres spre obiectiv</span>
            <span className="font-mono text-signal-bright">{progressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-ink-700 overflow-hidden">
            <div className="h-full rounded-full bg-signal" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-mist-500 mt-2">
            {totalEngagement.toLocaleString("ro-RO")} din {campaign.goal.toLocaleString("ro-RO")} interacțiuni
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-display font-semibold text-base">Postările din campanie</h2>
        </div>
        {posts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-mist-500">
            Nicio postare încă. Adaugă una din butonul „+ Postare în campanie" de mai sus.
          </p>
        ) : (
          <div className="divide-y divide-ink-700">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/dashboard/posts/${post.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-ink-900/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-1.5">
                    {post.variants.map((v) => (
                      <div
                        key={v.id}
                        className="h-6 w-6 rounded-full bg-ink-900 border border-ink-700 flex items-center justify-center"
                      >
                        <PlatformIcon platform={v.platform as PlatformKey} size={12} />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-mist-100 truncate">
                    {post.title || post.variants[0]?.content.slice(0, 60) || "(fără text)"}
                  </p>
                </div>
                <span className="shrink-0 ml-3 rounded-full bg-ink-700 px-2.5 py-1 text-[11px] text-mist-300">
                  {STATUS_LABELS[post.status] ?? post.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
