import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { EngagementChart, PlatformBarChart } from "@/app/components/analytics/charts";
import { StatCard } from "@/app/components/ui/stat-card";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workspace = await getActiveWorkspace();

  const insights = await prisma.platformInsight.findMany({
    where: { account: { workspaceId: workspace!.id } },
    include: { account: true },
    orderBy: { fetchedAt: "asc" },
    take: 500,
  });

  const keywords = await prisma.keywordSnapshot.findMany({
    where: { workspaceId: workspace!.id },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });

  const totalImpressions = insights.reduce((sum, i) => sum + i.impressions, 0);
  const totalEngagement = insights.reduce((sum, i) => sum + i.likes + i.comments + i.shares + i.saves, 0);
  const totalClicks = insights.reduce((sum, i) => sum + i.clicks, 0);
  const engagementRate =
    totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : "0";

  const byDate = new Map<string, { impressions: number; engagement: number }>();
  for (const i of insights) {
    const key = i.fetchedAt.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
    const prev = byDate.get(key) ?? { impressions: 0, engagement: 0 };
    byDate.set(key, {
      impressions: prev.impressions + i.impressions,
      engagement: prev.engagement + i.likes + i.comments + i.shares + i.saves,
    });
  }
  const engagementSeries = Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v }));

  const byPlatform = new Map<PlatformKey, { posts: Set<string>; engagement: number }>();
  for (const i of insights) {
    const platform = i.account.platform as PlatformKey;
    const prev = byPlatform.get(platform) ?? { posts: new Set(), engagement: 0 };
    prev.posts.add(i.variantId);
    prev.engagement += i.likes + i.comments + i.shares + i.saves;
    byPlatform.set(platform, prev);
  }
  const platformTotals = Array.from(byPlatform.entries()).map(([platform, v]) => ({
    platform,
    posts: v.posts.size,
    engagement: v.engagement,
  }));

  const hasData = insights.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Analiză</h1>
        <p className="text-sm text-mist-500 mt-1">Performanță agregată pe toate platformele conectate.</p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Afișări totale" value={totalImpressions.toLocaleString("ro-RO")} />
        <StatCard label="Interacțiuni" value={totalEngagement.toLocaleString("ro-RO")} accent="success" />
        <StatCard label="Click-uri" value={totalClicks.toLocaleString("ro-RO")} />
        <StatCard label="Rată de interacțiune" value={`${engagementRate}%`} accent="signal" />
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 p-10 text-center">
          <p className="text-mist-300">Încă nu ai date de analiză.</p>
          <p className="text-xs text-mist-500 mt-1">
            Datele apar automat după ce primele postări publicate acumulează afișări și interacțiuni.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
            <h2 className="font-display font-semibold text-sm mb-4">Evoluție în timp</h2>
            <EngagementChart data={engagementSeries} />
          </div>
          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
            <h2 className="font-display font-semibold text-sm mb-4">Interacțiuni per platformă</h2>
            <PlatformBarChart data={platformTotals} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-display font-semibold text-base">Cuvinte cheie urmărite</h2>
          <p className="text-xs text-mist-500 mt-0.5">Din Google Search Console</p>
        </div>
        {keywords.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-mist-500">
            Niciun cuvânt cheie urmărit încă. Conectează Google Search Console din Conturi conectate.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-mist-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Cuvânt cheie</th>
                <th className="px-5 py-3 font-medium">Afișări</th>
                <th className="px-5 py-3 font-medium">Click-uri</th>
                <th className="px-5 py-3 font-medium">Poziție medie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {keywords.map((k) => (
                <tr key={k.id}>
                  <td className="px-5 py-3 font-medium">{k.keyword}</td>
                  <td className="px-5 py-3 font-mono text-mist-300">{k.impressions ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-mist-300">{k.clicks ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-mist-300">
                    {k.position ? k.position.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
