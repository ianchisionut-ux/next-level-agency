// -----------------------------------------------------------------------------
// Tot conținutul site-ului este definit aici. Nu există panou de admin -
// editezi direct valorile de mai jos și modificările apar automat pe site.
// -----------------------------------------------------------------------------

export const siteConfig = {
  name: "NEXT LEVEL",
  tagline: "ADVERTISING AGENCY",
  legalName: "NEXTLEVEL AUTOMATION S.R.L.",
  cui: "55476878",
  tradeRegistryNumber: "J2026051349006",
  caen: "6210",
  registrationDate: "24 august 2026",
  phone: "+40 712 345 002",
  email: "contact@nextlevel-agency.ro",
  address: "Str. Fundătura nr. 1A, sat Mirșid, com. Mirșid, jud. Sălaj, România",
  // Numărul de WhatsApp în format internațional, FĂRĂ + și fără spații.
  whatsappNumber: "40712345002",
  whatsappMessage: "Salut! Vreau să discutăm despre un proiect.",
  socials: {
    facebook: "https://www.facebook.com/profile.php?id=61589619395595",
    instagram: "https://www.instagram.com/nextlevel.zalau/",
    // TikTok încă nu are link - las gol până e gata contul.
    // Odată ce ai link-ul, îl pui aici și iconița devine automat clickabilă.
    tiktok: "",
  },
};

export const trustedBy = [
  "Google", "Meta", "TikTok", "Stripe", "YouTube", "Banca Transilvania",
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
    description: `Strategie de brand și identitate vizuală coerentă, adaptate afacerii tale.`,
  },
  {
    icon: "chart",
    title: "Performance Marketing",
    description: `Campanii pe Google, Meta și TikTok, cu obiective și bugete stabilite împreună.`,
  },
  {
    icon: "code",
    title: "Web Design & Development",
    description: `Site-uri de prezentare și aplicații web, cu structură și funcționalități adaptate proiectului.`,
  },
  {
    icon: "bot",
    title: "AI & Marketing Automation",
    description: `Integrarea aplicațiilor și automatizarea fluxurilor repetitive, pornind de la procesele tale.`,
  },
  {
    icon: "search",
    title: "SEO & Content Marketing",
    description: `Optimizare tehnică și conținut util, pentru pagini clare și ușor de descoperit în căutare.`,
  },
];

export const process = [
  { step: "01", icon: "discovery", title: "Discovery", description: "Analizăm afacerea ta și identificăm oportunitățile." },
  { step: "02", icon: "strategy", title: "Strategy", description: "Creăm strategia personalizată pentru obiectivele tale." },
  { step: "03", icon: "execution", title: "Execution", description: "Implementăm campaniile și proiectele la cele mai înalte standarde." },
  { step: "04", icon: "optimization", title: "Optimization", description: "Optimizăm continuu pentru performanță maximă." },
  { step: "05", icon: "growth", title: "Growth", description: "Scalăm rezultatele și creșterea sustenabilă a afacerii tale." },
] as const;

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
    name: "DR MITICA - Electromit serv",
    logo: "/clients/electromit.png",
    url: "https://electromitserv.ro/",
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
    url: "#",
  },
  {
    name: "SAV Haus",
    logo: "/clients/sav-haus.webp",
    url: "https://sav-haus.ro/",
  },
  {
    name: "Obelix DecoRoom",
    logo: "/clients/obelix-decoroom.png",
    url: "https://www.facebook.com/profile.php?id=61572613300230",
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
  poster: string;
};

export const workVideos: WorkVideo[] = [
  { title: "Casa Romana", poster: "/work-videos/casa-romana.webp", embedUrl: "https://player.vimeo.com/video/1213316761?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
  { title: "Ceramic Stone", poster: "/work-videos/ceramic-stone.webp", embedUrl: "https://player.vimeo.com/video/1213316759?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
  { title: "Incognito Escape Meses", poster: "/work-videos/incognito-escape.webp", embedUrl: "https://player.vimeo.com/video/1213316760?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
  { title: "CS Reel 5", poster: "/work-videos/cs-reel.webp", embedUrl: "https://player.vimeo.com/video/1213324646?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" },
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
  previewCrop?: boolean;
};

export const webProjects: WebProject[] = [
  // Exemplu - șterge-l și pune-le pe ale tale:
   { title: "Daily Menu", url: "https://www.dailym.ro/", thumbnail: "/web-projects/daily-menu-2026-11-18.webp" },
   { title: "PM Customs", url: "https://www.pmcustoms.us", thumbnail: "/web-projects/pm-customs-2026-11-18.webp" },
   { title: "Dracula’s Soil", url: "https://www.draculasoil.com", thumbnail: "/web-projects/dracula-soil-2026-11-18.webp" },
   { title: "BookEasy", url: "https://www.bookeasy.ro/descopera", thumbnail: "/web-projects/bookeasy-2026-11-18.webp" },
   { title: "ELMONT S.A.", url: "https://elmontz.vercel.app", thumbnail: "/web-projects/elmont-2026-11-18.webp" },
   { title: "Pro Bloc Manager", url: "https://www.pro-bloc-manager.ro/", thumbnail: "/web-projects/pro-bloc-manager-2026-11-19.jpg" },
];
