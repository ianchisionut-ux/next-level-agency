// -----------------------------------------------------------------------------
// Sistem de punctaj -> estimare de preț pentru chestionarele "Oferte Web".
//
// Punctajul reflectă dificultatea de implementare (integrări, conținut,
// design custom, multi-limbă etc.), nu doar numărul de pagini. Intervalele
// de preț sunt calibrate pe piața din România, 2026:
// Grila de bază este calibrată comercial cu -40% înainte de afișare și ofertare.
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

// Calibrare comercială Next Level: estimările afișate reprezintă 60% din
// grila inițială (reducere de 40%), fără a schimba încadrarea proiectului.
const ESTIMATE_CALIBRATION = 0.6;

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
  projectRequirements?: unknown;
};

function fmtLei(n: number) {
  return new Intl.NumberFormat("ro-RO").format(Math.round(n / 50) * 50);
}

function calibratedMoney(value: number) {
  return Math.round((value * ESTIMATE_CALIBRATION) / 50) * 50;
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

  const requirements = b.projectRequirements && typeof b.projectRequirements === "object" && !Array.isArray(b.projectRequirements)
    ? b.projectRequirements as Record<string, unknown>
    : {};
  const reqArray = (key: string) => Array.isArray(requirements[key]) ? (requirements[key] as unknown[]).filter((value): value is string => typeof value === "string") : [];
  const reqText = (key: string) => typeof requirements[key] === "string" ? requirements[key] as string : "";
  const projectTypes = reqArray("projectTypes");
  const businessModels = reqArray("businessModels");

  // ---- Tipul proiectului și comerț ----
  const isEcommerce = (b.ctaGoals || []).includes("Să cumpere online") || projectTypes.some((type) => /Magazin|Marketplace|comenzi online/i.test(type)) || businessModels.some((model) => /Vânzare|Abonamente|Comision/i.test(model));
  if (isEcommerce) score += add("Vânzare online (magazin/plăți)", 25);
  const typeWeights: Array<[RegExp, string, number]> = [
    [/SaaS|aplicație web/i, "Platformă SaaS / aplicație web", 42],
    [/Marketplace/i, "Marketplace multi-vânzător", 38],
    [/Portal|intranet/i, "Portal privat / intranet", 20],
    [/Cursuri|e-learning/i, "Platformă e-learning", 20],
    [/Director|listări|Imobiliare/i, "Listări și căutare avansată", 16],
    [/Rezervări|programări/i, "Rezervări și disponibilitate", 10],
    [/Restaurant|comenzi online/i, "Comenzi online pentru restaurant", 14],
    [/Evenimente|bilete/i, "Evenimente și ticketing", 16],
    [/Publicație|comunitate/i, "Publicație / comunitate", 10],
    [/Alt proiect/i, "Cerințe de proiect personalizat", 20],
  ];
  for (const [pattern, label, points] of typeWeights) if (projectTypes.some((type) => pattern.test(type))) score += add(label, points);
  const platformFeatures = reqArray("platformFeatures");
  const integrations = reqArray("integrations").filter((item) => item !== "Nicio integrare cunoscută");
  const commerceOperations = reqArray("commerceOperations");
  const paymentMethods = reqArray("paymentMethods");
  if (platformFeatures.length) score += add(`${platformFeatures.length} funcții avansate de platformă`, Math.min(40, platformFeatures.length * 2));
  if (integrations.length) score += add(`${integrations.length} integrări externe`, Math.min(24, integrations.length * 2));
  if (commerceOperations.length) score += add(`${commerceOperations.length} fluxuri comerciale`, Math.min(26, commerceOperations.length * 2));
  if (paymentMethods.length > 1) score += add("Metode multiple de plată", Math.min(8, paymentMethods.length));
  if (reqText("accountNeeds") && reqText("accountNeeds") !== "Nu, totul este public") score += add("Conturi și acces privat", 8 + Math.min(10, reqArray("userRoles").length * 2));
  if (reqText("dataMigration") && reqText("dataMigration") !== "Nu există date de importat") score += add("Migrare de date", 6);
  if (reqText("customRequirements")) score += add("Flux personalizat descris de client", 8);

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

  if (score >= 90) {
    tier = "Platformă digitală complexă";
    tierDescription = "Aplicație web, marketplace sau portal cu roluri și integrări — necesită analiză și arhitectură dedicată.";
    priceMin = 45000;
    priceMax = 100000;
  } else if (score >= 65) {
    tier = "Aplicație web / proiect custom";
    tierDescription = "Funcții avansate, conturi, automatizări ori integrări multiple — dezvoltare personalizată în etape.";
    priceMin = 30000;
    priceMax = 60000;
  } else if (isEcommerce || score >= 50) {
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
    score: Number((score * ESTIMATE_CALIBRATION).toFixed(1)),
    tier,
    tierDescription,
    priceMin: calibratedMoney(priceMin),
    priceMax: calibratedMoney(priceMax),
    recurringMin: calibratedMoney(recurringMin),
    recurringMax: calibratedMoney(recurringMax),
    isEcommerce,
    factors: factors.map((factor) => ({
      ...factor,
      points: Number((factor.points * ESTIMATE_CALIBRATION).toFixed(1)),
    })),
  };
}
