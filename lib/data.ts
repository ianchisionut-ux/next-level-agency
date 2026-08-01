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
  { value: "10+", label: "Proiecte finalizate" },
  { value: "98%", label: "Clienți mulțumiți" },
  { value: "12K+", label: "Bugete gestionate" },
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
    description: `Creăm identități vizuale puternice care te diferențiază de concurență. Brandul tău este prima impresie pe care o lași în fața clienților și unul dintre cele mai valoroase active ale unei afaceri.`,
  },
  {
    icon: "chart",
    title: "Performance Marketing",
    description: `Campanii profitabile pe Facebook, Google, TikTok și alte platforme. Performanța nu se măsoară în aprecieri sau afișări, ci în rezultate concrete.`,
  },
  {
    icon: "code",
    title: "Web Design & Development",
    description: `Site-uri moderne, rapide și optimizate pentru conversii. Website-ul este centrul prezenței digitale a oricărei afaceri și, de cele mai multe ori, primul contact dintre brand și potențialii clienți.`,
  },
  {
    icon: "bot",
    title: "AI & Marketing Automation",
    description: `Automatizări inteligente care îți economisesc timp și cresc vânzările. Automatizarea reprezintă viitorul marketingului digital.`,
  },
  {
    icon: "search",
    title: "SEO & Content Marketing",
    description: `Strategii SEO și content care aduc trafic și conversii constante. Vizibilitatea în Google nu se obține întâmplător.`,
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
    name: "Hidrotechnika",
    logo: "/clients/ht.png",
    url: "https://irigatiiprofesionale.ro/",
  },
  {
    name: "Casa Romană",
    logo: "/clients/casa-romana.png",
    url: "https://www.facebook.com/casaromanaporolissum/",
  },
{
    name: "Incognito Escape Meses",
    logo: "/clients/incognito.png",
    url: "https://www.facebook.com/profile.php?id=61570213177692",
  },
  {
    name: "PM CUSTOMS",
    logo: "/clients/pmcustoms.png",
    url: "https://www.pmcustoms.us",
  },
  {
    name: "Dracula Soil",
    logo: "/clients/dracula.png",
    url: "https://www.draculasoil.com",
  },
{
    name: "Prosecco V8",
    logo: "/clients/v8.png",
    url: "https://www.instagram.com/prosecco.v8/",
  },
{
    name: "Luca Garden",
    logo: "/clients/lg.png",
    url: "",
  },
];

// -----------------------------------------------------------------------------
// SECȚIUNEA "OUR WORK" — videoclipuri verticale (reels/shorts) încorporate din Vimeo.
// Nu se încarcă fișierul video pe server - doar embed, deci site-ul rămâne rapid.
//
// Cum adaugi un videoclip nou:
// 1. Urcă videoclipul pe Vimeo (poate fi Unlisted, nu trebuie să fie public).
// 2. Pe pagina videoclipului, apasă "Share" → tab-ul "Embed".
// 3. Copiază DOAR valoarea din interiorul lui src="..." (arată cam așa:
//    https://player.vimeo.com/video/1234567890?h=abcdef1234).
// 4. Pune acel link exact în câmpul embedUrl de mai jos.
// -----------------------------------------------------------------------------
export type WorkVideo = {
  title: string;
  embedUrl: string;
};

export const workVideos: WorkVideo[] = [
  { title: "Casa Romana", embedUrl: "https://player.vimeo.com/video/1213316761?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
  { title: "Ceramic Stone", embedUrl: "https://player.vimeo.com/video/1213316759?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
  { title: "Incognito Escape Meses", embedUrl: "https://player.vimeo.com/video/1213316760?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
  { title: "CS Reel 5", embedUrl: "https://player.vimeo.com/video/1213324646?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
];
// -----------------------------------------------------------------------------
// SECȚIUNEA "WEB DEVELOPMENT" — site-urile pe care le-ați creat, cu poză de
// prezentare (screenshot) și link către site-ul live.
//
// Cum adaugi un proiect nou:
// 1. Fă un screenshot al site-ului (ideal 1280x800px sau similar, format 16:9).
// 2. Pune poza în /public/web-projects/ (ex: numele-site.png).
// 3. Adaugă o intrare mai jos, cu titlu, link și calea către poză.
// -----------------------------------------------------------------------------
export type WebProject = {
  title: string;
  url: string;
  thumbnail: string;
};

export const webProjects: WebProject[] = [
  // Exemplu - șterge-l și pune-le pe ale tale:
   { title: "Daily Menu", url: "https://www.dailym.ro", thumbnail: "/web-projects/www.dailym.ro.png" },
   { title: "PM Customs", url: "https://www.pmcustoms.us", thumbnail: "/web-projects/www.pmcustoms.us.png" },
   { title: "Dracula soil", url: "https://www.draculasoil.com", thumbnail: "/web-projects/www.draculasoil.com.png" },
];
