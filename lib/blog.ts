import type { ServiceId } from "./service-content";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  publishedAt: string;
  updatedAt?: string;
  content: string[];
};

export const posts: BlogPost[] = [
  {
    slug: "5-greseli-performance-marketing",
    title: "5 greșeli frecvente în campaniile de Performance Marketing",
    excerpt: "Cele mai comune greșeli care îți consumă bugetul de ads și cum le eviți.",
    date: "12 Iulie 2026",
    publishedAt: "2026-07-12",
    updatedAt: "2026-11-18",
    content: [
      "Campaniile plătite trebuie evaluate în raport cu obiectivele afacerii, nu doar după cifrele afișate în platformă. Cele cinci situații de mai jos oferă un punct de pornire pentru verificare; efectul schimbărilor se urmărește în date, fără un rezultat sau un termen garantat.",
      "Prima greșeală este lipsa unui obiectiv clar de business în spatele campaniei. Multe conturi sunt optimizate după click-uri sau afișări, în loc de conversii reale — lead-uri, comenzi, apeluri. Fără o legătură directă cu ce înseamnă succes pentru afacerea ta, orice cifră de pe platformă poate arăta bine fără să însemne nimic.",
      "A doua este alegerea audienței fără legătură cu oferta și datele disponibile. O segmentare prea restrânsă poate limita campania, iar una nepotrivit de largă poate consuma buget fără cereri relevante. Nu există o audiență optimă pentru orice cont: verifică obiectivul, volumul de date și rezultatele testelor.",
      "A treia greșeală: schimbi prea multe lucruri înainte să poți interpreta rezultatele. Dacă modifici simultan bugetul, mesajele și audiența, devine dificil să afli ce a produs schimbarea. Stabilește ce testezi și ce date îți sunt necesare pentru evaluare, în loc să folosești un număr fix de zile pentru orice campanie.",
      "A patra: lipsa unei pagini de destinație potrivite. O pagină generică, lentă sau confuză poate împiedica vizitatorul să înțeleagă oferta ori să trimită o cerere. Verifică dacă mesajul reclamei se regăsește pe pagină și dacă acțiunea dorită funcționează pe telefon.",
      "În fine, a cincea greșeală este ignorarea datelor după lansare. O campanie nu se „setează și uită” — cere verificări constante, testare de variante și ajustări pe baza cifrelor reale, nu a impresiilor.",
      "Aceste verificări ajută la identificarea unor probleme frecvente, fără să înlocuiască analiza ofertei și a rezultatelor reale. Notează ce modifici și evaluează schimbările în contextul obiectivelor și al bugetului.",
    ],
  },
  {
    slug: "de-ce-branding-conteaza",
    title: "De ce brandingul contează mai mult decât crezi",
    excerpt: "Rolul identității vizuale în claritatea, recunoașterea și încrederea într-un brand.",
    date: "3 Iulie 2026",
    publishedAt: "2026-07-03",
    updatedAt: "2026-11-18",
    content: [
      "Brandingul leagă oferta, mesajele și identitatea vizuală a unei afaceri. Este util să clarifici aceste elemente înainte să produci materiale noi, pentru ca site-ul, reclamele și prezentările să spună o poveste coerentă despre aceeași ofertă.",
      "Culorile, tipografia, tonul și regulile de folosire a logo-ului ajută echipa să pregătească materiale consecvente. Scopul este ca oamenii să poată recunoaște brandul, iar informațiile importante să nu se schimbe de la un canal la altul.",
      "Verifică alături site-ul, profilurile sociale și o ofertă comercială recentă. Se înțelege că aparțin aceleiași afaceri? Numele, mesajele, datele de contact și stilul vizual sunt compatibile? Diferențele observate pot deveni cerințe concrete pentru actualizarea identității.",
      "Brandingul nu înseamnă doar un logo. Înseamnă să explici ce oferi, cui îi este util și prin ce se diferențiază oferta în mod real. O propunere vizuală trebuie evaluată în acest context și în locurile în care va fi folosită, nu doar ca imagine izolată.",
      "Identitatea vizuală poate susține comunicarea, dar nu înlocuiește calitatea ofertei sau experiența clientului și nu garantează vânzări. Stabilește ce materiale și reguli ai nevoie, ce există deja și cum va putea echipa să le folosească după livrare.",
    ],
  },
  {
    slug: "automatizari-ai-marketing",
    title: "Automatizări pentru solicitări, mesaje și rapoarte: trei exemple",
    excerpt: "Trei exemple de fluxuri pentru preluarea solicitărilor, mesaje și rapoarte.",
    date: "24 Iunie 2026",
    publishedAt: "2026-06-24",
    updatedAt: "2026-11-18",
    content: [
      "Automatizarea poate reduce activitățile repetitive, pentru ca echipa să se concentreze pe decizii și pe relația cu clienții. Cele trei fluxuri de mai jos sunt exemple de utilizare; utilitatea lor depinde de proces, de instrumentele disponibile și de verificările păstrate în flux.",
      "Primul: direcționarea solicitărilor. Un formular poate trimite cererea către persoana responsabilă și poate pregăti o notificare într-un instrument folosit de echipă. Definește regulile de repartizare, datele necesare și ce se întâmplă dacă lipsește o informație sau notificarea eșuează. Timpul de răspuns depinde în continuare de disponibilitatea echipei.",
      "Al doilea: mesaje de continuare a unei solicitări. De exemplu, după primirea unui formular poate fi pregătită o confirmare sau o reamintire pentru echipă. Stabilește ce mesaj este util, când trebuie trimis și în ce situații este necesară intervenția unei persoane; automatizarea nu face un mesaj irelevant mai convingător.",
      "Al treilea: pregătirea rapoartelor. Un flux poate centraliza periodic indicatori din sursele pentru care există acces și opțiuni de integrare. Raportul trebuie să arate perioada, sursa și eventualele date lipsă; extragerea automată nu garantează că măsurarea este completă sau că interpretarea este corectă.",
      "Înainte de implementare, verifică datele de intrare, accesul la aplicații, costurile serviciilor și modul în care se tratează erorile. Un flux bine delimitat este mai ușor de verificat și întreținut decât o automatizare care încearcă să rezolve totul deodată.",
    ],
  },
  {
    slug: "seo-local-ghid",
    title: "SEO local: cum îți faci afacerea mai ușor de găsit",
    excerpt: "Pașii esențiali pentru Google Business Profile, recenzii și cuvinte cheie locale.",
    date: "15 Iunie 2026",
    publishedAt: "2026-06-15",
    updatedAt: "2026-11-18",
    content: [
      "Pentru o afacere care deservește o zonă geografică, informațiile locale îi ajută pe clienți să înțeleagă dacă serviciul le este disponibil. Site-ul și profilurile publice ar trebui să descrie oferta și zona reală de lucru, fără locații sau sedii inventate.",
      "Dacă afacerea este eligibilă pentru Google Business Profile, verifică numele, datele de contact, programul, categoriile și imaginile publicate. Afișează informații reale și actualizează-le când se schimbă; nu crea o adresă de birou doar pentru a apărea într-un oraș în care nu ai o locație reală.",
      "Al doilea pas: recenziile. Acestea ajută oamenii să înțeleagă experiențele altor clienți. Invită clienții să lase o recenzie sinceră după colaborare și răspunde util atât aprecierilor, cât și problemelor semnalate. Nu înlocui feedbackul real cu recenzii sau rezultate inventate.",
      "Al treilea: pagini care explică serviciul și aria deservită. Un client care caută un service auto în Cluj-Napoca are nevoie de informații despre serviciile disponibile, locație sau deplasare și contact. Folosește denumirile locale unde ajută înțelegerea; nu repeta artificial expresii și nu multiplica aceeași pagină cu alt nume de oraș.",
      "Al patrulea: consistența datelor de contact (NAP — Name, Address, Phone) peste tot online — pe site, pe rețele sociale, în directoare de afaceri. Informații contradictorii între surse creează confuzie atât pentru clienți, cât și pentru algoritmii Google.",
      "Verifică periodic informațiile și întrebările clienților. Urmărește datele disponibile despre căutări și solicitări pentru a decide ce merită actualizat; completarea unei liste de verificare nu garantează o anumită poziție în rezultate.",
    ],
  },
  {
    slug: "cand-merita-redesign-site",
    title: "Site vechi vs. site nou: când merită să investești în redesign",
    excerpt: "Cum verifici experiența pe telefon, viteza, conținutul și traseul către contact.",
    date: "5 Iunie 2026",
    publishedAt: "2026-06-05",
    updatedAt: "2026-11-18",
    content: [
      "Un site nu trebuie refăcut doar pentru că este vechi. Începe cu probleme observabile: funcții care nu merg, informații depășite sau un traseu dificil către contact. Apoi compară corecțiile punctuale cu o refacere a structurii.",
      "Primul semn de verificat: site-ul este dificil de folosit pe telefon. Testează dacă textul se citește fără mărire, butoanele se pot apăsa și formularele pot fi completate. Datele proprii de trafic te ajută să vezi ce dispozitive folosesc vizitatorii, fără să presupui aceeași distribuție pentru orice afacere.",
      "Al doilea: încărcarea paginilor importante. Măsoară mai multe pagini și condiții de utilizare, inclusiv pe mobil, apoi identifică resursele sau funcțiile care întârzie afișarea. Uneori problema poate fi corectată fără un redesign complet.",
      "Al treilea: lipsa unui apel la acțiune clar. Dacă un vizitator ajunge pe site și nu știe imediat ce să facă în continuare — sună, completează un formular, cere o ofertă — site-ul nu își face treaba, indiferent cât de „frumos” arată.",
      "Al patrulea: informații învechite — servicii care nu mai există, prețuri vechi, poze din alt deceniu. Asta transmite exact opusul mesajului pe care vrei să-l dai: că afacerea ta e activă și actuală.",
      "Nu există un număr de semne care obligă la redesign. Decide după impact, accesul la platforma existentă, costul corecțiilor și funcțiile de care ai nevoie. O analiză inițială poate separa actualizările simple de schimbările care cer o reconstrucție.",
    ],
  },
  {
    slug: "raport-lunar-marketing",
    title: "Cum arată un raport lunar de marketing care chiar contează",
    excerpt: "Ce cifre te ajută să evaluezi campaniile și să decizi ce îmbunătățești.",
    date: "28 Mai 2026",
    publishedAt: "2026-05-28",
    updatedAt: "2026-11-18",
    content: [
      "Multe rapoarte de marketing sunt pline de cifre impresionante — afișări, click-uri, engagement — dar sărace în informația care contează cu adevărat: cât de aproape ești de obiectivele afacerii tale.",
      "Un raport util pornește de la o singură întrebare: ce înseamnă succes luna asta? Mai multe lead-uri? Mai multe vânzări? Un cost mai mic per client? Toate cifrele din raport ar trebui să răspundă, direct sau indirect, la această întrebare.",
      "Cifrele de vanitate — afișări, like-uri, urmăritori noi — pot fi interesante, dar rareori spun ceva despre profit. Un cont cu multe like-uri și zero clienți noi nu ajută afacerea, oricât de bine ar arăta într-un grafic.",
      "În schimb, un raport bun urmărește: numărul de lead-uri sau vânzări generate, costul per achiziție, rata de conversie a paginilor cheie și evoluția acestor cifre față de luna precedentă. Aceste patru numere spun, de obicei, mai mult decât zece pagini de statistici secundare.",
      "Un raport lunar bun ar trebui să dureze cinci minute de citit și să răspundă clar la o singură întrebare: merită să continuăm exact așa, sau schimbăm ceva luna viitoare?",
    ],
  },
  {
    slug: "facebook-vs-google-ads",
    title: "Facebook vs. Google Ads: unde își găsește afacerea ta clienții",
    excerpt: "Diferențele cheie și cum alegi platforma potrivită pentru bugetul tău.",
    date: "19 Mai 2026",
    publishedAt: "2026-05-19",
    updatedAt: "2026-11-18",
    content: [
      "„Ar trebui să facem reclame pe Facebook sau pe Google?” este o întrebare care trebuie legată de ofertă, public și obiectiv. Alegerea canalului depinde de felul în care oamenii caută sau descoperă soluția de care au nevoie, dar și de ce poți măsura după lansare.",
      "Campaniile de căutare din Google Ads pot răspunde unor căutări explicite, de exemplu pentru un serviciu într-o anumită localitate. Verifică ce caută oamenii, dacă oferta răspunde intenției și dacă pagina de destinație explică pașii următori. Google Ads include și alte tipuri de campanii, care trebuie evaluate separat.",
      "Reclamele Facebook și Instagram pot prezenta oferta în contexte de descoperire, prin imagini, video și mesaje. Alegerea materialelor trebuie legată de public și obiectiv; faptul că un produs este vizual nu garantează că o campanie va aduce comenzi.",
      "Compară canalele după cereri sau comenzi relevante, costuri și capacitatea de măsurare. Ia în calcul pagina de destinație, materialele disponibile și bugetul de test. Nu există o platformă care aduce automat rezultate mai rapide pentru toate afacerile dintr-o categorie.",
      "Unele strategii combină canalele, fiecare cu un rol diferit. Aceasta nu este însă o regulă pentru orice afacere: alege după obiectiv, oferta disponibilă și capacitatea de măsurare, apoi evaluează cererile sau comenzile obținute, nu doar traficul.",
    ],
  },
  {
    slug: "copywriting-ghid-imm",
    title: "Conținutul care vinde: ghid rapid de copywriting pentru IMM-uri",
    excerpt: "Cum explici oferta, folosești dovezi reale și alegi o acțiune principală.",
    date: "8 Mai 2026",
    publishedAt: "2026-05-08",
    updatedAt: "2026-11-18",
    content: [
      "Un text comercial util explică oferta în limbajul clientului și îi arată ce poate face în continuare. O structură clară ajută, dar nu înlocuiește cunoașterea produsului și nu garantează vânzări.",
      "O structură de încercat: problemă → soluție → dovadă → acțiune. Numește nevoia, explică oferta și adaugă doar dovezi pe care le poți susține: o demonstrație, o recenzie reală sau un rezultat verificabil. Dacă nu ai o dovadă, nu o inventa. Închide cu un îndemn potrivit: sună, cere o ofertă sau programează-te.",
      "O greșeală comună este să vorbești prea mult despre tine („Suntem lideri de piață din 2010...”) în loc despre client („Ai nevoie de o soluție rapidă pentru...”). Oamenii citesc texte de vânzare cu o singură întrebare în minte: „Ce câștig eu?” — răspunde direct la ea.",
      "Un titlu specific explică mai bine oferta decât o formulă precum „Servicii de calitate”. De exemplu, „Reparații auto în [localitate], cu programare telefonică” indică serviciul și acțiunea. Adaugă termene, garanții sau alte beneficii numai dacă sunt reale și poți respecta condițiile prezentate.",
      "Alege o acțiune principală potrivită paginii și fă-o ușor de găsit. Pot exista și pași secundari, precum consultarea portofoliului sau a detaliilor serviciului, fără să ascundă contactul ori cererea de ofertă.",
    ],
  },
  {
    slug: "conversie-vs-trafic",
    title: "De ce rata de conversie contează mai mult decât traficul",
    excerpt: "Un site cu mai puțini vizitatori dar bine optimizat poate vinde mai mult.",
    date: "29 Aprilie 2026",
    publishedAt: "2026-04-29",
    updatedAt: "2026-11-18",
    content: [
      "Traficul arată câte vizite primește site-ul. Rata de conversie arată ce proporție dintre ele realizează acțiunea definită: de exemplu, o cerere de ofertă sau o comandă. Cei doi indicatori trebuie citiți împreună, în raport cu obiectivul afacerii.",
      "Un exemplu ipotetic: un site primește 10.000 de vizitatori și are o rată de conversie de 1%, adică 100 de conversii. Altul primește 2.000 de vizitatori și convertește 6%, adică 120 de conversii. Exemplul compară numărul de acțiuni, nu profitul: costul traficului, valoarea comenzilor și calitatea solicitărilor trebuie analizate separat.",
      "Rata de conversie depinde de factori pe care mulți îi ignoră: claritatea mesajului, viteza site-ului, încrederea transmisă (recenzii, certificări, poze reale) și simplitatea procesului de contact sau cumpărare. Fiecare pas suplimentar sau neclar dintre vizitator și acțiunea dorită reduce șansele de conversie.",
      "Înainte să crești bugetul pentru trafic, verifică măsurarea și traseul către acțiune. Un titlu neclar, un formular care nu funcționează sau un buton greu de găsit sunt probleme concrete de corectat. Evaluează efectul schimbărilor în date; nu presupune că orice scurtare a formularului sau schimbare de culoare îmbunătățește conversia.",
      "Traficul aduce oameni la ușă. Rata de conversie decide câți dintre ei intră efectiv.",
    ],
  },
];

