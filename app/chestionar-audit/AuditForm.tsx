"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Check,
  Globe2,
  LayoutTemplate,
  Mail,
  MousePointerClick,
  Palette,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Chestionar & Audit — Proiect Site Web
// Formular multi-pas, adaptat după PDF-ul de audit Next Level.
// La trimitere, POST către /api/audit -> Resend trimite un email formatat
// către nextlevel.zalau@gmail.com (aceeași infrastructură de email ca restul site-ului).
// -----------------------------------------------------------------------------

type FormState = {
  companyName: string;
  activity: string;
  brandIdentity: string;
  ctaGoals: string[];
  linkedCampaign: string;
  projectTypes: string[];
  audienceTypes: string[];
  businessModels: string[];

  salesModel: string;
  catalogSize: string;
  paymentMethods: string[];
  commerceOperations: string[];

  accountNeeds: string;
  userRoles: string[];
  platformFeatures: string[];
  integrations: string[];
  customRequirements: string;
  dataMigration: string;

  hasDomain: string;
  domainName: string;
  hasHosting: string;
  hostingProvider: string;
  needsEmail: string;
  wantsSSL: string;

  pages: string[];
  pagesOther: string;
  hasContent: string;
  languages: string;
  otherLanguage: string;
  wantsTestimonials: string;

  likedSite1: string;
  likedSite2: string;
  visualStyle: string;
  contactElements: string[];
  wantsSocialIntegration: string;
  maintenance: string;

  socialAccounts: string[];
  socialOther: string;
  wantsSocialManagement: string;
  adBudget: string;

  launchDate: string;
  budget: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

const initialState: FormState = {
  companyName: "",
  activity: "",
  brandIdentity: "",
  ctaGoals: [],
  linkedCampaign: "",
  projectTypes: [],
  audienceTypes: [],
  businessModels: [],

  salesModel: "",
  catalogSize: "",
  paymentMethods: [],
  commerceOperations: [],

  accountNeeds: "",
  userRoles: [],
  platformFeatures: [],
  integrations: [],
  customRequirements: "",
  dataMigration: "",

  hasDomain: "",
  domainName: "",
  hasHosting: "",
  hostingProvider: "",
  needsEmail: "",
  wantsSSL: "",

  pages: [],
  pagesOther: "",
  hasContent: "",
  languages: "",
  otherLanguage: "",
  wantsTestimonials: "",

  likedSite1: "",
  likedSite2: "",
  visualStyle: "",
  contactElements: [],
  wantsSocialIntegration: "",
  maintenance: "",

  socialAccounts: [],
  socialOther: "",
  wantsSocialManagement: "",
  adBudget: "",

  launchDate: "",
  budget: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

const STEP_TITLES = [
  "Afacerea ta & brand",
  "Tipul proiectului",
  "Comenzi & plăți",
  "Structură & conținut",
  "Ce trebuie să poată face",
  "Design & funcționalități",
  "Domeniu & promovare",
  "Termen, buget & contact",
];

const STEP_GUIDES = [
  {
    eyebrow: "Direcția proiectului",
    title: "Spune-ne ce trebuie să obțină site-ul",
    text: "Nu căutăm termeni tehnici. Vrem să înțelegem afacerea, imaginea ei și acțiunea principală pe care trebuie s-o facă vizitatorul.",
    points: ["Alege obiectivul cel mai important", "Spune-ne ce elemente de brand există deja", "Poți selecta mai multe acțiuni"],
    example: "Exemplu: «Salon de cosmetică — programări online și prezentarea serviciilor».",
    impact: "Răspunsurile stabilesc mesajul principal, primul ecran și butoanele importante ale site-ului.",
  },
  {
    eyebrow: "Arhitectura soluției",
    title: "Site-ul poate prezenta, vinde sau ajuta oamenii să lucreze",
    text: "Poți combina mai multe tipuri. De exemplu, un site de prezentare poate avea magazin, programări și zonă privată pentru clienți.",
    points: ["Selectează toate tipurile care descriu proiectul", "Alege cine îl va folosi", "Indică modul în care proiectul produce valoare sau venit"],
    example: "Exemplu: site pentru clinică + programări online + portal privat pentru pacienți.",
    impact: "Stabilim dacă este suficient un site simplu sau este nevoie de conturi, informații salvate și funcții făcute special.",
  },
  {
    eyebrow: "Plăți și procese",
    title: "Vânzarea online înseamnă mai mult decât un buton de plată",
    text: "Produsele, serviciile, abonamentele, rezervările și comisioanele au fluxuri diferite. Selectează ce trebuie să se întâmple după comandă.",
    points: ["Spune ce vinzi și dimensiunea catalogului", "Alege metodele de plată necesare", "Bifează operațiunile: stoc, livrare, facturi, retururi sau abonamente"],
    example: "Exemplu: 100–500 produse, card și ramburs, curier, facturare și sincronizare stoc.",
    impact: "Răspunsurile stabilesc cum se încasează banii, cum se păstrează comenzile și cu ce servicii trebuie legat site-ul.",
  },
  {
    eyebrow: "Harta site-ului",
    title: "Alege paginile de care are nevoie clientul",
    text: "Gândește-te la drumul unui vizitator: află cine ești, înțelege serviciile, vede dovezi și apoi te contactează.",
    points: ["Bifează toate paginile necesare", "Menționează paginile speciale", "Spune-ne dacă ai deja texte și imagini"],
    example: "Exemplu: Acasă + Servicii + Portofoliu + Contact, în română și engleză.",
    impact: "Selecția determină meniul, volumul de conținut și estimarea de timp pentru proiect.",
  },
  {
    eyebrow: "Experiență și automatizare",
    title: "Alege ce trebuie să poată face oamenii pe site",
    text: "Poate fi un site public sau poate avea conturi, pagini personale, rezervări, documente, mesaje, alerte și legături cu programele folosite deja.",
    points: ["Spune dacă oamenii se conectează cu parolă", "Bifează acțiunile de care au nevoie", "Menționează programele folosite și informațiile care trebuie mutate"],
    example: "Exemplu: client + furnizor + administrator, dashboard separat, notificări și integrare CRM.",
    impact: "Stabilim cine vede fiecare informație, ce se întâmplă automat și ce trebuie construit special.",
  },
  {
    eyebrow: "Aspect și funcții",
    title: "Arată-ne stilul și modul de interacțiune dorit",
    text: "Exemplele de site-uri ne ajută să înțelegem atmosfera preferată. Separat, alegi funcțiile care îi permit clientului să te contacteze ușor.",
    points: ["Curat și aerisit sau dinamic", "WhatsApp, formular, hartă ori ofertă", "Exemplele sunt orientative, nu le copiem"],
    example: "Exemplu: design aerisit, buton WhatsApp și formular de cerere ofertă.",
    impact: "Alegem direcția vizuală, nivelul de animație și funcțiile care trebuie proiectate și testate.",
  },
  {
    eyebrow: "Adresa și infrastructura",
    title: "Spune-ne ce ai deja și cum vrei să fii găsit",
    text: "Domeniul este adresa site-ului, iar găzduirea îl ține online. Tot aici ne spui pe ce rețele ești prezent și dacă dorești ajutor cu promovarea.",
    points: ["Scrie domeniul dacă îl ai deja", "Alege dacă ai nevoie de e-mail profesional", "Bifează rețelele folosite și bugetul de promovare"],
    example: "Exemplu: firma.ro, e-mail profesional, Facebook și Instagram, promovare lunară.",
    impact: "Stabilim ce configurăm la lansare și cum pregătim site-ul pentru promovare și măsurarea rezultatelor.",
  },
  {
    eyebrow: "Încadrarea proiectului",
    title: "Un termen și un buget realist ne ajută să propunem corect",
    text: "Nu trebuie să fie valori finale. O estimare ne permite să recomandăm varianta potrivită și să planificăm etapele proiectului.",
    points: ["Poți indica o perioadă aproximativă", "Bugetul poate fi un interval", "Telefonul sau e-mailul sunt suficiente pentru răspuns"],
    example: "Exemplu: lansare în 6–8 săptămâni, buget orientativ 3.000–5.000 lei.",
    impact: "Putem propune o soluție realizabilă, etape clare și un calendar potrivit priorităților tale.",
  },
];

function BrowserFrame({ children, address = "www.afacerea-ta.ro" }: { children: React.ReactNode; address?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-blue/10">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400"/><span className="h-2.5 w-2.5 rounded-full bg-amber-400"/><span className="h-2.5 w-2.5 rounded-full bg-emerald-400"/></div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500"><ShieldCheck size={13} className="text-emerald-500"/><span className="truncate">{address}</span></div>
      </div>
      <div className="min-h-[250px] bg-slate-50 sm:min-h-[340px] [&>*]:min-h-[250px] sm:[&>*]:min-h-[340px] [&_p]:!text-[11px] sm:[&_p]:!text-[12px] [&_span]:!text-[9px] sm:[&_span]:!text-[11px] [&_svg]:h-5 [&_svg]:w-5">
        {children}
      </div>
    </div>
  );
}

function StepPreview({ step, data }: { step: number; data: FormState }) {
  const company = data.companyName.trim() || "AFACEREA TA";
  if (step === 0) return (
    <BrowserFrame>
      <div className="bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center justify-between"><span className="max-w-[45%] truncate text-[10px] font-black tracking-wide">{data.brandIdentity === "Nu, avem nevoie de branding" ? "LOGO NOU" : company}</span><div className="flex gap-2 text-[7px] text-white/60"><span>Servicii</span><span>Despre</span><span>Contact</span></div></div>
        <div className="py-6 text-center"><p className="truncate text-[12px] font-black">{company}</p><p className="mx-auto mt-2 max-w-[85%] truncate text-[8px] text-white/45">{data.activity.trim() || "Descrierea clară a activității"}</p><div className="mt-4 flex flex-wrap justify-center gap-1.5">{(data.ctaGoals.length ? data.ctaGoals : ["Acțiunea principală"]).slice(0, 2).map((goal) => <span key={goal} className="inline-flex max-w-[125px] items-center gap-1 truncate rounded-md bg-blue px-2.5 py-1.5 text-[7px] font-bold"><MousePointerClick size={9}/>{goal}</span>)}</div></div>
        {data.linkedCampaign && <div className="mb-2 rounded bg-white/5 px-2 py-1 text-center text-[7px] text-white/50">Campanie: {data.linkedCampaign}</div>}
      </div>
    </BrowserFrame>
  );
  if (step === 1) return (
    <BrowserFrame>
      <div className="bg-slate-50 p-4">
        <p className="mb-2 text-[8px] font-black uppercase tracking-wider text-slate-400">Arhitectura proiectului</p>
        <div className="grid grid-cols-2 gap-2">{(data.projectTypes.length ? data.projectTypes : ["Alege tipurile de proiect", "Funcțiile se pot combina"]).slice(0, 6).map((type, index) => <div key={type} className={`min-h-12 rounded-lg border p-2.5 ${index === 0 ? "border-blue/30 bg-blue/10" : "border-slate-200 bg-white"}`}><LayoutTemplate size={13} className={index === 0 ? "text-blue" : "text-slate-400"}/><p className="mt-1.5 text-[7px] font-bold leading-3 text-slate-700">{type}</p></div>)}</div>
        {(data.audienceTypes.length > 0 || data.businessModels.length > 0) && <div className="mt-2 flex flex-wrap gap-1 text-[7px]">{data.audienceTypes.slice(0, 2).map((item) => <span key={item} className="rounded bg-slate-200 px-2 py-1 text-slate-600">{item}</span>)}{data.businessModels.slice(0, 2).map((item) => <span key={item} className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">{item}</span>)}</div>}
      </div>
    </BrowserFrame>
  );
  if (step === 2) return (
    <BrowserFrame>
      <div className="bg-slate-50 p-4">
        <div className="flex items-start justify-between rounded-lg bg-white p-3 shadow-sm"><div><p className="text-[8px] font-black text-slate-800">{data.salesModel || "Model de vânzare"}</p><p className="mt-1 text-[7px] text-slate-400">{data.catalogSize || "Volum de stabilit"}</p></div><WalletCards size={19} className="text-blue"/></div>
        <div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-lg bg-white p-2.5"><p className="text-[7px] font-black uppercase text-slate-400">Plată</p>{(data.paymentMethods.length ? data.paymentMethods : ["Metode de plată"]).slice(0, 3).map((item) => <p key={item} className="mt-1 truncate text-[7px] font-semibold text-slate-600">✓ {item}</p>)}</div><div className="rounded-lg bg-white p-2.5"><p className="text-[7px] font-black uppercase text-slate-400">Operațiuni</p>{(data.commerceOperations.length ? data.commerceOperations : ["Fluxuri comerciale"]).slice(0, 3).map((item) => <p key={item} className="mt-1 truncate text-[7px] font-semibold text-slate-600">✓ {item}</p>)}</div></div>
      </div>
    </BrowserFrame>
  );
  if (step === 6) {
    const domain = data.domainName.trim() || (data.hasDomain ? "domeniu-de-completat.ro" : "domeniul-tau.ro");
    return (
    <BrowserFrame address={`https://www.${domain}`}>
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3"><Globe2 size={18} className="mb-2 text-blue"/><p className="truncate text-[9px] font-black text-slate-800">{domain}</p><p className="mt-1 text-[7px] text-slate-400">{data.hasDomain || "Domeniu neales"}</p></div>
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3"><Mail size={18} className="mb-2 text-blue"/><p className="truncate text-[9px] font-black text-slate-800">{data.needsEmail === "Da, am nevoie" ? `contact@${domain}` : "E-mail existent"}</p><p className="mt-1 text-[7px] text-slate-400">E-mail profesional</p></div>
        <div className="col-span-2 flex flex-wrap gap-1.5 text-[7px] font-bold"><span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">{data.wantsSSL === "Da" ? "SSL inclus" : "SSL de stabilit"}</span><span className="rounded bg-blue/10 px-2 py-1 text-blue">{data.hasHosting === "Da, la o firmă existentă" ? data.hostingProvider.trim() || "Hosting existent" : data.hasHosting ? "Hosting inclus" : "Hosting neales"}</span></div>
        {data.socialAccounts.length > 0 && <div className="col-span-2 flex flex-wrap gap-1">{data.socialAccounts.map((account) => <span key={account} className="rounded bg-pink-50 px-2 py-1 text-[7px] font-bold text-pink-600">{account}</span>)}</div>}
      </div>
    </BrowserFrame>
    );
  }
  if (step === 3) {
    const selectedPages = data.pages.length ? data.pages : ["Acasă", "Servicii", "Contact"];
    return (
    <BrowserFrame>
      <div className="bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-1">{selectedPages.slice(0, 6).map((item, index) => <span key={item} className={`max-w-[86px] truncate rounded px-2 py-1 text-[7px] font-bold ${index === 0 ? "bg-blue text-white" : "bg-slate-100 text-slate-500"}`}>{item}</span>)}{data.pagesOther.trim() && <span className="max-w-[86px] truncate rounded bg-blue/10 px-2 py-1 text-[7px] font-bold text-blue">{data.pagesOther}</span>}</div>
        <div className="grid grid-cols-[1.35fr_.65fr] gap-2"><div className="h-20 rounded-lg bg-gradient-to-br from-blue/20 to-blue/5 p-3"><LayoutTemplate size={17} className="text-blue"/><div className="mt-2 h-1.5 w-3/4 rounded bg-slate-700"/><div className="mt-1.5 h-1 w-1/2 rounded bg-slate-300"/></div><div className="grid gap-2"><div className="rounded-lg bg-slate-100"/><div className="rounded-lg bg-slate-100"/></div></div>
        <div className="mt-2 flex flex-wrap gap-1 text-[7px]"><span className="rounded bg-slate-100 px-2 py-1 text-slate-500">{data.hasContent || "Conținut de stabilit"}</span><span className="rounded bg-slate-100 px-2 py-1 text-slate-500">{data.languages || "Limba de stabilit"}</span>{data.wantsTestimonials === "Da" && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">★ Recenzii</span>}</div>
      </div>
    </BrowserFrame>
    );
  }
  if (step === 4) return (
    <BrowserFrame>
      <div className="grid grid-cols-[.75fr_1.25fr] gap-2 bg-slate-100 p-3">
        <div className="rounded-lg bg-slate-900 p-2.5 text-white"><p className="text-[7px] font-black uppercase text-white/40">Roluri</p>{(data.userRoles.length ? data.userRoles : [data.accountNeeds || "Acces public"]).slice(0, 4).map((role) => <div key={role} className="mt-1.5 truncate rounded bg-white/10 px-2 py-1 text-[7px]">{role}</div>)}</div>
        <div className="rounded-lg bg-white p-2.5"><p className="text-[7px] font-black uppercase text-slate-400">Funcții</p><div className="mt-2 grid grid-cols-2 gap-1">{(data.platformFeatures.length ? data.platformFeatures : ["Dashboard", "Automatizări", "Notificări", "Integrări"]).slice(0, 6).map((item) => <span key={item} className="truncate rounded bg-blue/5 px-1.5 py-1 text-[6px] font-bold text-blue">{item}</span>)}</div>{data.integrations.length > 0 && <p className="mt-2 truncate text-[7px] text-slate-400">Conectat: {data.integrations.join(", ")}</p>}</div>
        {data.customRequirements.trim() && <div className="col-span-2 truncate rounded-lg bg-amber-50 px-2.5 py-2 text-[7px] font-semibold text-amber-700">Custom: {data.customRequirements}</div>}
      </div>
    </BrowserFrame>
  );
  if (step === 5) {
    const dynamic = data.visualStyle.startsWith("Spectaculos");
    return (
    <BrowserFrame>
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-3">
        <div className={`col-span-2 overflow-hidden rounded-lg p-4 ${dynamic ? "bg-gradient-to-br from-violet-600 to-blue text-white" : "bg-white text-slate-800"}`}><Palette size={16} className="mb-2 text-blue-bright"/><p className="text-[9px] font-black">{data.visualStyle || "Stilul site-ului"}</p><div className={`mt-2 h-1 w-2/3 rounded ${dynamic ? "bg-white/40" : "bg-slate-200"}`}/>{(data.likedSite1 || data.likedSite2) && <p className={`mt-2 truncate text-[7px] ${dynamic ? "text-white/55" : "text-slate-400"}`}>Inspirat de: {[data.likedSite1, data.likedSite2].filter(Boolean).join(", ")}</p>}</div>
        <div className="col-span-2 flex flex-wrap gap-1.5">{(data.contactElements.length ? data.contactElements : ["Alege elementele de contact"]).map((item) => <span key={item} className="flex flex-1 items-center justify-center whitespace-nowrap rounded bg-blue px-2 py-1.5 text-[7px] font-bold text-white">{item}</span>)}</div>
        {data.wantsSocialIntegration === "Da" && <div className="col-span-2 rounded bg-pink-50 px-2 py-1.5 text-center text-[7px] font-bold text-pink-600">Flux Facebook / Instagram integrat</div>}
      </div>
    </BrowserFrame>
    );
  }
  return (
    <BrowserFrame>
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4">
        <div className="min-w-0 rounded-lg bg-white p-3 shadow-sm"><CalendarCheck size={18} className="mb-2 text-blue"/><p className="text-[9px] font-black text-slate-800">Lansare</p><p className="mt-1 truncate text-[7px] text-slate-400">{data.launchDate || "Perioadă estimată"}</p></div>
        <div className="min-w-0 rounded-lg bg-white p-3 shadow-sm"><WalletCards size={18} className="mb-2 text-blue"/><p className="text-[9px] font-black text-slate-800">Buget</p><p className="mt-1 truncate text-[7px] text-slate-400">{data.budget || "Interval orientativ"}</p></div>
        <div className="col-span-2 flex items-center gap-2 rounded-lg border border-blue/15 bg-blue/5 p-2.5"><Check size={14} className="shrink-0 text-blue"/><div className="min-w-0"><p className="truncate text-[8px] font-bold text-slate-600">{data.contactName || "Datele tale de contact"}</p><p className="truncate text-[7px] text-slate-400">{data.contactEmail || data.contactPhone || "Telefon sau e-mail"}</p></div></div>
      </div>
    </BrowserFrame>
  );
}

function StepExplainer({ step, data }: { step: number; data: FormState }) {
  const guide = STEP_GUIDES[step];
  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl lg:sticky lg:top-24">
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue text-sm font-black">{step + 1}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-bright">Ghid vizual</p><p className="text-xs font-semibold text-white/50">{guide.eyebrow}</p></div></div>
        <h2 className="text-2xl font-extrabold leading-tight">{guide.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">{guide.text}</p>
        <div className="my-6" aria-live="polite"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Previzualizare live</p><span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>se actualizează</span></div><StepPreview step={step} data={data}/></div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Cum completezi pasul</p>
        <ul className="space-y-2.5">{guide.points.map((point) => <li key={point} className="flex items-start gap-2.5 text-xs leading-5 text-white/70"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-blue/20 text-blue-bright"><Check size={10} strokeWidth={3}/></span>{point}</li>)}</ul>
        <div className="mt-5 space-y-2.5"><div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-blue-bright">Exemplu de răspuns</p><p className="mt-1.5 text-[11px] leading-5 text-white/65">{guide.example}</p></div><div className="rounded-xl border border-blue/20 bg-blue/10 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-blue-bright">Ce influențează</p><p className="mt-1.5 text-[11px] leading-5 text-white/65">{guide.impact}</p></div></div>
      </div>
      <div className="border-t border-white/10 bg-white/5 px-6 py-4 text-[11px] leading-5 text-white/45 sm:px-8">Nu există răspunsuri greșite. Recomandarea finală va fi adaptată situației tale.</div>
    </aside>
  );
}

function toggleInArray(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// ---------- UI helpers, stilate cu tokenurile Tailwind ale site-ului ----------

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-bold text-slate-900">{children}</p>
      {hint ? <p className="mt-0.5 text-xs italic text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-line-light bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue"
    />
  );
}

function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-line-light bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue"
    />
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
        active
          ? "border-blue bg-blue text-white"
          : "border-line-light bg-white text-ink-soft hover:border-blue/40"
      }`}
    >
      {label}
    </button>
  );
}

function SingleChoice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Pill key={opt} label={opt} active={value === opt} onClick={() => onChange(opt)} />
      ))}
    </div>
  );
}

function MultiChoice({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Pill
          key={opt}
          label={opt}
          active={values.includes(opt)}
          onClick={() => onChange(toggleInArray(values, opt))}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AuditForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const lastStep = STEP_TITLES.length - 1;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const canContinue = () => {
    if (step === 0) return data.companyName.trim().length > 0;
    if (step === lastStep)
      return (
        data.contactName.trim().length > 0 &&
        (data.contactPhone.trim().length > 0 || data.contactEmail.trim().length > 0)
      );
    return true;
  };

  async function handleSubmit() {
    setStatus("loading");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("send-failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border-2 border-blue bg-paper-soft p-10 text-center">
        <p className="eyebrow text-blue">Mulțumim!</p>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-900">
          Am primit chestionarul tău
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Înțelegem afacerea ta ca s-o ducem la următorul nivel. Echipa Next Level
          analizează răspunsurile și revine cu o propunere personalizată în cel mai
          scurt timp, de obicei în câteva ore.
        </p>
        <a
          href={`https://wa.me/40740565663`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-lg bg-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-glow"
        >
          Scrie-ne pe WhatsApp între timp
        </a>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(520px,0.8fr)] lg:gap-8 xl:gap-10">
      <StepExplainer step={step} data={data} />
      <div className="rounded-2xl border border-line-light bg-paper-soft p-5 shadow-sm sm:p-7">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-blue">
            Pasul {step + 1} din {STEP_TITLES.length}
          </p>
          <p className="text-xs font-semibold text-ink-soft">{STEP_TITLES[step]}</p>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-light">
          <div
            className="h-full rounded-full bg-blue transition-all"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-5">
        {/* STEP 0 — Afacerea ta & brand */}
        {step === 0 && (
          <>
            <div>
              <FieldLabel>Numele firmei și obiectul de activitate</FieldLabel>
              <div className="space-y-3">
                <TextInput
                  value={data.companyName}
                  onChange={(v) => set("companyName", v)}
                  placeholder="Numele firmei"
                />
                <TextAreaInput
                  value={data.activity}
                  onChange={(v) => set("activity", v)}
                  placeholder="Cu ce se ocupă firma, pe scurt"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Aveți deja o identitate de brand (logo, culori, font-uri) definită?</FieldLabel>
              <SingleChoice
                options={["Da, completă", "Parțial (doar logo)", "Nu, avem nevoie de branding"]}
                value={data.brandIdentity}
                onChange={(v) => set("brandIdentity", v)}
              />
            </div>

            <div>
              <FieldLabel hint="Bifează acțiunea principală (call-to-action) pe care vrei s-o facă.">
                Ce dorești să facă vizitatorul când intră pe site?
              </FieldLabel>
              <MultiChoice
                options={["Să sune", "Să trimită mesaj / cerere de ofertă", "Să vadă portofoliul", "Să cumpere online"]}
                values={data.ctaGoals}
                onChange={(v) => set("ctaGoals", v)}
              />
            </div>

            <div>
              <FieldLabel>Site-ul se leagă de o campanie de marketing sau social media deja în derulare?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Urmează să pornim și campaniile"]}
                value={data.linkedCampaign}
                onChange={(v) => set("linkedCampaign", v)}
              />
            </div>
          </>
        )}

        {/* STEP 1 — Tipul proiectului */}
        {step === 1 && (
          <>
            <div>
              <FieldLabel hint="Poți combina oricâte variante. Dacă proiectul nu se încadrează perfect, selectează «Alt proiect personalizat». ">
                Ce fel de website sau platformă dorești?
              </FieldLabel>
              <MultiChoice
                options={["Site pentru prezentarea firmei", "Pagină pentru o campanie", "Magazin online", "Programări sau rezervări", "Restaurant sau evenimente", "Site cu anunțuri sau mai mulți vânzători", "Platformă cu conturi pentru clienți", "Cursuri sau zonă pentru membri", "Blog sau comunitate", "Alt tip de proiect"]}
                values={data.projectTypes}
                onChange={(v) => set("projectTypes", v)}
              />
            </div>
            <div>
              <FieldLabel>Cine va folosi proiectul?</FieldLabel>
              <MultiChoice
                options={["Oricine intră pe site", "Clienți persoane fizice", "Firme", "Angajații mei", "Parteneri sau furnizori", "Membri sau cursanți"]}
                values={data.audienceTypes}
                onChange={(v) => set("audienceTypes", v)}
              />
            </div>
            <div>
              <FieldLabel hint="Alege ce rezultat vrei să obții prin site.">Cum va ajuta site-ul afacerea?</FieldLabel>
              <MultiChoice
                options={["Aduce cereri și clienți", "Vinde produse", "Vinde servicii", "Încasează abonamente", "Ajută echipa să lucreze", "Strânge donații", "Încă nu știm"]}
                values={data.businessModels}
                onChange={(v) => set("businessModels", v)}
              />
            </div>
          </>
        )}

        {/* STEP 2 — Vânzare & operațiuni */}
        {step === 2 && (
          <>
            <div>
              <FieldLabel>Vor exista plăți sau comenzi prin website?</FieldLabel>
              <SingleChoice
                options={["Nu există tranzacții online", "Da, plată integrală online", "Da, avans sau garanție", "Cerere de ofertă, plata ulterior", "Încă nu știm"]}
                value={data.salesModel}
                onChange={(v) => set("salesModel", v)}
              />
            </div>
            {data.salesModel !== "Nu există tranzacții online" && (
              <>
                <div>
                  <FieldLabel>Volumul estimat de produse, servicii sau listări</FieldLabel>
                  <SingleChoice options={["1–20", "21–100", "101–500", "Peste 500", "Se importă din alt sistem", "Nu știm încă"]} value={data.catalogSize} onChange={(v) => set("catalogSize", v)} />
                </div>
                <div>
                  <FieldLabel>Metode de plată necesare</FieldLabel>
                  <MultiChoice options={["Card online", "Transfer bancar", "Ramburs", "Plată la sediu", "Apple Pay / Google Pay", "Plată în rate", "Abonament recurent", "Plată în mai multe monede"]} values={data.paymentMethods} onChange={(v) => set("paymentMethods", v)} />
                </div>
                <div>
                  <FieldLabel hint="Ce trebuie să se întâmple după ce clientul comandă?">Ce trebuie să administrăm?</FieldLabel>
                  <MultiChoice options={["Produse și opțiuni", "Stoc", "Curier și livrare", "Facturi", "Reduceri", "Retururi", "Abonamente", "Programări", "Bilete", "Mesaje despre comandă", "Legare cu programul de gestiune"]} values={data.commerceOperations} onChange={(v) => set("commerceOperations", v)} />
                </div>
              </>
            )}
            {data.salesModel === "Nu există tranzacții online" && <p className="rounded-lg bg-blue/5 px-4 py-3 text-sm leading-6 text-ink-soft">Perfect. Proiectul poate genera cereri, programări sau contacte fără să proceseze plăți. Funcțiile relevante se aleg la pasul următor.</p>}
          </>
        )}

        {/* STEP 4 — Conturi, funcții & integrări */}
        {step === 4 && (
          <>
            <div>
              <FieldLabel>Oamenii trebuie să se conecteze cu e-mail și parolă?</FieldLabel>
              <SingleChoice options={["Nu, totul este public", "Da, clienții au cont", "Da, există mai multe tipuri de cont", "Doar echipa mea se conectează", "Nu știm încă"]} value={data.accountNeeds} onChange={(v) => set("accountNeeds", v)} />
            </div>
            {data.accountNeeds && data.accountNeeds !== "Nu, totul este public" && (
              <div>
                <FieldLabel>Cine se va conecta?</FieldLabel>
                <MultiChoice options={["Client", "Administrator", "Angajat", "Furnizor sau vânzător", "Partener", "Profesor", "Cursant sau membru"]} values={data.userRoles} onChange={(v) => set("userRoles", v)} />
              </div>
            )}
            <div>
              <FieldLabel hint="Alege doar ce știi că îți trebuie. Restul îl stabilim împreună.">Ce ar trebui să poată face site-ul?</FieldLabel>
              <MultiChoice options={["Pagină personală după conectare", "Căutare și filtre", "Programări și calendar", "Formulare", "Trimitere documente", "Creare PDF sau contracte", "Mesaje între utilizatori", "Recenzii", "Favorite", "Alerte prin e-mail sau SMS", "Hartă", "Calculator de preț", "Rapoarte", "Ajutor cu inteligență artificială"]} values={data.platformFeatures} onChange={(v) => set("platformFeatures", v)} />
            </div>
            <div>
              <FieldLabel hint="Dacă nu recunoști o opțiune, nu trebuie s-o alegi.">Cu ce servicii folosite deja trebuie legat?</FieldLabel>
              <MultiChoice options={["Plată cu cardul", "Facturare", "Program de clienți", "Program de gestiune", "Curier", "Google Calendar sau Maps", "Newsletter", "WhatsApp sau SMS", "Social media", "Statistici și reclame", "Alt program al firmei", "Nu știm încă"]} values={data.integrations} onChange={(v) => set("integrations", v)} />
            </div>
            <div>
              <FieldLabel>Ai informații care trebuie mutate în noul site?</FieldLabel>
              <SingleChoice options={["Nu", "Da, dintr-un tabel", "Da, din site-ul vechi", "Da, din alt program", "Nu știm încă"]} value={data.dataMigration} onChange={(v) => set("dataMigration", v)} />
            </div>
            <div>
              <FieldLabel hint="Descrie orice flux special, chiar dacă nu știi cum se numește tehnic. ">Alte funcții sau automatizări</FieldLabel>
              <TextAreaInput value={data.customRequirements} onChange={(v) => set("customRequirements", v)} placeholder="Ex: clientul completează un formular, primește automat oferta PDF, semnează și achită avansul..." rows={4} />
            </div>
          </>
        )}

        {/* STEP 6 — Domeniu & Hosting */}
        {step === 6 && (
          <>
            <div>
              <FieldLabel>Ai deja un domeniu web cumpărat? (ex: numefirma.ro)</FieldLabel>
              <SingleChoice
                options={["Da, îl am deja", "Nu, doresc sprijin pentru alegere și achiziție"]}
                value={data.hasDomain}
                onChange={(v) => set("hasDomain", v)}
              />
              {data.hasDomain === "Da, îl am deja" && (
                <div className="mt-3">
                  <TextInput
                    value={data.domainName}
                    onChange={(v) => set("domainName", v)}
                    placeholder="numefirma.ro"
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Ai deja un serviciu de găzduire (hosting) activ?</FieldLabel>
              <SingleChoice
                options={["Da, la o firmă existentă", "Nu, doresc ca găzduirea să fie inclusă în proiect"]}
                value={data.hasHosting}
                onChange={(v) => set("hasHosting", v)}
              />
              {data.hasHosting === "Da, la o firmă existentă" && (
                <div className="mt-3">
                  <TextInput
                    value={data.hostingProvider}
                    onChange={(v) => set("hostingProvider", v)}
                    placeholder="Numele firmei de hosting"
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Ai nevoie de adrese de e-mail profesionale? (ex: contact@numefirma.ro)</FieldLabel>
              <SingleChoice
                options={["Da, am nevoie", "Nu, folosesc deja o adresă existentă"]}
                value={data.needsEmail}
                onChange={(v) => set("needsEmail", v)}
              />
            </div>

            <div>
              <FieldLabel>Vrei să includem securizarea site-ului și verificarea că rămâne online?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu știu, recomandați voi"]}
                value={data.wantsSSL}
                onChange={(v) => set("wantsSSL", v)}
              />
            </div>
          </>
        )}

        {/* STEP 3 — Structură & conținut */}
        {step === 3 && (
          <>
            <div>
              <FieldLabel>Ce pagini dorești să includem?</FieldLabel>
              <MultiChoice
                options={["Acasă", "Despre Noi", "Servicii", "Portofoliu / Lucrări", "Blog / Articole", "Contact"]}
                values={data.pages}
                onChange={(v) => set("pages", v)}
              />
              <div className="mt-3">
                <TextInput
                  value={data.pagesOther}
                  onChange={(v) => set("pagesOther", v)}
                  placeholder="Alte pagini (opțional)"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Ai deja pregătite textele, pozele și logo-ul?</FieldLabel>
              <SingleChoice
                options={["Da, sunt complete", "Am o parte din ele", "Am nevoie de ajutor pentru creare"]}
                value={data.hasContent}
                onChange={(v) => set("hasContent", v)}
              />
            </div>

            <div>
              <FieldLabel>Limbi de afișare pe site</FieldLabel>
              <SingleChoice
                options={["Doar în română", "Română + altă limbă"]}
                value={data.languages}
                onChange={(v) => set("languages", v)}
              />
              {data.languages === "Română + altă limbă" && (
                <div className="mt-3">
                  <TextInput
                    value={data.otherLanguage}
                    onChange={(v) => set("otherLanguage", v)}
                    placeholder="Ce altă limbă?"
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Dorești secțiune de recenzii / testimoniale clienți pe site?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Nu știu încă"]}
                value={data.wantsTestimonials}
                onChange={(v) => set("wantsTestimonials", v)}
              />
            </div>
          </>
        )}

        {/* STEP 5 — Design & funcționalități */}
        {step === 5 && (
          <>
            <div>
              <FieldLabel>Exemple de site-uri care îți plac (design sau mod de lucru)</FieldLabel>
              <div className="space-y-3">
                <TextInput
                  value={data.likedSite1}
                  onChange={(v) => set("likedSite1", v)}
                  placeholder="Exemplu 1 (link sau nume)"
                />
                <TextInput
                  value={data.likedSite2}
                  onChange={(v) => set("likedSite2", v)}
                  placeholder="Exemplu 2 (link sau nume)"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Stilul vizual preferat</FieldLabel>
              <SingleChoice
                options={["Simplu, curat și aerisit", "Spectaculos, cu animații și efecte moderne"]}
                value={data.visualStyle}
                onChange={(v) => set("visualStyle", v)}
              />
            </div>

            <div>
              <FieldLabel>Elemente de contact rapid pe site</FieldLabel>
              <MultiChoice
                options={["Formular de mesaj", "Buton direct de WhatsApp", "Hartă Google", "Formular cerere ofertă"]}
                values={data.contactElements}
                onChange={(v) => set("contactElements", v)}
              />
            </div>

            <div>
              <FieldLabel hint="Ex: afișare automată a ultimelor postări, butoane de urmărire.">
                Dorești integrare cu rețelele sociale (Facebook / Instagram) pe site?
              </FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Nu știu încă"]}
                value={data.wantsSocialIntegration}
                onChange={(v) => set("wantsSocialIntegration", v)}
              />
            </div>

            <div>
              <FieldLabel>După lansare, cine se va ocupa de actualizarea textelor/pozelor?</FieldLabel>
              <SingleChoice
                options={["Modificări rare, la cerere", "Pachet de mentenanță lunară"]}
                value={data.maintenance}
                onChange={(v) => set("maintenance", v)}
              />
            </div>
          </>
        )}

        {/* STEP 6 — Marketing & social media */}
        {step === 6 && (
          <>
            <p className="rounded-lg bg-blue/5 px-4 py-3 text-xs italic leading-relaxed text-ink-soft">
              Next Level oferă și management de social media printr-o platformă proprie de
              administrare și programare a postărilor. Această secțiune ne ajută să vedem
              dacă site-ul trebuie conectat cu strategia voastră de social media.
            </p>

            <div>
              <FieldLabel>Aveți deja conturi active de social media?</FieldLabel>
              <MultiChoice
                options={["Facebook", "Instagram", "TikTok"]}
                values={data.socialAccounts}
                onChange={(v) => set("socialAccounts", v)}
              />
              <div className="mt-3">
                <TextInput
                  value={data.socialOther}
                  onChange={(v) => set("socialOther", v)}
                  placeholder="Alte conturi (opțional)"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Doriți ca Next Level să preia administrarea și programarea postărilor pe social media?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Poate, ulterior"]}
                value={data.wantsSocialManagement}
                onChange={(v) => set("wantsSocialManagement", v)}
              />
            </div>

            <div>
              <FieldLabel>Bugetul lunar orientativ pentru campanii de promovare (ads)</FieldLabel>
              <SingleChoice
                options={["Nu avem încă buget alocat", "sub 500 lei", "500 – 2.000 lei", "peste 2.000 lei"]}
                value={data.adBudget}
                onChange={(v) => set("adBudget", v)}
              />
            </div>
          </>
        )}

        {/* STEP 7 — Termen, buget & contact */}
        {step === 7 && (
          <>
            <div>
              <FieldLabel>Data dorită pentru lansare</FieldLabel>
              <TextInput
                value={data.launchDate}
                onChange={(v) => set("launchDate", v)}
                placeholder="ex: în 6 săptămâni / o dată aproximativă"
              />
            </div>

            <div>
              <FieldLabel>Bugetul orientativ alocat pentru proiect</FieldLabel>
              <TextInput
                value={data.budget}
                onChange={(v) => set("budget", v)}
                placeholder="ex: 3.000 - 5.000 lei"
              />
            </div>

            <div className="border-t border-line-light pt-6">
              <h3 className="text-base font-extrabold text-slate-900">Date de contact</h3>
              <div className="mt-4 space-y-3">
                <TextInput
                  value={data.contactName}
                  onChange={(v) => set("contactName", v)}
                  placeholder="Nume și Prenume"
                />
                <TextInput
                  value={data.contactPhone}
                  onChange={(v) => set("contactPhone", v)}
                  placeholder="Telefon"
                  type="tel"
                />
                <TextInput
                  value={data.contactEmail}
                  onChange={(v) => set("contactEmail", v)}
                  placeholder="Email"
                  type="email"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                Ceva nu a mers bine la trimitere. Ne poți scrie direct la{" "}
                <a href="mailto:nextlevel.zalau@gmail.com" className="underline">
                  nextlevel.zalau@gmail.com
                </a>{" "}
                sau la +40 740 565 663.
              </p>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-line-light pt-5">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-line-light px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:border-blue/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Înapoi
        </button>

        {step < lastStep ? (
          <button
            type="button"
            onClick={() => canContinue() && setStep((s) => Math.min(lastStep, s + 1))}
            disabled={!canContinue()}
            className="rounded-lg bg-blue px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuă
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canContinue() || status === "loading"}
            className="rounded-lg bg-blue px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "loading" ? "Se trimite..." : "Trimite chestionarul"}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
