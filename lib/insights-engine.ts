/**
 * Motor de analiză "profesională", 100% pe bază de reguli (if/else + praguri),
 * fără niciun apel către un API de AI plătit. Sintetizează datele deja
 * colectate (impresii, interacțiuni, sentiment, demografie, hashtag-uri,
 * obiectiv) într-un rezumat executiv, în limbaj natural.
 *
 * Fiecare regulă e complet transparentă și explicabilă - nu e o "cutie
 * neagră", poți citi exact ce prag a declanșat fiecare observație.
 */

export type InsightSeverity = "positive" | "warning" | "info";

export type Insight = {
  severity: InsightSeverity;
  title: string;
  description: string;
};

export type PlatformTotal = { platform: string; engagement: number; posts: number };

export function generateProfessionalAnalysis(data: {
  engagementRate: number;
  engagementRatePrev: number;
  totalImpressions: number;
  prevImpressions: number;
  platformTotals: PlatformTotal[];
  platformLabels: Record<string, string>;
  postsThisPeriod: number;
  postsPrevPeriod: number;
  topHashtag?: { tag: string; engagement: number };
  sentimentPct: { positive: number; neutral: number; negative: number };
  sentimentTotal: number;
  dominantAgeGroup?: { label: string; percentage: number };
  viralityScore: number;
  goal: number | null;
  currentEngagement: number;
  daysLeftInMonth: number;
}): Insight[] {
  const insights: Insight[] = [];

  // 1. Rata de interacțiune - tendință
  if (data.engagementRatePrev > 0) {
    const change = ((data.engagementRate - data.engagementRatePrev) / data.engagementRatePrev) * 100;
    if (change >= 15) {
      insights.push({
        severity: "positive",
        title: "Rata de interacțiune e în creștere puternică",
        description: `Rata de interacțiune a crescut cu ${Math.round(change)}% față de perioada anterioară (${data.engagementRate.toFixed(1)}% acum, față de ${data.engagementRatePrev.toFixed(1)}%). Ce ai schimbat recent în conținut pare să funcționeze — merită continuat.`,
      });
    } else if (change <= -15) {
      insights.push({
        severity: "warning",
        title: "Rata de interacțiune a scăzut vizibil",
        description: `Rata de interacțiune a scăzut cu ${Math.round(Math.abs(change))}% față de perioada anterioară (${data.engagementRate.toFixed(1)}% acum, față de ${data.engagementRatePrev.toFixed(1)}%). Verifică dacă a scăzut frecvența postărilor sau dacă formatul de conținut s-a schimbat.`,
      });
    }
  }

  // 2. Platforma cu cea mai bună performanță
  if (data.platformTotals.length >= 2) {
    const sorted = [...data.platformTotals].sort((a, b) => b.engagement - a.engagement);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestShare = data.platformTotals.reduce((s, p) => s + p.engagement, 0);
    if (bestShare > 0) {
      const pct = Math.round((best.engagement / bestShare) * 100);
      if (pct >= 50) {
        insights.push({
          severity: "info",
          title: `${data.platformLabels[best.platform] ?? best.platform} generează majoritatea interacțiunilor`,
          description: `${data.platformLabels[best.platform] ?? best.platform} reprezintă ${pct}% din totalul interacțiunilor tale, semnificativ peste ${data.platformLabels[worst.platform] ?? worst.platform}. Ia în calcul realocarea efortului de creație spre platforma care aduce deja rezultate.`,
        });
      }
    }
  }

  // 3. Consistența postărilor
  if (data.postsPrevPeriod > 0) {
    const change = ((data.postsThisPeriod - data.postsPrevPeriod) / data.postsPrevPeriod) * 100;
    if (change <= -30) {
      insights.push({
        severity: "warning",
        title: "Frecvența de postare a scăzut",
        description: `Ai publicat cu ${Math.round(Math.abs(change))}% mai puține postări față de perioada anterioară (${data.postsThisPeriod} față de ${data.postsPrevPeriod}). Consistența contează pentru acoperire — algoritmii platformelor favorizează conturile active constant.`,
      });
    }
  } else if (data.postsThisPeriod === 0) {
    insights.push({
      severity: "warning",
      title: "Nicio postare publicată în ultima perioadă",
      description: "Programează câteva postări din Compose ca să înceapă să apară date de analiză.",
    });
  }

  // 4. Hashtag de top
  if (data.topHashtag) {
    insights.push({
      severity: "info",
      title: `#${data.topHashtag.tag} e hashtag-ul tău cu cea mai bună performanță`,
      description: `A generat ${data.topHashtag.engagement.toLocaleString("ro-RO")} interacțiuni, cel mai mult dintre toate hashtag-urile folosite. Ia în calcul să-l repeți la postările viitoare relevante.`,
    });
  }

  // 5. Sentiment
  if (data.sentimentTotal >= 5) {
    if (data.sentimentPct.negative >= 20) {
      insights.push({
        severity: "warning",
        title: "Procent ridicat de comentarii negative",
        description: `${data.sentimentPct.negative}% din comentariile clasificate sunt negative. Merită verificate manual — poate fi un semnal real de nemulțumire care necesită răspuns.`,
      });
    } else if (data.sentimentPct.positive >= 70) {
      insights.push({
        severity: "positive",
        title: "Audiența reacționează foarte pozitiv",
        description: `${data.sentimentPct.positive}% din comentariile clasificate sunt pozitive. Brandul are o percepție bună în rândul audienței active.`,
      });
    }
  }

  // 6. Demografie dominantă
  if (data.dominantAgeGroup && data.dominantAgeGroup.percentage >= 35) {
    insights.push({
      severity: "info",
      title: `Audiența ta e predominant ${data.dominantAgeGroup.label} ani`,
      description: `${data.dominantAgeGroup.percentage}% din audiență se încadrează în acest segment. Adaptează tonul și formatul de conținut (ex. Reels/TikTok pentru segmente tinere, conținut informativ pentru segmente mai mature).`,
    });
  }

  // 7. Virality score
  if (data.viralityScore >= 70) {
    insights.push({
      severity: "positive",
      title: "Ai avut cel puțin o postare cu potențial viral real",
      description: `Scorul de viralitate al celei mai bune postări e ${data.viralityScore}/100. Analizează ce a funcționat la ea (format, oră de postare, subiect) și încearcă să repeți tiparul.`,
    });
  }

  // 8. Obiectiv
  if (data.goal) {
    const pct = Math.round((data.currentEngagement / data.goal) * 100);
    if (pct >= 100) {
      insights.push({
        severity: "positive",
        title: "Obiectivul lunar a fost atins",
        description: `Ai ${pct}% din obiectivul de ${data.goal.toLocaleString("ro-RO")} interacțiuni, cu ${data.daysLeftInMonth} zile rămase din lună. Poate fi momentul să setezi un obiectiv mai ambițios.`,
      });
    } else if (data.daysLeftInMonth <= 7 && pct < 70) {
      insights.push({
        severity: "warning",
        title: "Obiectivul lunar riscă să nu fie atins",
        description: `Ești la ${pct}% din obiectiv, cu doar ${data.daysLeftInMonth} zile rămase din lună. Ia în calcul o campanie de conținut mai intensă în perioada rămasă.`,
      });
    }
  }

  return insights;
}
