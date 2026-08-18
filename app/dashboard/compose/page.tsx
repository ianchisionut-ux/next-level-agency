import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { Composer } from "@/app/components/composer/composer";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const workspace = await getActiveWorkspace();
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId: workspace!.id, isActive: true },
  });

  // Top hashtag-uri, pe baza performantei reale (aceeasi logica ca la Analytics) -
  // sugestiile nu sunt "AI", sunt pur si simplu ce a functionat deja pentru tine.
  let suggestedHashtags: string[] = [];
  try {
    const publishedVariants = await prisma.postVariant.findMany({
      where: { status: "PUBLISHED", post: { workspaceId: workspace!.id } },
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
    suggestedHashtags = Array.from(hashtagScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  } catch {
    // fara date inca - ramane lista goala, componenta trateaza gratios
  }

  // Top cuvinte cheie din Google Search Console, ca inspiratie pentru text.
  let suggestedKeywords: string[] = [];
  try {
    const latest = await prisma.keywordSnapshot.findFirst({
      where: { workspaceId: workspace!.id },
      orderBy: { capturedAt: "desc" },
    });
    if (latest) {
      const rows = await prisma.keywordSnapshot.findMany({
        where: { workspaceId: workspace!.id, capturedAt: latest.capturedAt },
        orderBy: { clicks: "desc" },
        take: 8,
      });
      suggestedKeywords = rows.map((r) => r.keyword);
    }
  } catch {
    // fara date inca
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Postare nouă</h1>
        <p className="text-sm text-mist-500 mt-1">
          Scrie o dată, publică peste tot — sau ajustează per platformă.
        </p>
      </header>

      <Composer
        workspaceId={workspace!.id}
        accounts={accounts.map((a) => ({
          id: a.id,
          platform: a.platform as PlatformKey,
          accountName: a.accountName,
        }))}
        suggestedHashtags={suggestedHashtags}
        suggestedKeywords={suggestedKeywords}
      />
    </div>
  );
}
