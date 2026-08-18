import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { EngagementChart, ChannelShareDonut } from "@/app/components/analytics/charts";
import { ExportReportButton } from "@/app/components/analytics/export-report-button";
import { StatCard, StatIconEye, StatIconCheck, StatIconCursor, StatIconPercent } from "@/app/components/ui/stat-card";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/login");

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

  // Top postări — agregăm afișările/interacțiunile per variantă și le sortăm descrescător.
  const byVariant = new Map<
    string,
    { impressions: number; engagement: number; clicks: number; platform: PlatformKey }
  >();
  for (const i of insights) {
    const prev = byVariant.get(i.variantId) ?? {
      impressions: 0,
      engagement: 0,
      clicks: 0,
      platform: i.account.platform as PlatformKey,
    };
    byVariant.set(i.variantId, {
      impressions: prev.impressions + i.impressions,
      engagement: prev.engagement + i.likes + i.comments + i.shares + i.saves,
      clicks: prev.clicks + i.clicks,
      platform: prev.platform,
    });
  }

  const topVariantIds = Array.from(byVariant.entries())
    .sort((a, b) => b[1].engagement - a[1].engagement)
    .slice(0, 5)
    .map(([id]) => id);

  const topVariants =
    topVariantIds.length > 0
      ? await prisma.postVariant.findMany({
          where: { id: { in: topVariantIds } },
          include: { post: true },
        })
      : [];

  const topPosts = topVariantIds
    .map((id) => {
      const variant = topVariants.find((v) => v.id === id);
      const stats = byVariant.get(id)!;
      if (!variant) return null;
      const engRate = stats.impressions > 0 ? ((stats.engagement / stats.impressions) * 100).toFixed(1) : "0";
      return {
        id,
        title: variant.post.title || variant.content.slice(0, 50) || "(fără titlu)",
        platform: stats.platform,
        impressions: stats.impressions,
        engagementRate: engRate,
        clicks: stats.clicks,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const exportRows = topPosts.map((p, idx) => ({
    Loc: idx + 1,
    Postare: p.title,
    Platformă: PLATFORM_META[p.platform].label,
    Afișări: p.impressions,
    "Rată interacțiune (%)": p.engagementRate,
    "Click-uri": p.clicks,
  }));

  // Hashtag-uri urmărite — agregăm din hashtags-urile reale folosite pe variantele
  // publicate, ponderate cu interacțiunile reale acumulate de fiecare variantă.
  const publishedVariants = await prisma.postVariant.findMany({
    where: { status: "PUBLISHED", post: { workspaceId: workspace!.id } },
    select: { id: true, hashtags: true },
  });
  const hashtagStats = new Map<string, number>();
  for (const v of publishedVariants) {
    const engagement = byVariant.get(v.id)?.engagement ?? 0;
    for (const tag of v.hashtags) {
      hashtagStats.set(tag, (hashtagStats.get(tag) ?? 0) + engagement);
    }
  }
  const topHashtags = Array.from(hashtagStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Virality Index — scor compus 0-100: rată de interacțiune (0-60 pct) +
  // reach relativ față de cea mai bună postare (0-40 pct). Pur calculat din
  // datele existente, fără integrare suplimentară.
  const maxImpressions = Math.max(1, ...Array.from(byVariant.values()).map((v) => v.impressions));
  const bestEngRate =
    topPosts.length > 0 ? Math.min(100, parseFloat(topPosts[0].engagementRate) * 6) : 0;
  const bestReachShare = topPosts.length > 0 ? (byVariant.get(topPosts[0].id)!.impressions / maxImpressions) * 40 : 0;
  const viralityScore = Math.round(Math.min(100, bestEngRate + bestReachShare));

  // Demografie audienta (varsta) - date reale din Meta Graph API, colectate
  // zilnic prin cron. Luam cea mai recenta captura per cont, agregata.
  // Izolat in try/catch: daca tabelul lipseste sau apare orice alta eroare,
  // afisam pur si simplu fara aceasta sectiune, in loc sa cadă toata pagina.
  let ageDemographics: Awaited<ReturnType<typeof prisma.audienceDemographic.findMany>> = [];
  try {
    const latestDemoCapture = await prisma.audienceDemographic.findFirst({
      where: { account: { workspaceId: workspace!.id }, dimension: "age" },
      orderBy: { capturedAt: "desc" },
    });
    if (latestDemoCapture) {
      ageDemographics = await prisma.audienceDemographic.findMany({
        where: {
          account: { workspaceId: workspace!.id },
          dimension: "age",
          capturedAt: latestDemoCapture.capturedAt,
        },
        orderBy: { percentage: "desc" },
      });
    }
  } catch (err) {
    console.error("Nu am putut incarca demografia audientei:", err);
  }

  const hasData = insights.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Analiză</h1>
          <p className="text-sm text-mist-500 mt-1">Performanță agregată pe toate platformele conectate.</p>
        </div>
        <ExportReportButton rows={exportRows} filename="top-postari-signal.csv" />
      </header>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Afișări totale" value={totalImpressions.toLocaleString("ro-RO")} icon={<StatIconEye />} />
        <StatCard label="Interacțiuni" value={totalEngagement.toLocaleString("ro-RO")} accent="success" icon={<StatIconCheck />} />
        <StatCard label="Click-uri" value={totalClicks.toLocaleString("ro-RO")} icon={<StatIconCursor />} />
        <StatCard label="Rată de interacțiune" value={`${engagementRate}%`} accent="signal" icon={<StatIconPercent />} />
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 p-10 text-center">
          <p className="text-mist-300">Încă nu ai date de analiză.</p>
          <p className="text-xs text-mist-500 mt-1">
            Datele apar automat după ce primele postări publicate acumulează afișări și interacțiuni.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm mb-4">Evoluție în timp</h2>
              <EngagementChart data={engagementSeries} />
            </div>
            <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm mb-4">Distribuție pe canale</h2>
              <ChannelShareDonut data={platformTotals} />
            </div>
          </div>

          <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card">
            <div className="px-5 py-4 border-b border-ink-700">
              <h2 className="font-display font-semibold text-base">Top postări</h2>
              <p className="text-xs text-mist-500 mt-0.5">Ordonate după interacțiuni totale</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-mist-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium w-10">#</th>
                  <th className="px-5 py-3 font-medium">Postare</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Afișări</th>
                  <th className="px-5 py-3 font-medium">Rată interacțiune</th>
                  <th className="px-5 py-3 font-medium">Click-uri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {topPosts.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-mono text-mist-500">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-3 font-medium truncate max-w-xs">{p.title}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <PlatformIcon platform={p.platform} size={14} />
                        <span className="text-mist-300 text-xs">{PLATFORM_META[p.platform].short}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-mist-300">{p.impressions.toLocaleString("ro-RO")}</td>
                    <td className="px-5 py-3 font-mono text-state-success">{p.engagementRate}%</td>
                    <td className="px-5 py-3 font-mono text-mist-300">{p.clicks.toLocaleString("ro-RO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(topHashtags.length > 0 || topPosts.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
                <h2 className="font-display font-semibold text-sm mb-1">Hashtag-uri urmărite</h2>
                <p className="text-xs text-mist-500 mb-4">Ordonate după interacțiunile generate</p>
                {topHashtags.length === 0 ? (
                  <p className="text-sm text-mist-500">Niciun hashtag folosit încă în postările publicate.</p>
                ) : (
                  <div className="space-y-2.5">
                    {topHashtags.map(([tag, engagement]) => (
                      <div key={tag} className="flex items-center justify-between text-sm">
                        <span className="text-signal-bright font-medium">#{tag}</span>
                        <span className="font-mono text-mist-500">{engagement.toLocaleString("ro-RO")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-mist-500 uppercase tracking-wide mb-2">Virality Index Score</p>
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#2A2F3B" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#4F7CFF"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(viralityScore / 100) * 264} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-2xl font-semibold text-mist-100">{viralityScore}</span>
                  </div>
                </div>
                <p className="text-xs text-mist-500 mt-3">
                  Pe baza celei mai bune postări: rată de interacțiune + acoperire relativă
                </p>
              </div>
            </div>
          )}

          {ageDemographics.length > 0 && (
            <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm mb-1">Demografia audienței</h2>
              <p className="text-xs text-mist-500 mb-4">
                Distribuție pe vârstă, din Instagram — actualizată zilnic
              </p>
              <div className="space-y-3">
                {ageDemographics.map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm text-mist-300">{d.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-ink-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-signal"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-mono text-sm text-mist-100">
                      {d.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
