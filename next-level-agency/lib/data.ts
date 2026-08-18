// -----------------------------------------------------------------------------
// Tot conținutul site-ului este definit aici. Nu există panou de admin -
// editezi direct valorile de mai jos și modificările apar automat pe site.
// -----------------------------------------------------------------------------

export const siteConfig = {
  name: "NEXT LEVEL",
  tagline: "ADVERTISING AGENCY",
  phone: "+40 725 456 789",
  email: "contact@nextlevelagency.ro",
  address: "Zalău, Sălaj, România",
  // Numărul de WhatsApp în format internațional, FĂRĂ + și fără spații.
  // Exemplu: dacă numărul e +40 725 456 789 -> "40725456789"
  whatsappNumber: "40725456789",
  whatsappMessage: "Salut! Vreau să discutăm despre un proiect.",
  socials: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    linkedin: "https://linkedin.com/",
    tiktok: "https://tiktok.com/",
  },
};

export const stats = [
  { value: "250+", label: "Proiecte finalizate" },
  { value: "98%", label: "Clienți mulțumiți" },
  { value: "12M+", label: "Bugete gestionate" },
  { value: "4.9★", label: "Rating Google" },
];

export const trustedBy = [
  "Google", "Meta", "TikTok", "Shopify", "Stripe", "YouTube",
];

export type Service = {
  icon: "target" | "chart" | "code" | "bot" | "search";
  title: string;
  description: string;
};

export const services: Service[] = [
  {
    icon: "target",
    title: "Branding & Identity",
    description: "Creăm identități vizuale puternice care te diferențiază de concurență.",
  },
  {
    icon: "chart",
    title: "Performance Marketing",
    description: "Campanii profitabile pe Facebook, Google, TikTok și alte platforme.",
  },
  {
    icon: "code",
    title: "Web Design & Development",
    description: "Site-uri moderne, rapide și optimizate pentru conversii.",
  },
  {
    icon: "bot",
    title: "AI & Marketing Automation",
    description: "Automatizări inteligente care îți economisesc timp și cresc vânzările.",
  },
  {
    icon: "search",
    title: "SEO & Content Marketing",
    description: "Strategii SEO și content care aduc trafic și conversii constante.",
  },
];

export const resultsStats = [
  { value: "+420%", label: "Creștere medie a veniturilor" },
  { value: "12M+", label: "Bugete gestionate în ads" },
  { value: "300+", label: "Clienți din diverse industrii" },
  { value: "98%", label: "Rata de retenție a clienților" },
];

export type PortfolioItem = {
  title: string;
  category: string;
  result: string;
  resultLabel: string;
  // Culoare de fundal folosită ca placeholder până înlocuiești cu o poză reală
  accent: string;
};

export const portfolio: PortfolioItem[] = [
  {
    title: "Luxury Car Dealer",
    category: "Automotive",
    result: "+420%",
    resultLabel: "Leads",
    accent: "from-slate-700 to-slate-900",
  },
  {
    title: "Restaurant Chain",
    category: "Horeca",
    result: "+280%",
    resultLabel: "Vânzări",
    accent: "from-amber-900 to-stone-900",
  },
  {
    title: "Real Estate Agency",
    category: "Real Estate",
    result: "+510%",
    resultLabel: "Conversii",
    accent: "from-indigo-950 to-slate-900",
  },
];

export const process = [
  { step: "01", title: "Discovery", description: "Analizăm afacerea ta și identificăm oportunitățile." },
  { step: "02", title: "Strategy", description: "Creăm strategia personalizată pentru obiectivele tale." },
  { step: "03", title: "Execution", description: "Implementăm campaniile și proiectele la cele mai înalte standarde." },
  { step: "04", title: "Optimization", description: "Optimizăm continuu pentru performanță maximă." },
  { step: "05", title: "Growth", description: "Scalăm rezultatele și creșterea sustenabilă a afacerii tale." },
];

export const testimonials = [
  {
    quote: "Next Level ne-a ajutat să ne dublăm veniturile în doar 3 luni. Profesioniști, implicați și mereu cu un pas înainte.",
    name: "Alex Pop",
    role: "CEO - AutoLux",
  },
  {
    quote: "Echipa lor este extraordinară. Campaniile aduc rezultate constante, iar comunicarea este impecabilă.",
    name: "Mihai Ionescu",
    role: "Founder - FoodHub",
  },
  {
    quote: "Site-ul realizat de Next Level arată incredibil și convertește excelent. Recomand cu toată încrederea!",
    name: "Andrei M.",
    role: "Owner - Urban Suites",
  },
];

// -----------------------------------------------------------------------------
// SECȚIUNEA "OUR CLIENTS" — adaugă / elimină parteneri direct aici.
// name       -> numele brandului (apare sub logo)
// logo       -> calea către fișierul logo din /public/clients (pune-l acolo)
// url        -> site-ul brandului (click pe card deschide acest link)
// -----------------------------------------------------------------------------
export type Client = {
  name: string;
  logo: string;
  url: string;
};

export const clients: Client[] = [
  { name: "AutoLux Motors", logo: "/clients/placeholder-1.svg", url: "https://example.com" },
  { name: "FoodHub", logo: "/clients/placeholder-2.svg", url: "https://example.com" },
  { name: "Urban Suites", logo: "/clients/placeholder-3.svg", url: "https://example.com" },
  { name: "Coastal Realty", logo: "/clients/placeholder-4.svg", url: "https://example.com" },
  { name: "Prime Fitness", logo: "/clients/placeholder-5.svg", url: "https://example.com" },
  { name: "Nova Dental", logo: "/clients/placeholder-6.svg", url: "https://example.com" },
];
