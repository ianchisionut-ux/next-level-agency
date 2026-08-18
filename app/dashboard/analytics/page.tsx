import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { EngagementChart, ChannelShareDonut } from "@/app/components/analytics/charts";
import { ExportReportButton } from "@/app/components/analytics/export-report-button";
import { GoalProgress } from "@/app/components/analytics/goal-progress";
import { ProfessionalAnalysis } from "@/app/components/analytics/professional-analysis";
import { generateProfessionalAnalysis } from "@/lib/insights-engine";
import { computeBestTimeToPost } from "@/lib/best-time";
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

  // Perioada anterioara (30-60 zile in urma), pentru indicatorii de tendinta
  // (% fata de perioada precedenta) - la fel ca sagetile din referinte.
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const previousInsights = await prisma.platformInsight.findMany({
    where: {
      account: { workspaceId: workspace!.id },
      fetchedAt: { gte: previousPeriodStart, lt: periodStart },
    },
  });
  const prevImpressions = previousInsights.reduce((sum, i) => sum + i.impressions, 0);
  const prevEngagement = previousInsights.reduce((sum, i) => sum + i.likes + i.comments + i.shares + i.saves, 0);
  const prevClicks = previousInsights.reduce((sum, i) => sum + i.clicks, 0);

  function trend(current: number, previous: number): { value: string; positive: boolean } | undefined {
    if (previous === 0) return undefined;
    const change = ((current - previous) / previous) * 100;
    return { value: `${Math.abs(Math.round(change))}%`, positive: change >= 0 };
  }

  const [postsThisPeriod, postsPrevPeriod] = await Promise.all([
    prisma.postVariant.count({
      where: { status: "PUBLISHED", publishedAt: { gte: periodStart }, post: { workspaceId: workspace!.id } },
    }),
    prisma.postVariant.count({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: previousPeriodStart, lt: periodStart },
        post: { workspaceId: workspace!.id },
      },
    }),
  ]);

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
  const engagementRatePrev =
    prevImpressions > 0 ? (prevEngagement / prevImpressions) * 100 : 0;

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

  // Etichetă automată de performanță, pe baza ratei reale de interacțiune -
  // acelasi principiu ca badge-urile VIRAL/TOP ROI/STEADY din referințe.
  function performanceBadge(engRate: number): { label: string; color: string } | null {
    if (engRate >= 8) return { label: "VIRAL", color: "bg-state-error/10 text-state-error" };
    if (engRate >= 5) return { label: "TOP ENG", color: "bg-signal-soft text-signal-bright" };
    if (engRate >= 2) return { label: "STEADY", color: "bg-state-success/10 text-state-success" };
    return null;
  }

  const topPosts = topVariantIds
    .map((id) => {
      const variant = topVariants.find((v) => v.id === id);
      const stats = byVariant.get(id)!;
      if (!variant) return null;
      const engRateNum = stats.impressions > 0 ? (stats.engagement / stats.impressions) * 100 : 0;
      const engRate = engRateNum.toFixed(1);
      return {
        id,
        title: variant.post.title || variant.content.slice(0, 50) || "(fără titlu)",
        platform: stats.platform,
        impressions: stats.impressions,
        engagementRate: engRate,
        clicks: stats.clicks,
        badge: performanceBadge(engRateNum),
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

  // Demografie audienta (varsta + oras) - date reale din Meta Graph API, colectate
  // zilnic prin cron. Izolat in try/catch: daca tabelul lipseste sau apare orice alta
  // eroare, afisam pur si simplu fara aceasta sectiune, in loc sa cadă toata pagina.
  let ageDemographics: Awaited<ReturnType<typeof prisma.audienceDemographic.findMany>> = [];
  let cityDemographics: Awaited<ReturnType<typeof prisma.audienceDemographic.findMany>> = [];
  try {
    const [latestAge, latestCity] = await Promise.all([
      prisma.audienceDemographic.findFirst({
        where: { account: { workspaceId: workspace!.id }, dimension: "age" },
        orderBy: { capturedAt: "desc" },
      }),
      prisma.audienceDemographic.findFirst({
        where: { account: { workspaceId: workspace!.id }, dimension: "city" },
        orderBy: { capturedAt: "desc" },
      }),
    ]);

    if (latestAge) {
      ageDemographics = await prisma.audienceDemographic.findMany({
        where: {
          account: { workspaceId: workspace!.id },
          dimension: "age",
          capturedAt: latestAge.capturedAt,
        },
        orderBy: { percentage: "desc" },
      });
    }

    if (latestCity) {
      cityDemographics = await prisma.audienceDemographic.findMany({
        where: {
          account: { workspaceId: workspace!.id },
          dimension: "city",
          capturedAt: latestCity.capturedAt,
        },
        orderBy: { percentage: "desc" },
        take: 5,
      });
    }
  } catch (err) {
    console.error("Nu am putut incarca demografia audientei:", err);
  }

  // Sentiment & Buzz - agregam toate snapshot-urile de sentiment din ultimele
  // 30 de zile pentru variantele acestui workspace. Izolat in try/catch, la
  // fel ca demografia.
  let sentimentTotals = { positive: 0, neutral: 0, negative: 0 };
  try {
    const workspaceVariantIds = await prisma.postVariant.findMany({
      where: { post: { workspaceId: workspace!.id } },
      select: { id: true },
    });
    const idSet = new Set(workspaceVariantIds.map((v) => v.id));

    const sentimentRows = await prisma.postSentiment.findMany({
      where: { variantId: { in: Array.from(idSet) } },
    });

    for (const row of sentimentRows) {
      sentimentTotals.positive += row.positiveCount;
      sentimentTotals.neutral += row.neutralCount;
      sentimentTotals.negative += row.negativeCount;
    }
  } catch (err) {
    console.error("Nu am putut incarca sentimentul:", err);
  }
  const sentimentTotal = sentimentTotals.positive + sentimentTotals.neutral + sentimentTotals.negative;
  const sentimentPct = {
    positive: sentimentTotal > 0 ? Math.round((sentimentTotals.positive / sentimentTotal) * 100) : 0,
    neutral: sentimentTotal > 0 ? Math.round((sentimentTotals.neutral / sentimentTotal) * 100) : 0,
    negative: sentimentTotal > 0 ? Math.round((sentimentTotals.negative / sentimentTotal) * 100) : 0,
  };

  const hasData = insights.length > 0;

  const bestTimeSlots = await computeBestTimeToPost(workspace!.id);

  const now = new Date();
  const daysLeftInMonth =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  const dominantAgeGroup = ageDemographics[0]
    ? { label: ageDemographics[0].label, percentage: ageDemographics[0].percentage }
    : undefined;

  const professionalInsights = hasData
    ? generateProfessionalAnalysis({
        engagementRate: parseFloat(engagementRate),
        engagementRatePrev,
        totalImpressions,
        prevImpressions,
        platformTotals,
        platformLabels: Object.fromEntries(
          Object.entries(PLATFORM_META).map(([key, meta]) => [key, meta.label])
        ),
        postsThisPeriod,
        postsPrevPeriod,
        topHashtag: topHashtags[0] ? { tag: topHashtags[0][0], engagement: topHashtags[0][1] } : undefined,
        sentimentPct,
        sentimentTotal,
        dominantAgeGroup,
        viralityScore,
        goal: workspace!.monthlyEngagementGoal ?? null,
        currentEngagement: totalEngagement,
        daysLeftInMonth,
      })
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Analiză</h1>
          <p className="text-sm text-mist-500 mt-1">Performanță agregată pe toate platformele conectate.</p>
        </div>
        <div className="flex items-center gap-3">
          <GoalProgress
            workspaceId={workspace!.id}
            goal={workspace!.monthlyEngagementGoal ?? null}
            currentEngagement={totalEngagement}
          />
          <ExportReportButton rows={exportRows} filename="top-postari-signal.csv" />
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Afișări totale"
          value={totalImpressions.toLocaleString("ro-RO")}
          icon={<StatIconEye />}
          trend={trend(totalImpressions, prevImpressions)}
        />
        <StatCard
          label="Interacțiuni"
          value={totalEngagement.toLocaleString("ro-RO")}
          accent="success"
          icon={<StatIconCheck />}
          trend={trend(totalEngagement, prevEngagement)}
        />
        <StatCard
          label="Click-uri"
          value={totalClicks.toLocaleString("ro-RO")}
          icon={<StatIconCursor />}
          trend={trend(totalClicks, prevClicks)}
        />
        <StatCard
          label="Rată de interacțiune"
          value={`${engagementRate}%`}
          accent="signal"
          icon={<StatIconPercent />}
          trend={trend(parseFloat(engagementRate), engagementRatePrev)}
        />
      </div>

      {hasData && <ProfessionalAnalysis insights={professionalInsights} />}

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
                  <th className="px-5 py-3 font-medium"></th>
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
                    <td className="px-5 py-3">
                      {p.badge && (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${p.badge.color}`}>
                          {p.badge.label}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(topHashtags.length > 0 || topPosts.length > 0) && (
            <div className="grid grid-cols-3 gap-4">
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

              <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
                <h2 className="font-display font-semibold text-sm mb-1">Sentiment & Buzz</h2>
                <p className="text-xs text-mist-500 mb-4">
                  Din comentariile reale de sub postări
                </p>
                {sentimentTotal === 0 ? (
                  <p className="text-sm text-mist-500">
                    Încă nu sunt destule comentarii clasificate. Apare automat după colectarea zilnică.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-mist-300">Positive</span>
                        <span className="font-mono text-state-success">{sentimentPct.positive}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                        <div className="h-full bg-state-success" style={{ width: `${sentimentPct.positive}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-mist-300">Neutral</span>
                        <span className="font-mono text-mist-500">{sentimentPct.neutral}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                        <div className="h-full bg-mist-500" style={{ width: `${sentimentPct.neutral}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-mist-300">Negative</span>
                        <span className="font-mono text-state-error">{sentimentPct.negative}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                        <div className="h-full bg-state-error" style={{ width: `${sentimentPct.negative}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-mist-500 uppercase tracking-wide mb-2">Virality Index Score</p>
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#3B66F6"
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

          {bestTimeSlots.length > 0 && (
            <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm mb-1">Cel mai bun moment de postat</h2>
              <p className="text-xs text-mist-500 mb-4">
                Calculat din rata reală de interacțiune a postărilor tale anterioare, pe zi și oră
              </p>
              <div className="grid grid-cols-5 gap-3">
                {bestTimeSlots.map((slot, idx) => (
                  <div
                    key={`${slot.dayOfWeek}-${slot.hour}`}
                    className={`rounded-xl border p-3 text-center ${
                      idx === 0 ? "border-signal bg-signal-soft" : "border-ink-700"
                    }`}
                  >
                    {idx === 0 && (
                      <p className="text-[10px] font-semibold text-signal-bright uppercase tracking-wide mb-1">
                        Cel mai bun
                      </p>
                    )}
                    <p className="text-sm font-semibold text-mist-100">{slot.dayLabel}</p>
                    <p className="font-mono text-lg text-mist-100 mt-1">{String(slot.hour).padStart(2, "0")}:00</p>
                    <p className="text-xs text-mist-500 mt-1">{slot.avgEngagementRate}% interacțiune</p>
                    <p className="text-[10px] text-mist-700 mt-0.5">{slot.sampleSize} postări</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(ageDemographics.length > 0 || cityDemographics.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
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

              {cityDemographics.length > 0 && (
                <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
                  <h2 className="font-display font-semibold text-sm mb-1">Target Match & Metro Penetration</h2>
                  <p className="text-xs text-mist-500 mb-4">Top orașe, din Instagram — actualizat zilnic</p>
                  <div className="space-y-3">
                    {(() => {
                      // Index = cota unui oraș relativ la media aritmetică a
                      // tuturor orașelor din top - 100 = exact media, peste
                      // 100 = suprareprezentat, sub 100 = subreprezentat.
                      // Același principiu ca "Index 142" din referință.
                      const avgShare =
                        cityDemographics.reduce((sum, d) => sum + d.percentage, 0) / cityDemographics.length;
                      return cityDemographics.map((d, idx) => {
                        const index = avgShare > 0 ? Math.round((d.percentage / avgShare) * 100) : 100;
                        return (
                          <div key={d.label} className="flex items-center gap-3">
                            <span className="w-5 shrink-0 font-mono text-xs text-mist-500">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="flex-1 text-sm text-mist-300 truncate">{d.label}</span>
                            <span className="w-12 shrink-0 text-right font-mono text-sm text-mist-100">
                              {d.percentage}%
                            </span>
                            <span
                              className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-mono font-semibold ${
                                index >= 120
                                  ? "bg-state-success/10 text-state-success"
                                  : index <= 80
                                    ? "bg-mist-500/10 text-mist-500"
                                    : "bg-signal-soft text-signal-bright"
                              }`}
                            >
                              Index {index}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
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
