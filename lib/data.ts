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
    description: `Creăm identități vizuale puternice care te diferențiază de concurență. Brandul tău este prima impresie pe care o lași în fața clienților și unul dintre cele mai valoroase active ale unei afaceri. O identitate vizuală bine construită transmite profesionalism, inspiră încredere și creează o conexiune autentică între companie și publicul său.

La NEXT LEVEL Advertising Agency dezvoltăm identități de brand care merg dincolo de un simplu logo. Construim un sistem vizual complet, coerent și memorabil, adaptat valorilor companiei, industriei în care activează și publicului pe care dorește să îl atragă.

Procesul începe printr-o analiză detaliată a afacerii, a concurenței și a poziționării pe piață. Pe baza acestor informații definim direcția creativă și dezvoltăm elementele esențiale ale identității: logo, paletă cromatică, tipografie, elemente grafice, iconografie și reguli de utilizare care asigură o imagine unitară în toate materialele de comunicare.`,
  },
  {
    icon: "chart",
    title: "Performance Marketing",
    description: `Campanii profitabile pe Facebook, Google, TikTok și alte platforme. Performanța nu se măsoară în aprecieri sau afișări, ci în rezultate concrete. Dezvoltăm campanii de publicitate digitală orientate către obiective clare: generarea de lead-uri, creșterea vânzărilor, atragerea de clienți noi și maximizarea rentabilității investiției (ROI).

Fiecare campanie începe cu o analiză detaliată a afacerii, a pieței și a comportamentului publicului țintă. Definim strategia potrivită, alegem canalele de promovare și construim audiențe relevante pentru ca fiecare buget investit să producă rezultate măsurabile.

Administrăm și optimizăm campanii pe Facebook, Instagram, Google Ads, TikTok, LinkedIn și alte platforme digitale, utilizând cele mai eficiente formate de promovare pentru fiecare obiectiv. Fie că este vorba despre campanii de conversie, trafic, lead generation, remarketing sau notorietate, fiecare strategie este adaptată specificului afacerii.`,
  },
  {
    icon: "code",
    title: "Web Design & Development",
    description: `Site-uri moderne, rapide și optimizate pentru conversii. Website-ul este centrul prezenței digitale a oricărei afaceri și, de cele mai multe ori, primul contact dintre brand și potențialii clienți. De aceea, dezvoltăm site-uri moderne, rapide și optimizate pentru a transforma vizitatorii în clienți.

Construim website-uri personalizate, adaptate identității fiecărui brand și obiectivelor de business. Fie că este vorba despre un site de prezentare, un magazin online, o platformă de rezervări sau o aplicație web, fiecare proiect este realizat cu accent pe performanță, experiența utilizatorului și scalabilitate.

Punem accent pe un design modern, intuitiv și responsive, care oferă o experiență impecabilă pe desktop, tabletă și telefon. Structura paginilor este gândită pentru o navigare simplă, încărcare rapidă și o prezentare clară a serviciilor sau produselor.`,
  },
  {
    icon: "bot",
    title: "AI & Marketing Automation",
    description: `Automatizări inteligente care îți economisesc timp și cresc vânzările. Automatizarea reprezintă viitorul marketingului digital. Dezvoltăm soluții bazate pe inteligență artificială care elimină procesele repetitive, optimizează comunicarea cu clienții și transformă fiecare interacțiune într-o oportunitate de vânzare.

Implementăm sisteme inteligente care lucrează pentru afacerea ta 24 de ore din 24, răspunzând instant solicitărilor, calificând potențialii clienți și automatizând procese care, în mod tradițional, consumă timp și resurse.

Construim chatboți AI pentru website, Facebook Messenger și WhatsApp, capabili să răspundă întrebărilor frecvente, să prezinte produsele și serviciile, să preia comenzi, să realizeze rezervări și să programeze întâlniri fără intervenție umană.`,
  },
  {
    icon: "search",
    title: "SEO & Content Marketing",
    description: `Strategii SEO și content care aduc trafic și conversii constante. Vizibilitatea în Google nu se obține întâmplător. Construim strategii SEO și de content marketing care poziționează afacerea ta în fața oamenilor potriviți, exact în momentul în care caută produsele sau serviciile pe care le oferi.

Procesul începe cu o analiză completă a website-ului, a concurenței și a pieței. Identificăm oportunitățile de creștere, analizăm comportamentul utilizatorilor și dezvoltăm o strategie bazată pe cuvinte-cheie relevante, intenția de căutare și obiectivele de business.

Optimizăm fiecare element al website-ului pentru motoarele de căutare: structura paginilor, viteza de încărcare, experiența utilizatorului, meta titlurile, descrierile, imaginile, linkurile interne și conținutul. Scopul este ca site-ul să fie ușor de înțeles atât pentru utilizatori, cât și pentru algoritmii Google.`,
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
];