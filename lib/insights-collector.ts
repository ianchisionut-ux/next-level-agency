import { prisma } from "@/lib/prisma";
import { ensureFreshToken } from "@/lib/token-refresh";
import {
  getFacebookInsights,
  getInstagramInsights,
  getInstagramAudienceDemographics,
  getPostComments,
  getFacebookPageOverviewStats,
  getInstagramAccountOverviewStats,
} from "@/lib/publishers/meta";
import { classifyComments } from "@/lib/sentiment";
import { fetchSearchConsoleKeywords } from "@/lib/publishers/google-business";

/**
 * Preia statisticile de tip "Prezentare generala" (Vizualizari / Urmariri /
 * Vizite / Interactiuni) pentru fiecare cont Facebook/Instagram conectat si
 * activ, si salveaza un PageInsightSnapshot. Fiecare metrica se cere separat
 * (vezi getFacebookPageOverviewStats) - daca una lipseste, restul tot se
 * salveaza, nu pierdem tot din cauza uneia singure.
 */
export async function collectPageInsights() {
  const accounts = await prisma.connectedAccount.findMany({
    where: { isActive: true, platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
  });

  let saved = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const accessToken = await ensureFreshToken(account);
      const stats =
        account.platform === "FACEBOOK"
          ? await getFacebookPageOverviewStats(account.externalId, accessToken)
          : await getInstagramAccountOverviewStats(account.externalId, accessToken);

      await prisma.pageInsightSnapshot.create({
        data: {
          accountId: account.id,
          views: stats.views,
          follows: stats.follows,
          visits: stats.visits,
          interactions: stats.interactions,
          videoViews: stats.videoViews,
          unfollows: stats.unfollows,
          failedMetrics: stats.failedMetrics,
        },
      });
      saved++;
    } catch (err) {
      errors.push(`${account.id}: ${err instanceof Error ? err.message : "eroare necunoscuta"}`);
    }
  }

  return { saved, errors };
}

/**
 * Preia insights pentru toate variantele publicate in ultimele 30 de zile
 * si salveaza un nou PlatformInsight snapshot pentru fiecare.
 * Apelata dintr-un cron separat (o data pe zi e suficient).
 */
export async function collectInsights() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const variants = await prisma.postVariant.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: since },
      externalPostId: { not: null },
      platform: { in: ["FACEBOOK", "INSTAGRAM"] }, // TikTok/Google insights necesita alte permisiuni, adaugate cand sunt disponibile
    },
    include: { account: true },
  });

  let saved = 0;
  const errors: string[] = [];

  for (const variant of variants) {
    try {
      const accessToken = await ensureFreshToken(variant.account);
      const metrics = await fetchMetricsForVariant(variant.platform, variant.externalPostId!, accessToken);
      if (!metrics) continue;

      await prisma.platformInsight.create({
        data: {
          variantId: variant.id,
          accountId: variant.accountId,
          impressions: metrics.impressions,
          reach: metrics.reach,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          clicks: metrics.clicks,
          rawData: JSON.parse(JSON.stringify(metrics.raw)),
        },
      });
      saved++;
    } catch (err) {
      errors.push(`${variant.id}: ${err instanceof Error ? err.message : "eroare necunoscuta"}`);
    }
  }

  return { saved, errors };
}

/**
 * Preia comentariile reale de sub postările publicate (Facebook/Instagram)
 * din ultimele 30 de zile, le clasifică pozitiv/neutru/negativ prin
 * lib/sentiment.ts, și salvează un snapshot agregat PostSentiment.
 * Apelata din cronul zilnic, alaturi de collectInsights().
 */
