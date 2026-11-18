export type ServiceId = "branding-identitate" | "performance-marketing" | "web-development" | "ai-automatizari" | "seo-content-marketing";

export type ServiceContent = {
  id: ServiceId;
  icon: "target" | "chart" | "code" | "bot" | "search";
  title: string;
  shortTitle: string;
  introduction: string;
  problem: string;
  suitableFor: string;
  deliverables: string[];
  approach: string;
  steps: string[];
  beforeQuote: string[];
  expectation: string;
  relatedSlugs: string[];
};

export const serviceContent: ServiceContent[] = [
  {
    id: "branding-identitate", icon: "target", title: "Branding și identitate vizuală", shortTitle: "Branding",
    introduction: "Un brand are nevoie de o direcție clară: ce oferă, cui se adresează și cum se prezintă. Lucrăm la mesajele și elementele vizuale care ajută oamenii să recunoască afacerea în punctele de contact relevante.",
    problem: "Ai materiale care arată diferit de la un canal la altul sau îți este greu să explici pe scurt ce diferențiază oferta. Proiectul de branding clarifică direcția înainte de producerea altor materiale.",
    suitableFor: "Afaceri la început de drum, branduri care își schimbă direcția sau echipe care folosesc materiale vizuale și mesaje neunitare.",
    deliverables: [
      "Clarificarea publicului, a ofertei și a mesajelor principale ale brandului.",
      "Direcție vizuală: logo sau ajustări ale identității existente, culori și tipografie, în funcție de brief.",
      "Adaptări pentru materialele agreate: website, social media sau prezentări.",
      "Reguli de utilizare și fișierele prevăzute în oferta proiectului.",
    ],
    approach: "Pornim de la afacere și de la materialele existente, stabilim direcția și revizuim propunerile înainte de adaptarea lor pentru utilizările agreate.",
    steps: ["Definim oferta, publicul și contextul în care va fi folosită identitatea.", "Stabilim direcția de mesaj și propunerea vizuală.", "Revizuim elementele și pregătim adaptările și fișierele agreate."],
    beforeQuote: ["Este un brand nou, o actualizare sau o schimbare de poziționare?", "Ce logo, fotografii, texte și reguli există deja?", "Unde trebuie folosită identitatea și ce materiale sunt necesare la livrare?"],
    expectation: "Identitatea vizuală susține claritatea și recunoașterea. Rezultatele comerciale depind și de ofertă, experiența clientului și modul în care brandul este folosit.",
    relatedSlugs: ["de-ce-branding-conteaza", "copywriting-ghid-imm"],
  },
  {
    id: "performance-marketing", icon: "chart", title: "Campanii Google Ads și Meta Ads", shortTitle: "Campanii plătite",
    introduction: "Planificăm și gestionăm campanii de publicitate digitală în jurul unui obiectiv concret: cereri relevante, comenzi, apeluri sau notorietate. Alegerea canalului pornește de la ofertă, public și felul în care oamenii iau decizia de cumpărare.",
    problem: "Vrei să promovezi o ofertă sau ai deja reclame, dar nu poți lega ușor traficul și cheltuiala de cereri relevante. Înainte de a crește bugetul, trebuie clarificate obiectivul, pagina de destinație și măsurarea.",
    suitableFor: "Afaceri care au o ofertă definită și vor să testeze sau să îmbunătățească promovarea pe Google, Facebook, Instagram ori alte platforme potrivite publicului lor.",
    deliverables: [
      "Analiza obiectivelor, a conturilor și a paginilor către care vor trimite reclamele.",
      "Stabilirea conversiilor relevante și verificarea modului în care pot fi măsurate.",
      "Structura campaniilor, propuneri de mesaje și materiale în limitele stabilite prin ofertă.",
      "Monitorizare, teste și explicații despre rezultate, costuri și ajustările propuse.",
    ],
    approach: "Clarificăm obiectivul și bugetul, pregătim campaniile și măsurarea, apoi evaluăm datele pentru a decide ce păstrăm, ce modificăm și ce oprim.",
    steps: ["Analizăm oferta, conturile disponibile și traseul de la reclamă la acțiune.", "Stabilim ce măsurăm și pregătim structura, mesajele și materialele agreate.", "Lansăm și testăm, apoi explicăm datele și ajustările propuse."],
    beforeQuote: ["Ce produs sau serviciu promovezi și ce acțiune vrei să obții?", "Care sunt publicul, zona deservită și bugetul disponibil pentru platforme?", "Există conturi de reclame, o pagină potrivită și date despre cereri sau comenzi?"],
    expectation: "Bugetul de publicitate și costul administrării sunt lucruri distincte, clarificate în ofertă. Nu promitem un anumit cost pe client sau un număr garantat de vânzări.",
    relatedSlugs: ["facebook-vs-google-ads", "5-greseli-performance-marketing", "raport-lunar-marketing"],
  },
  {
    id: "web-development", icon: "code", title: "Web design și dezvoltare web", shortTitle: "Web design",
    introduction: "Construim site-uri cu o structură ușor de înțeles și un traseu clar către contact, cerere de ofertă sau acțiunea relevantă pentru afacere. Designul și funcționalitățile sunt stabilite în funcție de conținutul și obiectivele proiectului.",
    problem: "Site-ul nu explică suficient oferta, este dificil de folosit pe telefon sau nu oferă funcțiile necesare. Clarificarea structurii și a traseului vizitatorului este utilă înainte de a alege doar un aspect vizual nou.",
    suitableFor: "Afaceri care au nevoie de un site nou, de refacerea unui website existent sau de funcționalități web care nu pot fi acoperite doar printr-o pagină de prezentare.",
    deliverables: [
      "Structura paginilor și organizarea informațiilor pentru vizitatori.",
      "Design adaptat pentru telefon și desktop, cu acțiuni vizibile și formulare clare.",
      "Dezvoltarea paginilor și a funcționalităților agreate în brief.",
      "Verificarea afișării, a legăturilor și a fluxurilor importante înainte de livrare.",
    ],
    approach: "Stabilim scopul site-ului și conținutul disponibil, construim structura și designul, apoi implementăm și verificăm traseele pe care le vor folosi vizitatorii.",
    steps: ["Definim paginile, publicul și funcțiile necesare.", "Organizăm conținutul și pregătim direcția de design.", "Implementăm paginile și funcționalitățile prevăzute în proiect.", "Verificăm afișarea, formularele, legăturile și pașii agreați pentru lansare."],
    beforeQuote: ["Ai nevoie de prezentare, catalog, cereri de ofertă sau funcționalități personalizate?", "Ce texte, imagini, domeniu și găzduire există deja?", "Ce formulare sau integrări sunt necesare și cine va actualiza conținutul după lansare?"],
    expectation: "Costul și termenul depind de pagini, materiale, integrări și complexitate. În ofertă precizăm și ce suport, mentenanță sau modificări sunt incluse după lansare.",
    relatedSlugs: ["cand-merita-redesign-site", "conversie-vs-trafic"],
  },
  {
    id: "ai-automatizari", icon: "bot", title: "Automatizări și integrări AI", shortTitle: "Automatizări",
    introduction: "Identificăm activități repetitive și legături între instrumente care pot fi automatizate: preluarea solicitărilor, notificări, transfer de date sau pregătirea rapoartelor. AI este folosit acolo unde are un rol util, cu limite și verificări potrivite fluxului.",
    problem: "Echipa copiază aceleași informații, urmărește manual stări sau pregătește repetat același raport. Pornim de la procesul concret, pentru a evita o integrare care doar mută problema în altă aplicație.",
    suitableFor: "Echipe care mută manual aceleași informații între aplicații, urmăresc solicitări în mai multe locuri sau petrec timp cu rapoarte și notificări repetitive.",
    deliverables: [
      "Descrierea fluxului actual, a datelor folosite și a etapelor repetitive.",
      "Propunerea integrărilor posibile în instrumentele și conturile disponibile.",
      "Configurarea pașilor agreați, inclusiv situațiile care cer confirmare umană.",
      "Testarea fluxului și instrucțiuni pentru utilizare și verificarea erorilor.",
    ],
    approach: "Pornim de la un proces bine delimitat, verificăm accesul și opțiunile de integrare, construim fluxul și îl testăm inclusiv pentru informații lipsă sau răspunsuri întârziate.",
    steps: ["Descriem sursa datelor, rezultatul dorit și persoanele implicate.", "Verificăm opțiunile de integrare, permisiunile și limitele instrumentelor.", "Implementăm pașii agreați și tratăm excepțiile relevante.", "Testăm fluxul și stabilim cum este urmărit și utilizat."],
    beforeQuote: ["Ce pași se repetă și cât de des apar?", "Din ce aplicații vin datele și unde trebuie să ajungă?", "Ce conturi, licențe și acces sunt disponibile și ce decizii trebuie să rămână la un om?"],
    expectation: "O integrare depinde de accesul și funcțiile aplicațiilor implicate. Licențele, limitele API și costurile serviciilor externe se clarifică înainte de implementare.",
    relatedSlugs: ["automatizari-ai-marketing", "raport-lunar-marketing"],
  },
  {
    id: "seo-content-marketing", icon: "search", title: "SEO și conținut pentru afaceri", shortTitle: "SEO și conținut",
    introduction: "Lucrăm la felul în care un site poate fi găsit și înțeles: pagini accesibile motoarelor de căutare, informații utile pentru clienți și legături care fac navigarea clară. Prioritățile se aleg după problemele site-ului și datele disponibile.",
    problem: "Site-ul explică prea puțin serviciile, are pagini greu de descoperit sau atrage căutări care nu se potrivesc ofertei. Este nevoie de verificarea structurii, a conținutului și a datelor, nu doar de repetarea unor cuvinte cheie.",
    suitableFor: "Afaceri cu un site care nu explică suficient oferta, are probleme de indexare sau nu răspunde întrebărilor prin care clienții caută serviciile și produsele respective.",
    deliverables: [
      "Audit al paginilor importante, indexabilității și legăturilor interne.",
      "Recomandări pentru titluri, descrieri, structură și informațiile lipsă.",
      "Conținut legat de nevoile reale ale clienților și organizarea serviciilor pe site.",
      "Urmărirea evoluției în Search Console și a obiectivelor agreate, când există acces la date.",
    ],
    approach: "Identificăm paginile și problemele prioritare, implementăm îmbunătățirile și verificăm în timp ce se schimbă în indexare, căutări și acțiunile vizitatorilor.",
    steps: ["Verificăm paginile importante și informațiile disponibile despre căutări.", "Stabilim problemele și nevoile de conținut cu impact asupra ofertei.", "Aplicăm îmbunătățirile agreate și legăm coerent paginile relevante.", "Urmărim evoluția și ajustăm prioritățile pe baza datelor disponibile."],
    beforeQuote: ["Ce servicii, produse și arii reale de lucru trebuie să poată găsi clienții?", "Există acces la site, Search Console și alte date relevante?", "Cine poate furniza sau verifica informațiile și implementa schimbările necesare?"],
    expectation: "Nu promitem prima poziție în Google. Vizibilitatea și traficul depind de mai mulți factori, iar schimbările se evaluează pe date și în timp, nu doar printr-un scor tehnic.",
    relatedSlugs: ["seo-local-ghid", "copywriting-ghid-imm"],
  },
];

