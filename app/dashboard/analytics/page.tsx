import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { EngagementChart, ChannelShareDonut } from "@/app/components/analytics/charts";
import { ExportReportButton } from "@/app/components/analytics/export-report-button";
import { GoalProgress } from "@/app/components/analytics/goal-progress";
import { ProfessionalAnalysis } from "@/app/components/analytics/professional-analysis";
import { generateProfessionalAnalysis } from "@/lib/insights-engine";
import { computeBestTimeToPost } from "@/lib/best-time";
import { PageHeader } from "@/app/components/ui/page-header";
import { StatCard, StatIconEye, StatIconCheck, StatIconCursor, StatIconPercent } from "@/app/components/ui/stat-card";
import { StatCardChart } from "@/app/components/analytics/stat-card-chart";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/login");

  // Perioada anterioara (30-60 zile in urma), pentru indicatorii de tendinta
  // (% fata de perioada precedenta) - la fel ca sagetile din referinte.
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  // Cele 5 interogari de mai jos sunt independente una de alta - inainte
  // rulau (majoritatea) pe rand, adaugand latenta de retea de fiecare data.
  // Rulate in paralel, timpul total scade la cel al celei mai lente, nu la
  // suma tuturor.
  const [insights, previousInsights, postsThisPeriod, postsPrevPeriod, keywords, pageSnapshots] = await Promise.all([
    prisma.platformInsight.findMany({
      where: { account: { workspaceId: workspace!.id } },
      include: { account: true },
      orderBy: { fetchedAt: "asc" },
      take: 500,
    }),
    prisma.platformInsight.findMany({
      where: {
        account: { workspaceId: workspace!.id },
        fetchedAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
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
    prisma.keywordSnapshot.findMany({
      where: { workspaceId: workspace!.id },
      orderBy: { capturedAt: "desc" },
      take: 20,
    }),
    // Cel mai recent instantaneu per cont (Vizualizari/Urmariri/Vizite/
    // Interactiuni) - echivalentul "Prezentare generala" din Meta Business Suite.
    prisma.pageInsightSnapshot.findMany({
      where: { account: { workspaceId: workspace!.id } },
      include: { account: true },
      orderBy: { capturedAt: "desc" },
      take: 50,
    }),
  ]);

  // Ultimul instantaneu per cont (findMany a adus mai multe, pastram doar
  // cel mai recent din fiecare, ca in Meta Business Suite - "acum").
  const latestPageSnapshotByAccount = new Map<string, (typeof pageSnapshots)[number]>();
  for (const s of pageSnapshots) {
    if (!latestPageSnapshotByAccount.has(s.accountId)) latestPageSnapshotByAccount.set(s.accountId, s);
  }
  const pageStatsCards = Array.from(latestPageSnapshotByAccount.values());

  const prevImpressions = previousInsights.reduce((sum, i) => sum + i.impressions, 0);
  const prevEngagement = previousInsights.reduce((sum, i) => sum + i.likes + i.comments + i.shares + i.saves, 0);
  const prevClicks = previousInsights.reduce((sum, i) => sum + i.clicks, 0);

  function trend(current: number, previous: number): { value: string; positive: boolean } | undefined {
    if (previous === 0) return undefined;
    const change = ((current - previous) / previous) * 100;
    return { value: `${Math.abs(Math.round(change))}%`, positive: change >= 0 };
  }

  const totalImpressions = insights.reduce((sum, i) => sum + i.impressions, 0);
  const totalEngagement = insights.reduce((sum, i) => sum + i.likes + i.comments + i.shares + i.saves, 0);
  const totalClicks = insights.reduce((sum, i) => sum + i.clicks, 0);
  const engagementRate =
    totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : "0";
  const engagementRatePrev =
    prevImpressions > 0 ? (prevEngagement / prevImpressions) * 100 : 0;

  // Social Performance Score - un singur numar (0-100), gen "executive
  // summary", combinand: nivelul ratei de interacțiune (0-50pct),
  // tendința față de perioada anterioară (0-30pct), și consistența de
  // postare (0-20pct, cate zile din perioada au avut cel puțin o postare).
  const engRateScore = Math.min(50, parseFloat(engagementRate) * 6.25);
  const growthScore =
    engagementRatePrev > 0
      ? Math.min(30, Math.max(0, ((parseFloat(engagementRate) - engagementRatePrev) / engagementRatePrev) * 100 + 15))
      : 15;
  const activeDays = new Set(insights.map((i) => i.fetchedAt.toDateString())).size;
  const consistencyScore = Math.min(20, activeDays * 0.7);
  const socialScore = Math.round(engRateScore + growthScore + consistencyScore);

  const byDate = new Map<string, { impressions: number; engagement: number; clicks: number }>();
  for (const i of insights) {
    const key = i.fetchedAt.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
    const prev = byDate.get(key) ?? { impressions: 0, engagement: 0, clicks: 0 };
    byDate.set(key, {
      impressions: prev.impressions + i.impressions,
      engagement: prev.engagement + i.likes + i.comments + i.shares + i.saves,
      clicks: prev.clicks + i.clicks,
    });
  }
  const engagementSeries = Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v }));
  const sparklineData = engagementSeries.map((d) => ({
    date: d.date,
    impressions: d.impressions,
    engagement: d.engagement,
    clicks: d.clicks,
    engagementRate: d.impressions > 0 ? (d.engagement / d.impressions) * 100 : 0,
  }));

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

  // Toate interogarile de mai jos sunt independente una de alta (niciuna nu
  // are nevoie de rezultatul celeilalte) - inainte rulau una dupa alta,
  // adaugand de 5 ori latenta de retea catre baza de date. Rulate in
  // paralel, timpul total scade la cel al celei mai lente, nu la suma lor.
  const [topVariants, allPublishedVariants, sentimentRowsResult, latestAge, latestCity, bestTimeSlots] = await Promise.all([
    topVariantIds.length > 0
      ? prisma.postVariant.findMany({
          where: { id: { in: topVariantIds } },
          include: { post: true },
        })
      : Promise.resolve([]),
    // Toate campurile necesare pentru format + hashtag-uri intr-o singura
    // interogare (in loc de doua separate, identice ca WHERE).
    prisma.postVariant.findMany({
      where: { status: "PUBLISHED", post: { workspaceId: workspace!.id } },
      select: { id: true, mediaUrls: true, contentTags: true, hashtags: true },
    }),
    prisma.postSentiment
      .findMany({ where: { variant: { post: { workspaceId: workspace!.id } } } })
      .catch((err) => {
        console.error("Nu am putut incarca sentimentul:", err);
        return [];
      }),
    prisma.audienceDemographic
      .findFirst({ where: { account: { workspaceId: workspace!.id }, dimension: "age" }, orderBy: { capturedAt: "desc" } })
      .catch(() => null),
    prisma.audienceDemographic
      .findFirst({ where: { account: { workspaceId: workspace!.id }, dimension: "city" }, orderBy: { capturedAt: "desc" } })
      .catch(() => null),
    // Nu depinde de nimic din batch-ul asta (doar de "insights", deja adus mai
    // sus) - inainte rula separat, dupa tot restul paginii, adaugand inca o
    // calatorie dus-intors in plus.
    computeBestTimeToPost(workspace!.id, byVariant),
  ]);

  // Performanță pe FORMAT de conținut (Video/Reel, Carusel, Foto, Doar text) -
  // dedusă automat din mediaUrls, fără câmp nou in schema. Inspirat din
  // "Reels vs. Stories, carousels vs. photos" (Hootsuite).
  function inferFormat(mediaUrls: string[]): string {
    if (mediaUrls.length === 0) return "Doar text";
    if (mediaUrls.length > 1) return "Carusel";
    if (/\.(mp4|mov|m4v)(\?|$)/i.test(mediaUrls[0])) return "Video / Reel";
    return "Foto";
  }

  const byFormat = new Map<string, { engagement: number; count: number }>();
  const byContentTag = new Map<string, { engagement: number; count: number }>();
  for (const v of allPublishedVariants) {
    const stats = byVariant.get(v.id);
    const engagement = stats?.engagement ?? 0;
    const format = inferFormat(v.mediaUrls);
    const prevFormat = byFormat.get(format) ?? { engagement: 0, count: 0 };
    byFormat.set(format, { engagement: prevFormat.engagement + engagement, count: prevFormat.count + 1 });

    for (const tag of v.contentTags) {
      const prevTag = byContentTag.get(tag) ?? { engagement: 0, count: 0 };
      byContentTag.set(tag, { engagement: prevTag.engagement + engagement, count: prevTag.count + 1 });
    }
  }
  const formatBreakdown = Array.from(byFormat.entries())
    .map(([format, v]) => ({
      format,
      avgEngagement: v.count > 0 ? Math.round(v.engagement / v.count) : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const contentTagBreakdown = Array.from(byContentTag.entries())
    .map(([tag, v]) => ({
      tag,
      avgEngagement: v.count > 0 ? Math.round(v.engagement / v.count) : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

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
  // Refolosim allPublishedVariants (mai sus), fara alta interogare noua.
  const hashtagStats = new Map<string, number>();
  for (const v of allPublishedVariants) {
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
  // zilnic prin cron. latestAge/latestCity au fost deja aduse in batch-ul de mai
  // sus - acum mai facem un singur Promise.all (nu 2 secvential) pentru listele
  // complete, doar daca exista macar un snapshot de fiecare tip.
  let ageDemographics: Awaited<ReturnType<typeof prisma.audienceDemographic.findMany>> = [];
  let cityDemographics: Awaited<ReturnType<typeof prisma.audienceDemographic.findMany>> = [];
  try {
    const [ageRows, cityRows] = await Promise.all([
      latestAge
        ? prisma.audienceDemographic.findMany({
            where: { account: { workspaceId: workspace!.id }, dimension: "age", capturedAt: latestAge.capturedAt },
            orderBy: { percentage: "desc" },
          })
        : Promise.resolve([]),
      latestCity
        ? prisma.audienceDemographic.findMany({
            where: { account: { workspaceId: workspace!.id }, dimension: "city", capturedAt: latestCity.capturedAt },
            orderBy: { percentage: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);
    ageDemographics = ageRows;
    cityDemographics = cityRows;
  } catch (err) {
    console.error("Nu am putut incarca demografia audientei:", err);
  }

  // Sentiment & Buzz - agregam snapshot-urile deja aduse in batch-ul de mai sus.
  let sentimentTotals = { positive: 0, neutral: 0, negative: 0 };
  try {
    for (const row of sentimentRowsResult) {
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
      <PageHeader
        title="Analiză"
        description="Social Performance Score — rezumat executiv al ultimelor 30 de zile."
        leading={
          <div
            className={`glass-card flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 ${
              socialScore >= 70
                ? "border-state-success text-state-success"
                : socialScore >= 40
                  ? "border-signal text-signal-bright"
                  : "border-state-warning text-state-warning"
            }`}
          >
            <span className="font-mono text-xl font-bold">{socialScore}</span>
          </div>
        }
        actions={
          <>
            <GoalProgress
              workspaceId={workspace!.id}
              goal={workspace!.monthlyEngagementGoal ?? null}
              currentEngagement={totalEngagement}
            />
            <ExportReportButton rows={exportRows} filename="top-postari-signal.csv" />
            <a
              href={`/api/reports/monthly?workspaceId=${workspace!.id}`}
              className="rounded-xl border border-ink-600 hover:border-ink-500 active:scale-[0.98] transition-all duration-150 text-mist-100 text-sm font-medium px-4 py-2.5 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3h5l5 5v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              Raport PDF (30 zile)
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardChart
          label="Afișări totale"
          value={totalImpressions.toLocaleString("ro-RO")}
          icon={<StatIconEye />}
          trend={trend(totalImpressions, prevImpressions)}
          data={sparklineData}
          dataKey="impressions"
        />
        <StatCardChart
          label="Interacțiuni"
          value={totalEngagement.toLocaleString("ro-RO")}
          accent="success"
          icon={<StatIconCheck />}
          trend={trend(totalEngagement, prevEngagement)}
          data={sparklineData}
          dataKey="engagement"
        />
        <StatCardChart
          label="Click-uri"
          value={totalClicks.toLocaleString("ro-RO")}
          icon={<StatIconCursor />}
          trend={trend(totalClicks, prevClicks)}
          data={sparklineData}
          dataKey="clicks"
        />
        <StatCardChart
          label="Rată de interacțiune"
          value={`${engagementRate}%`}
          accent="signal"
          icon={<StatIconPercent />}
          trend={trend(parseFloat(engagementRate), engagementRatePrev)}
          data={sparklineData}
          dataKey="engagementRate"
        />
      </div>
      <p className="text-xs text-mist-500 -mt-2">
        Graficele mici arată evoluția zilnică din perioada afișată mai jos.
      </p>

      {pageStatsCards.length > 0 ? (
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <h2 className="font-display font-semibold text-base mb-1">Statistici pagină / cont</h2>
          <p className="text-xs text-mist-500 mb-4">
            Vizualizări, urmăriri, vizite și interacțiuni — la nivel de pagină, ultimele 28 de zile
            (echivalentul din Meta Business Suite).
          </p>
          <div className="space-y-5">
            {pageStatsCards.map((snap) => {
              const meta = PLATFORM_META[snap.account.platform as PlatformKey];
              const tiles: { label: string; value: number | null }[] = [
                { label: "Vizualizări", value: snap.views },
                { label: "Urmăriri", value: snap.follows },
                { label: "Vizite", value: snap.visits },
                { label: "Interacțiuni", value: snap.interactions },
                { label: "Vizionări video", value: snap.videoViews },
                { label: "Dezabonări", value: snap.unfollows },
              ].filter((t) => t.value !== null || ["Vizualizări", "Urmăriri", "Vizite", "Interacțiuni"].includes(t.label));
              return (
                <div key={snap.accountId}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <PlatformIcon platform={snap.account.platform as PlatformKey} size={16} />
                    <span className="text-sm font-medium">{snap.account.accountName}</span>
                    <span className="text-xs text-mist-500">· {meta.label}</span>
                    <span className="text-xs text-mist-700 ml-auto">
                      actualizat {new Date(snap.capturedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tiles.map((t) => (
                      <div key={t.label} className="rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-3">
                        <p className="text-xs text-mist-500">{t.label}</p>
                        <p className="font-mono text-lg font-semibold mt-0.5">
                          {t.value !== null ? t.value.toLocaleString("ro-RO") : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {snap.failedMetrics.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-mist-700">Indisponibile momentan la Meta:</p>
                      {snap.failedMetrics.map((m, i) => (
                        <p key={i} className="text-xs text-mist-700 font-mono pl-2">
                          · {m}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-800 p-6">
          <h2 className="font-display font-semibold text-base mb-1">Statistici pagină / cont</h2>
          <p className="text-sm text-mist-500">
            Încă nu există niciun instantaneu colectat. Aceste statistici se actualizează o dată pe
            zi, automat, printr-un cron separat de restul insight-urilor.
          </p>
          <p className="text-xs text-mist-700 mt-2">
            Dacă tocmai ai activat funcția asta, declanșează manual prima colectare — cronul
            zilnic obișnuit include acum și pasul acesta.
          </p>
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {(formatBreakdown.length > 0 || contentTagBreakdown.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formatBreakdown.length > 0 && (
                <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
                  <h2 className="font-display font-semibold text-sm mb-1">Performanță pe format</h2>
                  <p className="text-xs text-mist-500 mb-4">
                    Interacțiuni medii per postare, pe tip de conținut
                  </p>
                  <div className="space-y-2.5">
                    {formatBreakdown.map((f) => (
                      <div key={f.format} className="flex items-center justify-between text-sm">
                        <span className="text-mist-300">
                          {f.format} <span className="text-mist-700">({f.count})</span>
                        </span>
                        <span className="font-mono text-signal-bright">{f.avgEngagement.toLocaleString("ro-RO")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contentTagBreakdown.length > 0 && (
                <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
                  <h2 className="font-display font-semibold text-sm mb-1">Performanță pe categorie</h2>
                  <p className="text-xs text-mist-500 mb-4">
                    Interacțiuni medii per postare, pe eticheta de conținut aleasă la compose
                  </p>
                  <div className="space-y-2.5">
                    {contentTagBreakdown.map((t) => (
                      <div key={t.tag} className="flex items-center justify-between text-sm">
                        <span className="text-mist-300">
                          {t.tag} <span className="text-mist-700">({t.count})</span>
                        </span>
                        <span className="font-mono text-signal-bright">{t.avgEngagement.toLocaleString("ro-RO")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {bestTimeSlots.length > 0 && (
            <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm mb-1">Cel mai bun moment de postat</h2>
              <p className="text-xs text-mist-500 mb-4">
                Calculat din rata reală de interacțiune a postărilor tale anterioare, pe zi și oră
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
