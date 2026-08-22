import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { Composer } from "@/app/components/composer/composer";
import { PageHeader } from "@/app/components/ui/page-header";
import { PlatformKey } from "@/lib/platform-meta";
import { computeBestTimeToPost, fetchEngagementByVariant } from "@/lib/best-time";

export const dynamic = "force-dynamic";

// Top hashtag-uri, pe baza performantei reale (aceeasi logica ca la Analytics) -
// sugestiile nu sunt "AI", sunt pur si simplu ce a functionat deja pentru tine.
async function loadSuggestedHashtags(workspaceId: string): Promise<string[]> {
  try {
    const publishedVariants = await prisma.postVariant.findMany({
      where: { status: "PUBLISHED", post: { workspaceId } },
      select: { id: true, hashtags: true },
    });
    const insights = await prisma.platformInsight.findMany({
      where: { variantId: { in: publishedVariants.map((v) => v.id) } },
      select: { variantId: true, likes: true, comments: true, shares: true, saves: true },
    });
    const engagementByVariant = new Map<string, number>();
    for (const i of insights) {
      const prev = engagementByVariant.get(i.variantId) ?? 0;
      engagementByVariant.set(i.variantId, prev + i.likes + i.comments + i.shares + i.saves);
    }
    const hashtagScores = new Map<string, number>();
    for (const v of publishedVariants) {
      const engagement = engagementByVariant.get(v.id) ?? 0;
      for (const tag of v.hashtags) {
        hashtagScores.set(tag, (hashtagScores.get(tag) ?? 0) + engagement);
      }
    }
    return Array.from(hashtagScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  } catch {
    return []; // fara date inca - componenta trateaza gratios o lista goala
  }
}

// Top cuvinte cheie din Google Search Console, ca inspiratie pentru text.
async function loadSuggestedKeywords(workspaceId: string): Promise<string[]> {
  try {
    const latest = await prisma.keywordSnapshot.findFirst({
      where: { workspaceId },
      orderBy: { capturedAt: "desc" },
    });
    if (!latest) return [];
    const rows = await prisma.keywordSnapshot.findMany({
      where: { workspaceId, capturedAt: latest.capturedAt },
      orderBy: { clicks: "desc" },
      take: 8,
    });
    return rows.map((r) => r.keyword);
  } catch {
    return [];
  }
}

async function loadBestTimeHint(workspaceId: string): Promise<string | null> {
  const engagementByVariant = await fetchEngagementByVariant(workspaceId);
  const bestTimeSlots = await computeBestTimeToPost(workspaceId, engagementByVariant);
  const bestTime = bestTimeSlots[0] ?? null;
  return bestTime ? `${bestTime.dayLabel}, ${String(bestTime.hour).padStart(2, "0")}:00` : null;
}

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const { campaignId } = await searchParams;
  const workspace = await getActiveWorkspace();
  const workspaceId = workspace!.id;

  // Cele 4 seturi de date de mai jos sunt complet independente unul de
  // altul - inainte rulau unul dupa altul (accounts -> hashtags -> keywords
  // -> best-time -> campanie), adaugand de 4-5 ori latenta de retea catre
  // baza de date pe fiecare incarcare a paginii de compunere.
  const [accounts, suggestedHashtags, suggestedKeywords, bestTimeHint, campaign] = await Promise.all([
    prisma.connectedAccount.findMany({ where: { workspaceId, isActive: true } }),
    loadSuggestedHashtags(workspaceId),
    loadSuggestedKeywords(workspaceId),
    loadBestTimeHint(workspaceId),
    campaignId
      ? prisma.campaign.findFirst({ where: { id: campaignId, workspaceId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Postare nouă"
        description="Scrie o dată, publică peste tot — sau ajustează per platformă."
      />

      <Composer
        workspaceId={workspaceId}
        accounts={accounts.map((a) => ({
          id: a.id,
          platform: a.platform as PlatformKey,
          accountName: a.accountName,
        }))}
        suggestedHashtags={suggestedHashtags}
        suggestedKeywords={suggestedKeywords}
        bestTimeHint={bestTimeHint}
        campaignId={campaignId ?? null}
        campaignName={campaign?.name ?? null}
      />
    </div>
  );
}
