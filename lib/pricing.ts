// -----------------------------------------------------------------------------
// Sistem de punctaj -> estimare de preț pentru chestionarele "Oferte Web".
//
// Punctajul reflectă dificultatea de implementare (integrări, conținut,
// design custom, multi-limbă etc.), nu doar numărul de pagini. Intervalele
// de preț sunt calibrate pe piața din România, 2026:
//   - site de prezentare simplu / landing:      2.500 - 4.500 lei
//   - site de prezentare standard (5-10 pagini): 4.500 - 8.000 lei
//   - site avansat (custom, integrări multiple): 8.000 - 14.000 lei
//   - proiect complex / multi-funcțional:       14.000 - 22.000 lei
//   - magazin online / proiect custom mare:      22.000 - 45.000 lei
//
// Aceste cifre sunt orientative - punctul de pornire pentru discuția cu
// clientul, nu o ofertă fermă.
// -----------------------------------------------------------------------------

export type ScoreFactor = {
  label: string;
  points: number;
};

export type BriefEstimate = {
  score: number;
  tier: string;
  tierDescription: string;
  priceMin: number;
  priceMax: number;
  recurringMin: number;
  recurringMax: number;
  isEcommerce: boolean;
  factors: ScoreFactor[];
};

// Subset minimal de câmpuri necesare pentru scoring (compatibil cu modelul Prisma WebsiteBrief).
export type ScorableBrief = {
  pages: string[];
  pagesOther?: string | null;
  ctaGoals: string[];
  brandIdentity?: string | null;
  hasContent?: string | null;
  visualStyle?: string | null;
  languages?: string | null;
  contactElements: string[];
  wantsTestimonials?: string | null;
  wantsSocialIntegration?: string | null;
  hasDomain?: string | null;
  hasHosting?: string | null;
  needsEmail?: string | null;
  wantsSSL?: string | null;
  maintenance?: string | null;
  wantsSocialManagement?: string | null;
};

function fmtLei(n: number) {
  return new Intl.NumberFormat("ro-RO").format(Math.round(n / 50) * 50);
}

export function formatPriceRange(min: number, max: number) {
  return `${fmtLei(min)} – ${fmtLei(max)} lei`;
}

export function estimateWebsiteBrief(b: ScorableBrief): BriefEstimate {
  const factors: ScoreFactor[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) factors.push({ label, points });
    return points;
  };

  let score = 8; // baza: domeniu de proiect, discovery, deploy, SEO minim
  factors.push({ label: "Bază proiect (discovery, deploy, SEO de bază)", points: 8 });

  // ---- Pagini ----
  const basicPages = ["Acasă", "Despre Noi", "Servicii", "Contact"];
  const pageCount = b.pages?.length || 0;
  for (const p of b.pages || []) {
    if (basicPages.includes(p)) score += add(`Pagină: ${p}`, 1);
    else if (p === "Portofoliu / Lucrări") score += add("Pagină: Portofoliu / Lucrări", 2);
    else if (p === "Blog / Articole") score += add("Pagină: Blog / Articole (necesită CMS)", 4);
  }
  if (b.pagesOther) score += add("Pagini custom suplimentare", 3);

  // ---- E-commerce (cel mai mare impact) ----
  const isEcommerce = (b.ctaGoals || []).includes("Să cumpere online");
  if (isEcommerce) score += add("Vânzare online (magazin/plăți)", 25);

  // ---- Branding ----
  if (b.brandIdentity === "Nu, avem nevoie de branding") score += add("Branding complet de la zero", 6);
  else if (b.brandIdentity === "Parțial (doar logo)") score += add("Branding parțial (identitate vizuală)", 3);

  // ---- Conținut ----
  if (b.hasContent === "Am nevoie de ajutor pentru creare") score += add("Copywriting + producție conținut", 5);
  else if (b.hasContent === "Am o parte din ele") score += add("Completare conținut parțial", 2);

  // ---- Design ----
  if (b.visualStyle === "Spectaculos, cu animații și efecte moderne")
    score += add("Design custom cu animații avansate", 6);

  // ---- Multi-limbă ----
  if (b.languages === "Română + altă limbă") score += add("Site multi-limbă (i18n)", 4);

  // ---- Integrări de contact ----
  for (const el of b.contactElements || []) {
    if (el === "Formular cerere ofertă") score += add("Formular cerere ofertă (multi-pas)", 2);
    else score += add(`Integrare: ${el}`, 1);
  }

  // ---- Testimoniale / social proof ----
  if (b.wantsTestimonials === "Da") score += add("Secțiune recenzii / testimoniale", 1);

  // ---- Integrare social media pe site ----
  if (b.wantsSocialIntegration === "Da") score += add("Integrare live cu social media (feed)", 3);

  // ---- Domeniu / hosting / email / SSL ----
  if (b.hasDomain === "Nu, doresc sprijin pentru alegere și achiziție") score += add("Achiziție & configurare domeniu", 1);
  if (b.hasHosting === "Nu, doresc ca găzduirea să fie inclusă în proiect") score += add("Configurare hosting + deploy", 2);
  if (b.needsEmail === "Da, am nevoie") score += add("Configurare e-mail profesional", 1);
  if (b.wantsSSL === "Da") score += add("SSL + monitorizare uptime", 1);

  // ---- Tier / preț ----
  let tier: string;
  let tierDescription: string;
  let priceMin: number;
  let priceMax: number;

  if (isEcommerce || score >= 50) {
    tier = "Magazin online / proiect custom";
    tierDescription = "Vânzare online sau proiect cu multe integrări — necesită arhitectură dedicată.";
    priceMin = 22000;
    priceMax = 45000;
  } else if (score >= 35) {
    tier = "Proiect complex";
    tierDescription = "Multe integrări și cerințe custom — dezvoltare dedicată, nu template.";
    priceMin = 14000;
    priceMax = 22000;
  } else if (score >= 25) {
    tier = "Site avansat";
    tierDescription = "Design custom + integrări suplimentare peste un site de prezentare standard.";
    priceMin = 8000;
    priceMax = 14000;
  } else if (score >= 15) {
    tier = "Site prezentare standard";
    tierDescription = "5-10 pagini, design custom, funcționalități uzuale.";
    priceMin = 4500;
    priceMax = 8000;
  } else {
    tier = "Landing / prezentare simplă";
    tierDescription = "Câteva pagini, structură simplă, fără integrări complexe.";
    priceMin = 2500;
    priceMax = 4500;
  }

  // Numărul mare de pagini de bază, chiar fără alte complicații, împinge oferta
  // spre partea de sus a intervalului tier-ului curent.
  if (pageCount >= 6 && priceMax - priceMin > 0) {
    priceMin = Math.round(priceMin + (priceMax - priceMin) * 0.15);
  }

  // ---- Costuri recurente (separat de dezvoltare) ----
  let recurringMin = 0;
  let recurringMax = 0;
  if (b.maintenance === "Pachet de mentenanță lunară") {
    recurringMin += 150;
    recurringMax += 400;
  }
  if (b.wantsSocialManagement === "Da" || b.wantsSocialManagement === "Poate, ulterior") {
    recurringMin += 800;
    recurringMax += 2500;
  }

  return {
    score,
    tier,
    tierDescription,
    priceMin,
    priceMax,
    recurringMin,
    recurringMax,
    isEcommerce,
    factors,
  };
}
