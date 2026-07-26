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
    description: "Creăm identități vizuale puternice care te diferențiază de concurență.Brandul tău este prima impresie pe care o lași în fața clienților și unul dintre cele mai valoroase active ale unei afaceri. O identitate vizuală bine construită transmite profesionalism, inspiră încredere și creează o conexiune autentică între companie și publicul său.

La NEXT LEVEL Advertising Agency dezvoltăm identități de brand care merg dincolo de un simplu logo. Construim un sistem vizual complet, coerent și memorabil, adaptat valorilor companiei, industriei în care activează și publicului pe care dorește să îl atragă.

Procesul începe printr-o analiză detaliată a afacerii, a concurenței și a poziționării pe piață. Pe baza acestor informații definim direcția creativă și dezvoltăm elementele esențiale ale identității: logo, paletă cromatică, tipografie, elemente grafice, iconografie și reguli de utilizare care asigură o imagine unitară în toate materialele de comunicare.

Ne concentrăm pe construirea unor branduri care rezistă în timp. Fiecare element este creat pentru a funcționa perfect atât în mediul digital, cât și în cel offline, indiferent că este utilizat pe website, rețele sociale, materiale promoționale, ambalaje, uniforme, autovehicule, reclame outdoor sau documente corporate.

O identitate vizuală puternică nu doar atrage atenția, ci facilitează recunoașterea instantanee a brandului și contribuie la consolidarea încrederii în rândul clienților. Consistența în comunicare transformă fiecare interacțiune într-o oportunitate de a întări imaginea companiei și de a crea o experiență memorabilă.

Livrăm un pachet complet de branding, pregătit pentru utilizare imediată, incluzând manual de identitate vizuală, variante de logo pentru toate mediile, șabloane grafice și materiale corporate, astfel încât brandul tău să comunice aceeași imagine profesională în orice context.

