// -----------------------------------------------------------------------------
// Tot conținutul site-ului este definit aici. Nu există panou de admin -
// editezi direct valorile de mai jos și modificările apar automat pe site.
// -----------------------------------------------------------------------------

export const siteConfig = {
  name: "NEXT LEVEL",
  tagline: "ADVERTISING AGENCY",
  phone: "+40 740 565 663",
  email: "nextlevel.zalau@gmail.com",
  address: "Zalău, Sălaj, România",
  // Numărul de WhatsApp în format internațional, FĂRĂ + și fără spații.
  whatsappNumber: "40740565663",
  whatsappMessage: "Salut! Vreau să discutăm despre un proiect.",
  socials: {
    facebook: "https://www.facebook.com/profile.php?id=61589619395595",
    instagram: "https://www.instagram.com/nextlevel.zalau/",
    // TikTok încă nu are link - las gol până e gata contul.
    // Odată ce ai link-ul, îl pui aici și iconița devine automat clickabilă.
    tiktok: "",
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

export const differentiators = [
  {
    step: "01",
    title: "Rezultate, nu promisiuni",
    description:
      "Fiecare campanie e urmărită pe cifre reale. Dacă ceva nu performează, optimizăm rapid sau oprim — nu ținem bugetul degeaba.",
  },
  {
    step: "02",
    title: "Transparență totală",
    description:
      "Acces direct la echipa care lucrează pe brandul tău, rapoarte clare, fără termeni ascunși sau contracte pe termen lung.",
  },
  {
    step: "03",
    title: "Parteneri de creștere, nu furnizori",
    description:
      "Nu bifăm task-uri — construim strategia ca și cum afacerea ar fi a noastră, cu focus pe creștere sustenabilă.",
  },
];

export const process = [
  { step: "01", icon: "discovery", title: "Discovery", description: "Analizăm afacerea ta și identificăm oportunitățile." },
  { step: "02", icon: "strategy", title: "Strategy", description: "Creăm strategia personalizată pentru obiectivele tale." },
  { step: "03", icon: "execution", title: "Execution", description: "Implementăm campaniile și proiectele la cele mai înalte standarde." },
  { step: "04", icon: "optimization", title: "Optimization", description: "Optimizăm continuu pentru performanță maximă." },
  { step: "05", icon: "growth", title: "Growth", description: "Scalăm rezultatele și creșterea sustenabilă a afacerii tale." },
] as const;

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
  {
    name: "Ceramic & Stone Evolutione",
    logo: "/clients/ceramic-stone-evolutione.png",
    url: "https://www.facebook.com/profile.php?id=100044975814310",
  },
  {
    name: "Casa Romană",
    logo: "/clients/casa-romana.png",
    url: "https://www.facebook.com/casaromanaporolissum/",
  },
];
