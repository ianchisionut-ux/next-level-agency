export type ServiceDetailKind = "web" | "marketing" | "automation";
export type ServiceDetail = {
  slug: string;
  kind: ServiceDetailKind;
  label: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  visualCaption: string;
  benefits: { title: string; text: string }[];
  examples: { title: string; text: string }[];
  deliverables: string[];
  process: { title: string; text: string }[];
  preparation: string[];
  boundary: string;
  faq: { question: string; answer: string }[];
};

export const serviceDetails: ServiceDetail[] = [
  {
    slug: "web-design-dezvoltare", kind: "web", label: "Web & App Dev",
    metaTitle: "Web design și dezvoltare aplicații în Zalău | Next Level",
    metaDescription: "Site-uri de prezentare, magazine și aplicații web construite în jurul clienților tăi. Vezi vizual procesul, exemplele și ce stabilim înainte de ofertă.",
    eyebrow: "Web design & dezvoltare",
    title: "Ideea ta. O experiență digitală cu sens.",
    lead: "Un site ar trebui să explice clar ce oferi și să facă următorul pas ușor. Pornim de la oamenii care îl folosesc, apoi conectăm designul cu funcțiile de care ai nevoie.",
    visualCaption: "De la o pagină de prezentare la o aplicație cu mai multe ecrane: aceeași idee, adaptată modului în care este folosită.",
    benefits: [
      { title: "Clar de la primul ecran", text: "Structură, mesaje și navigare care ajută vizitatorul să înțeleagă oferta." },
      { title: "Potrivit pentru telefon", text: "Conținutul și interacțiunile se adaptează la ecrane mici, fără să depindă de cursor." },
      { title: "Construit pentru ce urmează", text: "Stabilim din brief ce trebuie să poți modifica și ce integrări sunt necesare." },
    ],
    examples: [
      { title: "Site de prezentare", text: "Servicii, lucrări, informații despre firmă și o cale simplă de contact." },
      { title: "Magazin sau rezervări", text: "Produse, pași de comandă ori disponibilități, în funcție de modelul afacerii." },
      { title: "Aplicație web", text: "Conturi, roluri și fluxuri specifice echipei sau clienților tăi." },
    ],
    deliverables: ["Structura paginilor și traseele importante ale vizitatorului.", "Direcție vizuală și interfețe adaptate la desktop și mobil.", "Dezvoltarea paginilor și a funcțiilor agreate în ofertă.", "Configurarea metadatelor, a indexării și a elementelor tehnice SEO relevante.", "Verificarea formularelor, a legăturilor și a modului de afișare înainte de lansare."],
    process: [
      { title: "Înțelegem proiectul", text: "Clarificăm oferta, publicul, conținutul și acțiunea principală de pe site." },
      { title: "Desenăm experiența", text: "Stabilim paginile, direcția vizuală și felul în care se leagă ecranele." },
      { title: "Construim și verificăm", text: "Implementăm funcțiile, revizuim împreună și testăm traseele importante." },
      { title: "Pregătim lansarea", text: "Punem la punct domeniul, publicarea și modul de administrare agreat." },
    ],
    preparation: ["Ce ar trebui să facă vizitatorul: să sune, să ceară ofertă, să rezerve sau să cumpere?", "Ce texte, fotografii și elemente de identitate ai deja?", "Ce funcții și conexiuni cu alte programe sunt esențiale?"],
    boundary: "Bugetul și termenul depind de conținut, numărul de ecrane și funcționalități. Domeniul, găzduirea, mentenanța și costurile serviciilor externe se clarifică separat în ofertă. Un site bun susține vânzarea; nu poate garanta un anumit număr de clienți.",
    faq: [
      { question: "Am nevoie de un site simplu sau de o aplicație?", answer: "Dacă vrei în principal să prezinți firma și să primești solicitări, putem porni de la un site de prezentare. Conturile de utilizator, rezervările, plățile și fluxurile interne cer o analiză mai detaliată." },
      { question: "Pot porni de la un site existent?", answer: "Da. Analizăm ce merită păstrat: conținut, structură, domeniu și funcții. Migrarea datelor și păstrarea adreselor importante se includ în plan, dacă sunt necesare." },
      { question: "Voi putea modifica singur conținutul?", answer: "Stabilim de la început ce vrei să administrezi: texte, imagini, produse sau alte date. Soluția de administrare și instruirea se aleg în funcție de proiect." },
      { question: "De unde încep dacă nu am toate detaliile?", answer: "Completează chestionarul cu ce știi acum. Putem clarifica împreună structura și prioritățile înainte de o propunere concretă." },
    ],
  },
  {
    slug: "performance-marketing", kind: "marketing", label: "Performance Marketing",
    metaTitle: "Campanii Google Ads, Meta Ads și TikTok | Next Level",
    metaDescription: "Înțelege vizual cum legăm mesajul, reclama și pagina de destinație. Strategie, creație și optimizare pentru campanii cu obiective și bugete clare.",
    eyebrow: "Performance marketing",
    title: "Din atenție, spre o acțiune care contează.",
    lead: "O reclamă funcționează într-un traseu: persoana potrivită vede un mesaj relevant, ajunge pe o pagină clară și poate face următorul pas. Lucrăm la întregul traseu, nu doar la butonul de promovare.",
    visualCaption: "Mesajul, reclama și pagina de destinație formează același traseu. Măsurăm acțiunea relevantă pentru obiectivul campaniei.",
    benefits: [
      { title: "Obiectiv înainte de lansare", text: "Alegem ce urmărim: vizite relevante, solicitări, rezervări sau comenzi." },
      { title: "Mesaj și destinație coerente", text: "Creația și pagina de după click trebuie să spună aceeași poveste." },
      { title: "Decizii bazate pe date", text: "Urmărim indicatorii disponibili și ajustăm ce poate fi îmbunătățit." },
    ],
    examples: [
      { title: "Google Ads", text: "Campanii adaptate intenției de căutare sau altor formate potrivite obiectivului." },
      { title: "Meta Ads", text: "Mesaje și creații pentru Facebook și Instagram, cu publicuri și obiective definite." },
      { title: "TikTok Ads", text: "Conținut și formate potrivite platformei, dacă publicul și oferta justifică acest canal." },
    ],
    deliverables: ["Clarificarea ofertei, a publicului și a obiectivului principal.", "Structură de campanie și recomandare de distribuire a bugetului.", "Mesaje și direcții creative adaptate canalelor selectate.", "Verificarea paginilor de destinație și a măsurării disponibile.", "Monitorizare, ajustări și raportare în forma și ritmul agreate."],
    process: [
      { title: "Definim direcția", text: "Înțelegem oferta, aria de acoperire, capacitatea și ce înseamnă o solicitare relevantă." },
      { title: "Pregătim traseul", text: "Aliniem reclama, pagina și măsurarea înainte să consumăm bugetul." },
      { title: "Lansăm controlat", text: "Pornim cu variante și limite de buget stabilite împreună." },
      { title: "Învățăm și ajustăm", text: "Comparăm datele, verificăm calitatea solicitărilor și revizuim direcția." },
    ],
    preparation: ["Ce produs sau serviciu promovăm și ce îl face relevant pentru public?", "Care sunt bugetul de promovare, zona deservită și obiectivul?", "Ce conturi, materiale creative, pagini și date de măsurare există deja?"],
    boundary: "Bugetul plătit platformelor este distinct de serviciul de administrare. Rezultatele depind de ofertă, piață, concurență, creație și experiența de după click. Măsurarea poate fi limitată de consimțământ, configurare și regulile platformelor; nu promitem un cost fix pe client sau un randament garantat.",
    faq: [
      { question: "Pe ce platformă ar trebui să încep?", answer: "Pornim de la felul în care clienții caută și aleg oferta ta. Nu este obligatoriu să folosim toate platformele; alegem canalele care se potrivesc publicului, materialelor și bugetului." },
      { question: "Ce urmărim într-o campanie?", answer: "Indicatorul principal depinde de obiectiv. Clickurile pot explica traficul, dar pentru o campanie de solicitări contează și calitatea cererilor, nu doar numărul lor." },
      { question: "Trebuie schimbată și pagina de destinație?", answer: "O verificăm înainte de lansare. Dacă mesajul, formularul sau experiența pe mobil îngreunează următorul pas, discutăm ajustările necesare și costul lor." },
      { question: "Cât durează până știm ce funcționează?", answer: "Depinde de volum, buget și tipul conversiei. Stabilim o perioadă de evaluare realistă și evităm concluziile bazate pe prea puține date." },
    ],
  },
  {
    slug: "ai-automatizari", kind: "automation", label: "AI & Automatizări",
    metaTitle: "Automatizări și integrări AI pentru afaceri | Next Level",
    metaDescription: "Vezi vizual cum o solicitare poate ajunge organizat la echipă. Conectăm aplicații și automatizăm pașii repetitivi, cu reguli și verificări clare.",
    eyebrow: "AI & automatizări",
    title: "Mai puțini pași repetați. Mai mult loc pentru idei.",
    lead: "Pornim de la un proces real din afacerea ta. Conectăm aplicațiile și automatizăm ce se repetă, păstrând oamenii în punctele în care sunt necesare decizii și verificări.",
    visualCaption: "Un exemplu de flux: solicitarea este organizată, ajunge la persoana potrivită și este verificată înainte de un răspuns important.",
    benefits: [
      { title: "Informații într-un singur flux", text: "Cererea nu mai trebuie copiată manual între toate instrumentele folosite." },
      { title: "Reguli ușor de urmărit", text: "Definim când începe fluxul, ce verifică și unde trebuie să se oprească." },
      { title: "Control asupra excepțiilor", text: "Stabilim ce se întâmplă când lipsesc date sau o conexiune nu răspunde." },
    ],
    examples: [
      { title: "Solicitări și programări", text: "Organizarea informațiilor, repartizarea lor și notificarea echipei." },
      { title: "Conținut și comunicare", text: "Pregătirea de ciorne sau rezumate, cu verificare înainte de publicare ori trimitere." },
      { title: "Centralizare și rapoarte", text: "Adunarea datelor disponibile în instrumentele folosite de afacere." },
    ],
    deliverables: ["Harta procesului actual și a punctelor care consumă timp.", "Reguli pentru declanșare, condiții, acțiuni și excepții.", "Conexiunile cu aplicațiile prevăzute în proiect, dacă permit integrarea.", "Verificări, jurnalizare și notificări pentru situațiile importante.", "Documentarea funcționării și a intervențiilor care rămân la echipă."],
    process: [
      { title: "Înțelegem procesul", text: "Identificăm sursa informației, pașii repetați și persoanele implicate." },
      { title: "Alegem regulile", text: "Separăm automatizarea sigură de cazurile care cer confirmare umană." },
      { title: "Conectăm și testăm", text: "Verificăm accesul, datele și situațiile de eroare într-un mediu potrivit." },
      { title: "Urmărim funcționarea", text: "Stabilim cine vede problemele, cine intervine și cum se fac modificările." },
    ],
    preparation: ["Ce activitate repeți și în ce aplicații lucrezi acum?", "Ce date intră în proces și cine are voie să le vadă?", "Ce acțiuni pot rula automat și ce trebuie verificat de o persoană?"],
    boundary: "Integrarea depinde de API-urile, permisiunile și abonamentele aplicațiilor. Costurile serviciilor externe și mentenanța se stabilesc în ofertă. AI-ul poate produce răspunsuri greșite; informațiile importante și deciziile cu consecințe trebuie să aibă verificări potrivite.",
    faq: [
      { question: "Trebuie să folosim AI în orice automatizare?", answer: "Nu. Multe procese funcționează mai bine cu reguli clare și conexiuni între aplicații. Folosim AI acolo unde aduce valoare, de exemplu pentru clasificare sau ciorne, cu verificări adecvate." },
      { question: "Se poate conecta orice program?", answer: "Depinde de interfețele și drepturile oferite de acel program. Verificăm API-urile, exporturile și opțiunile de integrare înainte să promitem un flux." },
      { question: "Pot păstra o etapă de aprobare?", answer: "Da. Un flux poate pregăti informația și se poate opri pentru verificare înainte de trimitere, publicare sau o altă acțiune importantă." },
      { question: "Ce se întâmplă dacă o aplicație nu răspunde?", answer: "Proiectăm tratarea erorilor în funcție de caz: oprire, notificare sau reîncercare controlată. Evitarea dublurilor și recuperarea datelor sunt parte din analiza fluxului." },
    ],
  },
];

export function getServiceDetail(slug: string) {
  return serviceDetails.find(service => service.slug === slug);
}