export type BlogGuidance = {
  serviceId: ServiceId;
  sections: { heading: string; paragraphs: number[] }[];
  checklist: string[];
  relatedSlugs: string[];
  note?: string;
  references?: { title: string; url: string }[];
};

export const blogGuidance: Record<string, BlogGuidance> = {
  "5-greseli-performance-marketing": {
    serviceId: "performance-marketing",
    sections: [
      { heading: "1. Obiectivul campaniei nu este legat de afacere", paragraphs: [1] },
      { heading: "2. Audiența este aleasă fără context", paragraphs: [2] },
      { heading: "3. Modificările nu pot fi evaluate separat", paragraphs: [3] },
      { heading: "4. Pagina de destinație nu susține reclama", paragraphs: [4] },
      { heading: "5. Datele nu sunt urmărite după lansare", paragraphs: [5, 6] },
    ],
    checklist: ["Definește ce înseamnă o conversie utilă pentru afacere.", "Verifică pagina de destinație și modul în care înregistrezi cererile.", "Notează schimbările testate și evaluează datele în contextul bugetului."],
    relatedSlugs: ["facebook-vs-google-ads", "raport-lunar-marketing"],
    note: "Recomandările sunt puncte de verificare, nu o rețetă cu rezultate garantate. Setările potrivite depind de ofertă, date și obiectiv.",
  },
  "de-ce-branding-conteaza": {
    serviceId: "branding-identitate",
    sections: [
      { heading: "Coerența ajută oamenii să recunoască brandul", paragraphs: [1, 2] },
      { heading: "Identitatea începe de la ofertă și public", paragraphs: [3, 4] },
    ],
    checklist: ["Poate un client să înțeleagă rapid ce oferi?", "Folosești consecvent aceleași elemente vizuale și mesaje?", "Materialele pentru website și social media pot fi recunoscute ca aparținând aceluiași brand?"],
    relatedSlugs: ["copywriting-ghid-imm", "cand-merita-redesign-site"],
  },
  "automatizari-ai-marketing": {
    serviceId: "ai-automatizari",
    sections: [
      { heading: "Preluarea și direcționarea solicitărilor", paragraphs: [1] },
      { heading: "Confirmări și mesaje de continuare", paragraphs: [2] },
      { heading: "Rapoarte automate și verificarea fluxului", paragraphs: [3, 4] },
    ],
    checklist: ["Alege un proces repetitiv cu început și final clar.", "Verifică instrumentele, permisiunile și datele necesare.", "Stabilește ce se întâmplă la o eroare și când intervine un om."],
    relatedSlugs: ["raport-lunar-marketing", "conversie-vs-trafic"],
    note: "Fluxurile prezentate sunt exemple. Timpul economisit și fezabilitatea unei integrări se verifică pentru procesul și aplicațiile concrete.",
  },
  "seo-local-ghid": {
    serviceId: "seo-content-marketing",
    sections: [
      { heading: "Informații complete în Google Business Profile", paragraphs: [1] },
      { heading: "Recenzii reale și răspunsuri utile", paragraphs: [2] },
      { heading: "Pagini care descriu serviciul și zona deservită", paragraphs: [3] },
      { heading: "Date de contact consecvente și actualizate", paragraphs: [4, 5] },
    ],
    checklist: ["Verifică numele, adresa și telefonul afișate public.", "Descrie serviciile și aria reală de lucru, fără pagini repetitive pentru fiecare oraș.", "Urmărește căutările și paginile în Search Console, când ai acces la date."],
    relatedSlugs: ["copywriting-ghid-imm", "cand-merita-redesign-site"],
    note: "Nici completarea profilului, nici o modificare a site-ului nu garantează prima poziție. Evaluează vizibilitatea și acțiunile clienților în timp.",
    references: [{ title: "Google: factorii care influențează rezultatele locale", url: "https://support.google.com/business/answer/7091?hl=ro" }, { title: "Google Search Central: ghid introductiv SEO", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" }],
  },
  "cand-merita-redesign-site": {
    serviceId: "web-development",
    sections: [
      { heading: "Verifică experiența de pe telefon", paragraphs: [1] },
      { heading: "Măsoară încărcarea paginilor importante", paragraphs: [2] },
      { heading: "Urmărește traseul către contact sau comandă", paragraphs: [3] },
      { heading: "Separă informațiile învechite de nevoia unui redesign", paragraphs: [4, 5] },
    ],
    checklist: ["Testează meniul, butoanele și formularele pe telefon.", "Verifică dacă serviciile și datele de contact sunt actuale.", "Compară ce poți corecta punctual cu ce necesită refacerea structurii."],
    relatedSlugs: ["conversie-vs-trafic", "copywriting-ghid-imm"],
  },
  "raport-lunar-marketing": {
    serviceId: "performance-marketing",
    sections: [
      { heading: "Pornește de la obiectivul afacerii", paragraphs: [1] },
      { heading: "Pune indicatorii de vizibilitate în context", paragraphs: [2] },
      { heading: "Leagă cifrele de o decizie pentru perioada următoare", paragraphs: [3, 4] },
    ],
    checklist: ["Precizează perioada și sursa datelor.", "Separă cererile sau comenzile de afișări și clicuri.", "Explică ce s-a schimbat și ce merită testat în continuare."],
    relatedSlugs: ["5-greseli-performance-marketing", "automatizari-ai-marketing"],
  },
  "facebook-vs-google-ads": {
    serviceId: "performance-marketing",
    sections: [
      { heading: "Google Ads și căutările cu intenție", paragraphs: [1] },
      { heading: "Meta Ads și descoperirea unei oferte", paragraphs: [2] },
      { heading: "Alege după obiectiv, nu după popularitatea platformei", paragraphs: [3, 4] },
    ],
    checklist: ["Clarifică dacă publicul caută deja oferta sau trebuie să o descopere.", "Verifică pagina pe care ajung vizitatorii.", "Compară date despre cereri, comenzi și costuri, nu doar clicuri."],
    relatedSlugs: ["5-greseli-performance-marketing", "raport-lunar-marketing"],
    note: "Exemplele descriu posibile utilizări ale canalelor. Platforma potrivită și rezultatele se stabilesc prin obiective, testare și datele afacerii.",
  },
  "copywriting-ghid-imm": {
    serviceId: "seo-content-marketing",
    sections: [
      { heading: "Construiește mesajul în jurul unei nevoi", paragraphs: [1] },
      { heading: "Explică beneficiul pentru client", paragraphs: [2] },
      { heading: "Scrie un titlu specific și verificabil", paragraphs: [3] },
      { heading: "Încheie cu o acțiune clară", paragraphs: [4] },
    ],
    checklist: ["Folosește numai rezultate, recenzii și promisiuni pe care le poți susține.", "Spune concret ce oferi și pentru cine este potrivit.", "Alege o acțiune principală și verifică dacă poate fi făcută ușor."],
    relatedSlugs: ["de-ce-branding-conteaza", "conversie-vs-trafic"],
  },
  "conversie-vs-trafic": {
    serviceId: "web-development",
    sections: [
      { heading: "Un exemplu numeric despre rata de conversie", paragraphs: [1] },
      { heading: "Ce poate influența acțiunea unui vizitator", paragraphs: [2] },
      { heading: "Verifică traseul existent înainte de a crește traficul", paragraphs: [3, 4] },
    ],
    checklist: ["Definește ce acțiune numeri drept conversie.", "Verifică formularele și pașii către acea acțiune.", "Analizează separat costul traficului, valoarea și calitatea conversiilor."],
    relatedSlugs: ["cand-merita-redesign-site", "raport-lunar-marketing"],
    note: "Cifrele din exemplu sunt ipotetice și nu reprezintă rezultate obținute pentru un client.",
  },
};