export async function collectSentiment() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const variants = await prisma.postVariant.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: since },
      externalPostId: { not: null },
      platform: { in: ["FACEBOOK", "INSTAGRAM"] },
    },
    include: { account: true },
  });

  let saved = 0;
  const errors: string[] = [];

  for (const variant of variants) {
    try {
      const accessToken = await ensureFreshToken(variant.account);
      const comments = await getPostComments({ postId: variant.externalPostId!, accessToken });
      if (comments.length === 0) continue;

      const { positive, neutral, negative } = classifyComments(comments);

      await prisma.postSentiment.create({
        data: {
          variantId: variant.id,
          positiveCount: positive,
          neutralCount: neutral,
          negativeCount: negative,
        },
      });
      saved++;
    } catch (err) {
      errors.push(`${variant.id}: ${err instanceof Error ? err.message : "eroare necunoscuta"}`);
    }
  }

  return { saved, errors };
}

async function fetchMetricsForVariant(platform: string, externalId: string, accessToken: string) {
  if (platform === "FACEBOOK") {
    const data = await getFacebookInsights({ postId: externalId, accessToken });
    const byName = Object.fromEntries(
      (data.data ?? []).map((m: any) => [m.name, m.values?.[0]?.value ?? 0])
    );
    return {
      impressions: byName.post_media_view ?? 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: byName.post_clicks ?? 0,
      raw: data,
    };
  }

  if (platform === "INSTAGRAM") {
    const data = await getInstagramInsights({ mediaId: externalId, accessToken });
    const byName = Object.fromEntries(
      (data.data ?? []).map((m: any) => [m.name, m.values?.[0]?.value ?? 0])
    );
    return {
      impressions: byName.views ?? 0,
      reach: byName.reach ?? 0,
      likes: byName.likes ?? 0,
      comments: byName.comments ?? 0,
      shares: byName.shares ?? 0,
      saves: byName.saved ?? 0,
      clicks: 0,
      raw: data,
    };
  }

  return null;
}

/**
 * Preia cuvintele cheie din Search Console pentru fiecare cont Google Business
 * conectat (folosind domeniul asociat, configurat separat) si salveaza un
 * KeywordSnapshot pentru fiecare. Necesita GOOGLE_SEARCH_CONSOLE_SITE_URL in env
 * momentan (un singur site global) - pentru multi-site, extinde ConnectedAccount
 * cu un camp siteUrl dedicat.
 */
export async function collectKeywordSnapshots(workspaceId: string) {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) return { saved: 0, skipped: "GOOGLE_SEARCH_CONSOLE_SITE_URL nu e configurat" };

  const account = await prisma.connectedAccount.findFirst({
    where: { workspaceId, platform: "GOOGLE_BUSINESS", isActive: true },
  });
  if (!account) return { saved: 0, skipped: "Niciun cont Google conectat" };

  const accessToken = await ensureFreshToken(account);

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const data = await fetchSearchConsoleKeywords({ siteUrl, accessToken, startDate, endDate });

  let saved = 0;
  for (const row of data.rows ?? []) {
    await prisma.keywordSnapshot.create({
      data: {
        workspaceId,
        keyword: row.keys[0],
        source: "google_search_console",
        impressions: Math.round(row.impressions ?? 0),
        clicks: Math.round(row.clicks ?? 0),
        position: row.position ?? null,
      },
    });
    saved++;
  }

  return { saved };
}

/**
 * Preia demografia audienței (vârstă, gen, țară, oraș) pentru toate conturile
 * Instagram Business conectate ale unui workspace, și salvează un nou set de
 * snapshot-uri AudienceDemographic. Apelata din același cron zilnic ca
 * collectInsights().
 */
export async function collectAudienceDemographics(workspaceId: string) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId, platform: "INSTAGRAM", isActive: true },
  });

  let saved = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const accessToken = await ensureFreshToken(account);
      const breakdowns = await getInstagramAudienceDemographics({
        igUserId: account.externalId,
        accessToken,
      });

      if (breakdowns.length === 0) continue;

      await prisma.audienceDemographic.createMany({
        data: breakdowns.map((b) => ({
          accountId: account.id,
          dimension: b.dimension,
          label: b.label,
          percentage: b.percentage,
        })),
      });
      saved += breakdowns.length;
    } catch (err) {
      errors.push(`${account.id}: ${err instanceof Error ? err.message : "eroare necunoscuta"}`);
    }
  }

  return { saved, errors };
}
