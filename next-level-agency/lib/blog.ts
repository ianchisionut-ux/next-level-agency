export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  content: string[];
};

export const posts: BlogPost[] = [
  {
    slug: "5-greseli-performance-marketing",
    title: "5 greșeli frecvente în campaniile de Performance Marketing",
    excerpt: "Cele mai comune greșeli care îți consumă bugetul de ads și cum le eviți.",
    date: "12 Iulie 2026",
    content: [
      "Aproape orice afacere care rulează reclame plătite trece, la un moment dat, prin aceleași capcane. Vestea bună e că sunt ușor de identificat și, odată corectate, aduc o îmbunătățire vizibilă a rezultatelor în doar câteva săptămâni.",
      "Prima greșeală este lipsa unui obiectiv clar de business în spatele campaniei. Multe conturi sunt optimizate după click-uri sau afișări, în loc de conversii reale — lead-uri, comenzi, apeluri. Fără o legătură directă cu ce înseamnă succes pentru afacerea ta, orice cifră de pe platformă poate arăta bine fără să însemne nimic.",
      "A doua este targetarea prea largă. Un buget mic împrăștiat pe o audiență de milioane de oameni se diluează rapid. E mult mai eficient să pornești îngust, pe un segment clar definit, și să extinzi treptat pe măsură ce datele confirmă ce funcționează.",
      "A treia greșeală: schimbi campania prea des. Algoritmii platformelor au nevoie de timp să „învețe” cui să afișeze reclama. Dacă modifici bugetul, textul sau targetarea la fiecare două zile, resetezi practic acest proces de învățare și rezultatele rămân instabile.",
      "A patra: lipsa unei pagini de destinație potrivite. O reclamă foarte bună care trimite spre o pagină generică, lentă sau confuză pierde majoritatea clicurilor plătite. Landing page-ul contează la fel de mult ca reclama în sine.",
      "În fine, a cincea greșeală este ignorarea datelor după lansare. O campanie nu se „setează și uită” — cere verificări constante, testare de variante și ajustări pe baza cifrelor reale, nu a impresiilor.",
      "Evitarea acestor cinci capcane nu garantează un succes instant, dar elimină majoritatea motivelor pentru care bugetele de marketing se pierd fără rezultate vizibile.",
    ],
  },
  {
    slug: "de-ce-branding-conteaza",
    title: "De ce brandingul contează mai mult decât crezi",
    excerpt: "Cum o identitate vizuală puternică îți crește rata de conversie.",
    date: "3 Iulie 2026",
    content: [
      "Mulți proprietari de afaceri văd brandingul ca pe un „nice to have” — ceva de care te ocupi după ce ai deja clienți și buget de sponsorizat pe rețele. În realitate, e adesea exact invers: brandingul e motivul pentru care oamenii au încredere să cumpere de la tine în primul rând.",
      "Un brand consistent — aceleași culori, același ton de comunicare, aceeași calitate vizuală pe site, pe rețele și în materialele tipărite — transmite un mesaj simplu: „știm ce facem”. Iar acest mesaj se traduce direct în încredere, iar încrederea se traduce în conversii.",
      "Gândește-te la ultima dată când ai ales între două afaceri aparent similare. Una avea un site îngrijit, un logo clar și o comunicare coerentă; cealaltă părea improvizată. În lipsa altor informații, alegem aproape instinctiv varianta care „arată” mai profesionistă — chiar dacă serviciul din spate ar fi identic.",
      "Brandingul nu înseamnă doar un logo frumos. Înseamnă claritate: ce oferi, cui te adresezi și de ce ești diferit de concurență. Fără acest fundament, orice campanie de marketing plătit devine mai scumpă, pentru că trebuie să convingă de la zero, de fiecare dată, în loc să se bazeze pe recunoaștere și încredere acumulată.",
      "Investiția în branding nu e un cost separat de marketing — este ceea ce face ca restul marketingului să funcționeze mai bine și mai ieftin, pe termen lung.",
    ],
  },
  {
    slug: "automatizari-ai-marketing",
    title: "Automatizări AI care îți economisesc ore întregi pe săptămână",
    excerpt: "Trei fluxuri de automatizare pe care le implementăm des la clienți.",
    date: "24 Iunie 2026",
    content: [
      "Automatizarea nu înseamnă să înlocuiești oamenii — înseamnă să scoți din calendarul lor task-urile repetitive, ca să rămână timp pentru deciziile care chiar contează. Iată trei fluxuri simple, dar cu impact mare, pe care le implementăm frecvent.",
      "Primul: rutarea automată a lead-urilor. În loc ca un formular de contact să ajungă într-un inbox verificat sporadic, lead-ul e trimis instant către persoana potrivită, în funcție de tipul cererii, cu notificare pe WhatsApp sau Slack. Rezultatul: timp de răspuns de minute, nu de ore, iar timpul de răspuns e unul dintre cei mai puternici factori care influențează dacă un lead se transformă în client.",
      "Al doilea: follow-up automat pe email. Majoritatea oamenilor care completează un formular nu cumpără din prima interacțiune. O secvență scurtă de 3-4 emailuri, trimisă automat în zilele următoare, recuperează o parte semnificativă din acei potențiali clienți care altfel ar fi uitați.",
      "Al treilea: rapoarte automate de performanță. În loc ca cineva să adune manual cifre din Google Ads, Meta Ads și Analytics înainte de fiecare întâlnire, un flux automatizat le centralizează într-un singur raport, trimis periodic. Se economisesc ore bune în fiecare lună, iar deciziile se iau pe baza unor date mereu actualizate.",
      "Niciunul dintre aceste fluxuri nu necesită un buget urias sau o echipă tehnică internă — sunt exact genul de automatizări pe care le construim pentru clienții noștri, adaptate la instrumentele pe care le folosesc deja.",
    ],
  },
  {
    slug: "seo-local-ghid",
    title: "SEO local: cum apari primul când clienții te caută în orașul tău",
    excerpt: "Pașii esențiali pentru Google Business Profile, recenzii și cuvinte cheie locale.",
    date: "15 Iunie 2026",
    content: [
      "Pentru majoritatea afacerilor cu o zonă geografică clară — un service auto, un restaurant, o clinică — SEO local contează mai mult decât clasamentul general pe Google. Practic, contează să apari când cineva caută exact ce oferi tu, în orașul tău.",
      "Primul pas, adesea neglijat: profilul Google Business complet și actualizat. Nume, adresă, telefon, program de funcționare, categorii corecte și poze reale ale locației. Un profil incomplet sau cu informații vechi pierde clienți înainte ca aceștia să ajungă măcar pe site.",
      "Al doilea pas: recenziile. Numărul și calitatea recenziilor influențează direct atât încrederea clienților, cât și poziția în rezultatele locale ale Google. Cere activ recenzii clienților mulțumiți — un simplu mesaj după o comandă finalizată face diferența pe termen lung.",
      "Al treilea: cuvintele cheie locale în conținutul site-ului. „Service auto Cluj-Napoca” aduce rezultate mult mai relevante decât doar „service auto”, pentru că se potrivește exact cu ce tastează cineva din zona ta. Aceste sintagme ar trebui să apară natural în titluri, descrieri și conținutul paginilor.",
      "Al patrulea: consistența datelor de contact (NAP — Name, Address, Phone) peste tot online — pe site, pe rețele sociale, în directoare de afaceri. Informații contradictorii între surse creează confuzie atât pentru clienți, cât și pentru algoritmii Google.",
      "SEO local nu e un proiect de o singură dată, ci un proces continuu — dar efortul inițial de a pune bazele corect face toată diferența în vizibilitatea pe termen lung.",
    ],
  },
  {
    slug: "cand-merita-redesign-site",
    title: "Site vechi vs. site nou: când merită să investești în redesign",
    excerpt: "Semnele că website-ul tău îți pierde clienți în loc să-i aducă.",
    date: "5 Iunie 2026",
    content: [
      "Un site nu trebuie refăcut doar pentru că „e vechi”. Există însă câteva semne clare că design-ul actual chiar te costă clienți, nu doar imagine.",
      "Primul semn: site-ul nu arată bine sau nu funcționează corect pe telefon. Majoritatea vizitatorilor vin de pe mobil — dacă textul e prea mic, butoanele greu de apăsat sau paginile se încarcă greu, pierzi vizitatori chiar înainte să afle ce oferi.",
      "Al doilea: timpul de încărcare. Un site care durează mai mult de câteva secunde să se afișeze complet pierde o parte semnificativă din vizitatori, mai ales pe conexiuni mobile mai slabe.",
      "Al treilea: lipsa unui apel la acțiune clar. Dacă un vizitator ajunge pe site și nu știe imediat ce să facă în continuare — sună, completează un formular, cere o ofertă — site-ul nu își face treaba, indiferent cât de „frumos” arată.",
      "Al patrulea: informații învechite — servicii care nu mai există, prețuri vechi, poze din alt deceniu. Asta transmite exact opusul mesajului pe care vrei să-l dai: că afacerea ta e activă și actuală.",
      "Dacă recunoști cel puțin două dintre aceste semne, un redesign nu mai e un moft estetic — este o investiție directă în rata de conversie a site-ului tău.",
    ],
  },
  {
    slug: "raport-lunar-marketing",
    title: "Cum arată un raport lunar de marketing care chiar contează",
    excerpt: "Ce cifre urmărim de fapt și de ce restul e doar zgomot.",
    date: "28 Mai 2026",
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
    content: [
      "Una dintre cele mai frecvente întrebări pe care le primim de la clienți noi este: „Ar trebui să facem reclame pe Facebook sau pe Google?” Răspunsul scurt: depinde de cum caută clienții tăi soluția de care au nevoie.",
      "Google Ads funcționează cel mai bine atunci când oamenii caută activ ceva — „instalator urgent Cluj”, „avocat divorț București”. E marketing bazat pe intenție: cineva are deja o problemă și caută o soluție chiar acum.",
      "Facebook (și Instagram) Ads funcționează diferit — oamenii nu caută activ, dar pot fi convinși de o ofertă bine prezentată în timp ce derulează feed-ul. E marketing bazat pe descoperire: potrivit pentru produse vizuale, oferte atractive sau branduri care construiesc notorietate pe termen lung.",
      "Pentru servicii urgente sau cu intenție clară de cumpărare (avocați, service auto, instalatori), Google Ads aduce de obicei rezultate mai rapide. Pentru produse fizice, servicii vizuale (design interior, modă, evenimente) sau branduri noi care trebuie să se facă cunoscute, Facebook/Instagram Ads pot performa la fel de bine sau mai bine.",
      "În practică, cele mai solide strategii nu aleg una singură — combină ambele canale, fiecare cu rolul lui: Google prinde cererea existentă, Facebook o construiește pentru viitor.",
    ],
  },
  {
    slug: "copywriting-ghid-imm",
    title: "Conținutul care vinde: ghid rapid de copywriting pentru IMM-uri",
    excerpt: "Structuri simple de texte care transformă vizitatorii în clienți.",
    date: "8 Mai 2026",
    content: [
      "Nu trebuie să fii scriitor profesionist ca să scrii texte care vând. Ai nevoie doar de o structură clară care pune clientul, nu produsul, în centrul mesajului.",
      "O structură simplă și eficientă: problemă → soluție → dovadă → acțiune. Începe prin a numi exact problema pe care o rezolvi (nu produsul în sine). Continuă cu modul în care afacerea ta rezolvă acea problemă. Adaugă o dovadă — un rezultat, o recenzie, un număr concret. Închide cu un îndemn clar la acțiune: sună, comandă, programează-te.",
      "O greșeală comună este să vorbești prea mult despre tine („Suntem lideri de piață din 2010...”) în loc despre client („Ai nevoie de o soluție rapidă pentru...”). Oamenii citesc texte de vânzare cu o singură întrebare în minte: „Ce câștig eu?” — răspunde direct la ea.",
      "Titlurile contează enorm. Un titlu vag („Servicii de calitate”) nu convinge pe nimeni. Un titlu specific („Reparăm mașina ta în aceeași zi, cu garanție 12 luni”) spune exact ce primești și de ce ar trebui să-ți pese.",
      "În fine, fiecare pagină importantă a site-ului ar trebui să aibă un singur apel la acțiune clar — nu cinci butoane diferite care concurează pentru atenția vizitatorului, ci unul singur, repetat cu încredere.",
    ],
  },
  {
    slug: "conversie-vs-trafic",
    title: "De ce rata de conversie contează mai mult decât traficul",
    excerpt: "Un site cu mai puțini vizitatori dar bine optimizat poate vinde mai mult.",
    date: "29 Aprilie 2026",
    content: [
      "„Vreau mai mult trafic pe site” este, probabil, cea mai frecventă cerere pe care o primim. Dar traficul, de unul singur, nu înseamnă nimic dacă vizitatorii nu se transformă în clienți.",
      "Imaginează-ți două site-uri: unul primește 10.000 de vizitatori pe lună și convertește 1% dintre ei (100 de clienți); altul primește doar 2.000 de vizitatori, dar convertește 6% (120 de clienți). Al doilea site are mult mai puțin trafic, dar generează mai multe rezultate — cu un buget de marketing mult mai mic.",
      "Rata de conversie depinde de factori pe care mulți îi ignoră: claritatea mesajului, viteza site-ului, încrederea transmisă (recenzii, certificări, poze reale) și simplitatea procesului de contact sau cumpărare. Fiecare pas suplimentar sau neclar dintre vizitator și acțiunea dorită reduce șansele de conversie.",
      "Înainte de a investi masiv în a aduce mai mult trafic, merită să te întrebi: site-ul meu actual convertește vizitatorii pe care îi are deja la potențialul maxim? De multe ori, câteva ajustări simple — un titlu mai clar, un formular mai scurt, un buton mai vizibil — aduc mai multe rezultate decât dublarea bugetului de reclame.",
      "Traficul aduce oameni la ușă. Rata de conversie decide câți dintre ei intră efectiv.",
    ],
  },
];