export const serviceQuestions = [
  { question: "Pot începe cu un singur serviciu?", answer: "Da. Discuția inițială ne ajută să alegem o nevoie concretă și să stabilim ce intră în proiect. Un site nou, o campanie sau o automatizare nu presupune automat contractarea tuturor serviciilor." },
  { question: "Cum se stabilește prețul?", answer: "Pe baza volumului de lucru, a complexității și a materialelor disponibile. Oferta trebuie să precizeze livrabilele, etapele și costurile externe relevante. Bugetul reclamelor, licențele și mentenanța nu trebuie confundate cu prețul implementării." },
  { question: "Lucrați numai cu afaceri din Zalău?", answer: "Next Level are sediul în Mirșid, județul Sălaj. Colaborăm cu afaceri din Zalău și, la distanță, din România. Brief-ul, materialele și etapele pot fi discutate online; necesitatea unei întâlniri sau a unei deplasări se stabilește pentru fiecare proiect." },
  { question: "Trebuie să am deja textele și imaginile?", answer: "Nu toate proiectele pornesc cu materialele gata. Clarificăm ce există, ce poate fi refolosit și ce trebuie pregătit. Crearea conținutului și responsabilitățile fiecărei părți se stabilesc în ofertă." },
  { question: "Puteți lucra pe un site sau pe conturi de reclame existente?", answer: "Putem porni de la instrumentele existente, după verificarea accesului și a limitărilor lor. Analiza inițială stabilește dacă este potrivită îmbunătățirea lor sau dacă sunt necesare schimbări mai ample." },
  { question: "Sunt garantate pozițiile în Google sau vânzările din reclame?", answer: "Nu. Stabilim obiective și măsurăm ce poate fi urmărit, dar pozițiile, costurile și vânzările sunt influențate și de piață, ofertă, concurență și comportamentul clienților. Raportarea trebuie să arate datele și contextul lor." },
];
