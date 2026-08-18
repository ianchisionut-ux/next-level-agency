import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";
import { BrandMark } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function CampaignSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { shareToken: token } });
  if (!campaign) notFound();

  const posts = await prisma.post.findMany({
    where: { campaignId: campaign.id, status: "PUBLISHED" },
    include: { variants: { include: { account: true, insights: true } } },
    orderBy: { createdAt: "desc" },
  });

  let totalImpressions = 0;
  let totalEngagement = 0;
  const byPlatform = new Map<string, number>();
  const postScores: { title: string; platform: string; engagement: number; impressions: number }[] = [];

  for (const post of posts) {
    for (const variant of post.variants) {
      let variantEngagement = 0;
      let variantImpressions = 0;
      for (const insight of variant.insights) {
        variantEngagement += insight.likes + insight.comments + insight.shares + insight.saves;
        variantImpressions += insight.impressions;
      }
      totalEngagement += variantEngagement;
      totalImpressions += variantImpressions;
      byPlatform.set(variant.platform, (byPlatform.get(variant.platform) ?? 0) + variantEngagement);
      postScores.push({
        title: post.title || variant.content.slice(0, 60) || "(fără titlu)",
        platform: variant.platform,
        engagement: variantEngagement,
        impressions: variantImpressions,
      });
    }
  }

  const topPosts = postScores.sort((a, b) => b.engagement - a.engagement).slice(0, 5);
  const progressPct = campaign.goal ? Math.min(100, Math.round((totalEngagement / campaign.goal) * 100)) : null;

  return (
    <div className="min-h-screen bg-ink-900 text-mist-100 py-10 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="font-display font-semibold text-lg">Next Level — Raport de campanie</span>
        </div>

        <div>
          <h1 className="font-display text-3xl font-semibold">{campaign.name}</h1>
          {campaign.description && <p className="text-mist-300 mt-2">{campaign.description}</p>}
          {(campaign.startDate || campaign.endDate) && (
            <p className="text-sm text-mist-500 mt-1">
              {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString("ro-RO") : "…"}
              {" – "}
              {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString("ro-RO") : "…"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
            <p className="text-xs text-mist-500 uppercase tracking-wide">Postări publicate</p>
            <p className="font-mono text-2xl font-semibold mt-1">{posts.length}</p>
          </div>
          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
            <p className="text-xs text-mist-500 uppercase tracking-wide">Afișări totale</p>
            <p className="font-mono text-2xl font-semibold mt-1">{totalImpressions.toLocaleString("ro-RO")}</p>
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
          </div>
        )}

        {byPlatform.size > 0 && (
          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
            <h2 className="font-display font-semibold text-sm mb-4">Distribuție pe canale</h2>
            <div className="space-y-2.5">
              {Array.from(byPlatform.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([platform, engagement]) => (
                  <div key={platform} className="flex items-center gap-2.5 text-sm">
                    <PlatformIcon platform={platform as PlatformKey} size={14} />
                    <span className="text-mist-300">{PLATFORM_META[platform as PlatformKey]?.label ?? platform}</span>
                    <span className="ml-auto font-mono text-mist-500">{engagement.toLocaleString("ro-RO")}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {topPosts.length > 0 && (
          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
            <div className="px-5 py-4 border-b border-ink-700">
              <h2 className="font-display font-semibold text-base">Top postări</h2>
            </div>
            <div className="divide-y divide-ink-700">
              {topPosts.map((p, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-mist-500 w-5 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <PlatformIcon platform={p.platform as PlatformKey} size={14} />
                    <span className="text-sm truncate">{p.title}</span>
                  </div>
                  <span className="font-mono text-sm text-signal-bright shrink-0 ml-3">
                    {p.engagement.toLocaleString("ro-RO")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 p-10 text-center text-mist-500 text-sm">
            Nicio postare publicată încă în această campanie.
          </div>
        )}

        <p className="text-center text-xs text-mist-700 pt-4">
          Raport generat automat de Next Level Advertising Agency
        </p>
      </div>
    </div>
  );
}
