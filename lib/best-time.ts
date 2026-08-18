import { prisma } from "@/lib/prisma";

const DAY_LABELS = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

export type BestTimeSlot = {
  dayOfWeek: number; // 0-6, 0 = Duminica
  dayLabel: string;
  hour: number; // 0-23, ora locala Bucuresti
  avgEngagementRate: number;
  sampleSize: number;
};

/**
 * Analizează postările publicate + insight-urile lor reale și calculează
 * rata medie de interacțiune pe fiecare combinație (zi a săptămânii, oră).
 * 100% calculat din date deja colectate - fără niciun API extern nou.
 *
 * Returnează cele mai bune 5 sloturi, doar dintre cele cu minim 2 postări
 * (ca să nu recomandăm pe baza unui singur exemplu, nereprezentativ).
 */
export async function computeBestTimeToPost(workspaceId: string): Promise<BestTimeSlot[]> {
  const variants = await prisma.postVariant.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
      post: { workspaceId },
    },
    select: { id: true, publishedAt: true },
  });

  if (variants.length === 0) return [];

  const insights = await prisma.platformInsight.findMany({
    where: { variantId: { in: variants.map((v) => v.id) } },
    select: { variantId: true, impressions: true, likes: true, comments: true, shares: true, saves: true },
  });

  const engagementByVariant = new Map<string, { impressions: number; engagement: number }>();
  for (const i of insights) {
    const prev = engagementByVariant.get(i.variantId) ?? { impressions: 0, engagement: 0 };
    engagementByVariant.set(i.variantId, {
      impressions: prev.impressions + i.impressions,
      engagement: prev.engagement + i.likes + i.comments + i.shares + i.saves,
    });
  }

  // Grupam pe (ziuaSaptamanii, ora) - ora convertita la fusul orar local (Bucuresti)
  const buckets = new Map<string, { rateSum: number; count: number }>();

  for (const v of variants) {
    if (!v.publishedAt) continue;
    const stats = engagementByVariant.get(v.id);
    if (!stats || stats.impressions === 0) continue;

    const rate = (stats.engagement / stats.impressions) * 100;
    const localDate = new Date(v.publishedAt.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
    const key = `${localDate.getDay()}-${localDate.getHours()}`;

    const prev = buckets.get(key) ?? { rateSum: 0, count: 0 };
    buckets.set(key, { rateSum: prev.rateSum + rate, count: prev.count + 1 });
  }

  const slots: BestTimeSlot[] = Array.from(buckets.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([key, v]) => {
      const [day, hour] = key.split("-").map(Number);
      return {
        dayOfWeek: day,
        dayLabel: DAY_LABELS[day],
        hour,
        avgEngagementRate: Math.round((v.rateSum / v.count) * 10) / 10,
        sampleSize: v.count,
      };
    })
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 5);

  return slots;
}
