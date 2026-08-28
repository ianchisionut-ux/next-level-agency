export type WebOfferItem = {
  id: string;
  description: string;
  details: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type WebOfferData = {
  offerNumber: string;
  offerDate: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  customerEmail: string;
  projectTitle: string;
  items: WebOfferItem[];
  vatRate: number;
  validity: string;
  deliveryTerm: string;
  paymentTerms: string;
  projectSummary: string;
  included: string[];
  notes: string;
  contractNumber: string;
  contractDate: string;
  customerCui: string;
  customerRegCom: string;
  customerAddress: string;
  customerRepresentative: string;
};

export type WebsiteBriefOfferSource = {
  id: string;
  companyName: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  activity?: string | null;
  pages?: string[];
  pagesOther?: string | null;
  visualStyle?: string | null;
  launchDate?: string | null;
  budget?: string | null;
  createdAt?: Date | string;
};

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asAmount(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function splitPrice(total: number) {
  const strategy = Math.round((total * 0.15) / 50) * 50;
  const launch = Math.round((total * 0.15) / 50) * 50;
  return { strategy, build: Math.max(0, total - strategy - launch), launch };
}

export function makeWebOfferNumber(brief: Pick<WebsiteBriefOfferSource, "id" | "createdAt">) {
  const created = brief.createdAt ? new Date(brief.createdAt) : new Date();
  return `NLA-${created.getFullYear()}-${brief.id.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}`;
}

export function defaultWebOffer(
  brief: WebsiteBriefOfferSource,
  estimate: { priceMin: number; tier: string },
): WebOfferData {
  const created = brief.createdAt ? new Date(brief.createdAt) : new Date();
  const date = Number.isNaN(created.getTime()) ? new Date() : created;
  const prices = splitPrice(estimate.priceMin);
  const pages = [...(brief.pages || []), ...(brief.pagesOther ? [brief.pagesOther] : [])];

  return {
    offerNumber: makeWebOfferNumber(brief),
    offerDate: date.toISOString().slice(0, 10),
    customerName: brief.contactName,
    customerCompany: brief.companyName,
    customerPhone: brief.contactPhone || "",
    customerEmail: brief.contactEmail || "",
    projectTitle: estimate.tier,
    items: [
      { id: "strategy", description: "Strategie, UX și arhitectură de conținut", details: "Workshop, structură, trasee de conversie și wireframe", quantity: 1, unit: "pachet", unitPrice: prices.strategy },
      { id: "website", description: "Design & dezvoltare website", details: pages.length ? `${pages.length} pagini: ${pages.join(", ")}` : "Design personalizat, responsive, implementare completă", quantity: 1, unit: "proiect", unitPrice: prices.build },
      { id: "launch", description: "Optimizare și lansare", details: "SEO tehnic, performanță, analytics, testare și publicare", quantity: 1, unit: "pachet", unitPrice: prices.launch },
    ],
    vatRate: 21,
    validity: "15 zile calendaristice",
    deliveryTerm: brief.launchDate || "4–6 săptămâni de la confirmarea proiectului",
    paymentTerms: "40% avans · 30% după aprobarea designului · 30% la lansare",
    projectSummary: brief.activity || `Website pentru ${brief.companyName}, construit pentru prezentare clară și conversii.`,
    included: [
      "Design responsive pentru desktop, tabletă și mobil",
      "Două runde de feedback pentru direcția vizuală",
      "Configurare SEO tehnic și Google Analytics",
      "Testare, publicare și instruire la predare",
    ],
    notes: brief.visualStyle ? `Direcție vizuală solicitată: ${brief.visualStyle}.` : "",
    contractNumber: makeWebOfferNumber(brief).replace(/^NLA-/, "CTR-"),
    contractDate: date.toISOString().slice(0, 10),
    customerCui: "",
    customerRegCom: "",
    customerAddress: "",
    customerRepresentative: brief.contactName,
  };
}

function normalizeItems(value: unknown, fallback: WebOfferItem[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.slice(0, 30).map((item, index) => {
    const input = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: asText(input.id, `item-${index + 1}`),
      description: asText(input.description, "Serviciu"),
      details: asText(input.details),
      quantity: Math.max(0, asAmount(input.quantity, 1)),
      unit: asText(input.unit, "buc."),
      unitPrice: asAmount(input.unitPrice),
    };
  });
  return items.length ? items : fallback;
}

export function normalizeWebOffer(
  value: unknown,
  brief: WebsiteBriefOfferSource,
  estimate: { priceMin: number; tier: string },
): WebOfferData {
  const defaults = defaultWebOffer(brief, estimate);
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const included = Array.isArray(input.included)
    ? input.included.filter((item): item is string => typeof item === "string").slice(0, 20)
    : defaults.included;

  return {
    offerNumber: asText(input.offerNumber, defaults.offerNumber),
    offerDate: asText(input.offerDate, defaults.offerDate),
    customerName: asText(input.customerName, defaults.customerName),
    customerCompany: asText(input.customerCompany, defaults.customerCompany),
    customerPhone: asText(input.customerPhone, defaults.customerPhone),
    customerEmail: asText(input.customerEmail, defaults.customerEmail),
    projectTitle: asText(input.projectTitle, defaults.projectTitle),
    items: normalizeItems(input.items, defaults.items),
    vatRate: Math.min(100, asAmount(input.vatRate, defaults.vatRate)),
    validity: asText(input.validity, defaults.validity),
    deliveryTerm: asText(input.deliveryTerm, defaults.deliveryTerm),
    paymentTerms: asText(input.paymentTerms, defaults.paymentTerms),
    projectSummary: asText(input.projectSummary, defaults.projectSummary),
    included,
    notes: asText(input.notes),
    contractNumber: asText(input.contractNumber, defaults.contractNumber),
    contractDate: asText(input.contractDate, defaults.contractDate),
    customerCui: asText(input.customerCui),
    customerRegCom: asText(input.customerRegCom),
    customerAddress: asText(input.customerAddress),
    customerRepresentative: asText(input.customerRepresentative, defaults.customerRepresentative),
  };
}

export function webOfferTotals(data: WebOfferData) {
  const net = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = net * data.vatRate / 100;
  return { net, vat, gross: net + vat };
}

export function formatLei(value: number) {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", minimumFractionDigits: 2 }).format(value);
}