Obiectivul nostru este să construim identități vizuale care diferențiază afacerile, cresc valoarea percepută a brandului și oferă o fundație solidă pentru dezvoltarea pe termen lung. Un brand puternic nu înseamnă doar un design reușit, ci o strategie vizuală care susține fiecare etapă a creșterii companiei.",
  },
  {
    icon: "chart",
    title: "Performance Marketing",
    description: "Campanii profitabile pe Facebook, Google, TikTok și alte platforme.Performanța nu se măsoară în aprecieri sau afișări, ci în rezultate concrete. Dezvoltăm campanii de publicitate digitală orientate către obiective clare: generarea de lead-uri, creșterea vânzărilor, atragerea de clienți noi și maximizarea rentabilității investiției (ROI).

Fiecare campanie începe cu o analiză detaliată a afacerii, a pieței și a comportamentului publicului țintă. Definim strategia potrivită, alegem canalele de promovare și construim audiențe relevante pentru ca fiecare buget investit să producă rezultate măsurabile.

Administrăm și optimizăm campanii pe Facebook, Instagram, Google Ads, TikTok, LinkedIn și alte platforme digitale, utilizând cele mai eficiente formate de promovare pentru fiecare obiectiv. Fie că este vorba despre campanii de conversie, trafic, lead generation, remarketing sau notorietate, fiecare strategie este adaptată specificului afacerii.

Creăm materiale vizuale și texte publicitare care captează atenția, transmit mesajul potrivit și încurajează utilizatorii să acționeze. Testăm permanent variante diferite de reclame, audiențe și strategii pentru a identifica cele mai performante combinații și pentru a reduce costul fiecărei conversii.

Monitorizăm în timp real performanța campaniilor și optimizăm constant bugetele, licitațiile și direcțiile de promovare pe baza datelor colectate. Deciziile sunt luate exclusiv pe baza indicatorilor de performanță, nu pe presupuneri.

Implementăm sisteme avansate de tracking și analiză pentru a măsura fiecare etapă din procesul de achiziție a clientului. Urmărim conversiile, comportamentul utilizatorilor și rentabilitatea fiecărei campanii, oferind rapoarte clare și ușor de înțeles.

Scopul nostru este să transformăm publicitatea într-o investiție profitabilă. Nu urmărim doar creșterea traficului, ci construim campanii care generează rezultate reale, optimizează costurile de promovare și contribuie la dezvoltarea sustenabilă a afacerii pe termen lung. Construim platforme digitale care susțin dezvoltarea afacerii pe termen lung și oferă o bază solidă pentru toate activitățile de marketing și promovare.",
  },
  {
    icon: "code",
    title: "Web Design & Development",
    description: "Site-uri moderne, rapide și optimizate pentru conversii.Website-ul este centrul prezenței digitale a oricărei afaceri și, de cele mai multe ori, primul contact dintre brand și potențialii clienți. De aceea, dezvoltăm site-uri moderne, rapide și optimizate pentru a transforma vizitatorii în clienți.

Construim website-uri personalizate, adaptate identității fiecărui brand și obiectivelor de business. Fie că este vorba despre un site de prezentare, un magazin online, o platformă de rezervări sau o aplicație web, fiecare proiect este realizat cu accent pe performanță, experiența utilizatorului și scalabilitate.

Punem accent pe un design modern, intuitiv și responsive, care oferă o experiență impecabilă pe desktop, tabletă și telefon. Structura paginilor este gândită pentru o navigare simplă, încărcare rapidă și o prezentare clară a serviciilor sau produselor.

Fiecare website este dezvoltat folosind tehnologii moderne, respectând cele mai bune practici privind securitatea, viteza de încărcare și optimizarea pentru motoarele de căutare (SEO). Implementăm cod curat, arhitectură scalabilă și soluții care permit extinderea platformei pe măsură ce afacerea evoluează.

Integram funcționalități avansate precum formulare inteligente, sisteme de rezervări, magazine online, procesatoare de plăți, automatizări, CRM, chat-uri AI, integrare cu WhatsApp, Facebook Messenger, Google Maps, Google Analytics și alte platforme esențiale pentru dezvoltarea afacerii.

Optimizăm fiecare element pentru conversii, de la structura conținutului și poziționarea butoanelor de acțiune până la viteza de încărcare și experiența utilizatorului. Scopul nu este doar un website care arată bine, ci unul care generează contacte, solicitări de ofertă și vânzări.

După lansare, oferim mentenanță, actualizări, monitorizare și optimizare continuă, astfel încât website-ul să rămână rapid, sigur și pregătit pentru noile cerințe ale pieței. Construim platforme digitale care susțin dezvoltarea afacerii pe termen lung și oferă o bază solidă pentru toate activitățile de marketing și promovare.",
  },
  {
    icon: "bot",
    title: "AI & Marketing Automation",
    description: "Automatizări inteligente care îți economisesc timp și cresc vânzările.Automatizarea reprezintă viitorul marketingului digital. Dezvoltăm soluții bazate pe inteligență artificială care elimină procesele repetitive, optimizează comunicarea cu clienții și transformă fiecare interacțiune într-o oportunitate de vânzare.

Implementăm sisteme inteligente care lucrează pentru afacerea ta 24 de ore din 24, răspunzând instant solicitărilor, calificând potențialii clienți și automatizând procese care, în mod tradițional, consumă timp și resurse.

Construim chatboți AI pentru website, Facebook Messenger și WhatsApp, capabili să răspundă întrebărilor frecvente, să prezinte produsele și serviciile, să preia comenzi, să realizeze rezervări și să programeze întâlniri fără intervenție umană.

Integrăm automatizări între website, CRM, platforme de email marketing, Google Sheets, ERP-uri, aplicații de facturare și alte sisteme utilizate în companie, astfel încât informațiile să circule automat între aplicații, fără introducere manuală de date.

Dezvoltăm fluxuri automate pentru generarea și distribuirea lead-urilor, confirmarea comenzilor, trimiterea ofertelor, notificărilor, reminderelor, mesajelor personalizate și campaniilor de follow-up, crescând rata de conversie și fidelizarea clienților.

Folosim inteligența artificială pentru analizarea datelor, segmentarea audiențelor, personalizarea comunicării și optimizarea campaniilor de marketing. Astfel, fiecare client primește mesajul potrivit, la momentul potrivit și prin canalul potrivit.

Automatizările reduc timpul pierdut cu sarcinile repetitive, minimizează erorile și permit echipei să se concentreze pe activități cu valoare ridicată, precum dezvoltarea afacerii și relația cu clienții.

Soluțiile dezvoltate sunt scalabile și personalizate pentru fiecare industrie, indiferent dacă este vorba despre restaurante, clinici medicale, magazine online, companii de servicii, producători sau firme B2B. Fiecare automatizare este proiectată pentru a se integra perfect în fluxul existent de lucru și pentru a susține creșterea afacerii pe termen lung.

Obiectivul nostru este simplu: mai puține procese manuale, mai multă eficiență, răspunsuri mai rapide, costuri operaționale reduse și un sistem inteligent care contribuie permanent la creșterea vânzărilor și la dezvoltarea companiei.",
  },
  {
    icon: "search",
    title: "SEO & Content Marketing",
    description: "Strategii SEO și content care aduc trafic și conversii constante.Vizibilitatea în Google nu se obține întâmplător. Construim strategii SEO și de content marketing care poziționează afacerea ta în fața oamenilor potriviți, exact în momentul în care caută produsele sau serviciile pe care le oferi.

Procesul începe cu o analiză completă a website-ului, a concurenței și a pieței. Identificăm oportunitățile de creștere, analizăm comportamentul utilizatorilor și dezvoltăm o strategie bazată pe cuvinte-cheie relevante, intenția de căutare și obiectivele de business.

Optimizăm fiecare element al website-ului pentru motoarele de căutare: structura paginilor, viteza de încărcare, experiența utilizatorului, meta titlurile, descrierile, imaginile, linkurile interne și conținutul. Scopul este ca site-ul să fie ușor de înțeles atât pentru utilizatori, cât și pentru algoritmii Google.

Creăm conținut original și valoros care răspunde întrebărilor publicului și consolidează autoritatea brandului. Articole de blog, pagini de servicii, descrieri de produse, ghiduri, studii de caz și materiale informative sunt dezvoltate pentru a atrage trafic organic și pentru a transforma vizitatorii în clienți.

Implementăm strategii de content marketing care distribuie conținutul prin cele mai eficiente canale digitale, crescând vizibilitatea brandului și generând trafic constant pe termen lung. Fiecare material este creat cu scopul de a educa, informa și construi încredere în relația cu publicul.

Monitorizăm permanent pozițiile în motoarele de căutare, evoluția cuvintelor-cheie, traficul organic și comportamentul utilizatorilor. Analizăm performanța fiecărei pagini și optimizăm continuu conținutul pentru a menține și îmbunătăți rezultatele.

Punem accent atât pe SEO tehnic, cât și pe SEO local, ajutând companiile să fie găsite de clienții din zona lor prin optimizarea profilului Google Business, a informațiilor locale și a strategiilor dedicate căutărilor regionale.

Obiectivul nostru este să construim o sursă stabilă și predictibilă de trafic organic, reducând dependența de publicitatea plătită și oferind afacerii tale o prezență puternică și sustenabilă în rezultatele motoarelor de căutare. Un conținut bine realizat continuă să genereze vizibilitate, lead-uri și conversii mult timp după publicare.",
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
