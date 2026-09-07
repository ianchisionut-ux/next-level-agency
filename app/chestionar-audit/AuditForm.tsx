"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Check,
  Globe2,
  LayoutTemplate,
  Mail,
  Megaphone,
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
  "Domeniu & Hosting",
  "Structură & conținut",
  "Design & funcționalități",
  "Marketing & social media",
  "Termen, buget & contact",
];

const STEP_GUIDES = [
  {
    eyebrow: "Direcția proiectului",
    title: "Spune-ne ce trebuie să obțină site-ul",
    text: "Nu căutăm termeni tehnici. Vrem să înțelegem afacerea, imaginea ei și acțiunea principală pe care trebuie s-o facă vizitatorul.",
    points: ["Alege obiectivul cel mai important", "Spune-ne ce elemente de brand există deja", "Poți selecta mai multe acțiuni"],
  },
  {
    eyebrow: "Adresa și infrastructura",
    title: "Domeniul este adresa, hostingul este casa site-ului",
    text: "Dacă le ai deja, continuăm cu ele. Dacă nu, te ajutăm să alegi o adresă potrivită și să pregătim găzduirea, securitatea și e-mailul profesional.",
    points: ["Domeniu: numefirma.ro", "E-mail: contact@numefirma.ro", "SSL: lacătul de securitate din browser"],
  },
  {
    eyebrow: "Harta site-ului",
    title: "Alege paginile de care are nevoie clientul",
    text: "Gândește-te la drumul unui vizitator: află cine ești, înțelege serviciile, vede dovezi și apoi te contactează.",
    points: ["Bifează toate paginile necesare", "Menționează paginile speciale", "Spune-ne dacă ai deja texte și imagini"],
  },
  {
    eyebrow: "Aspect și funcții",
    title: "Arată-ne stilul și modul de interacțiune dorit",
    text: "Exemplele de site-uri ne ajută să înțelegem atmosfera preferată. Separat, alegi funcțiile care îi permit clientului să te contacteze ușor.",
    points: ["Curat și aerisit sau dinamic", "WhatsApp, formular, hartă ori ofertă", "Exemplele sunt orientative, nu le copiem"],
  },
  {
    eyebrow: "Promovare conectată",
    title: "Site-ul poate lucra împreună cu social media",
    text: "Răspunsurile ne arată dacă trebuie să conectăm site-ul cu paginile sociale și dacă propunerea include administrare sau campanii plătite.",
    points: ["Selectează doar conturile active", "Bugetul pentru reclame este separat de site", "Poți începe promovarea și ulterior"],
  },
  {
    eyebrow: "Încadrarea proiectului",
    title: "Un termen și un buget realist ne ajută să propunem corect",
    text: "Nu trebuie să fie valori finale. O estimare ne permite să recomandăm varianta potrivită și să planificăm etapele proiectului.",
    points: ["Poți indica o perioadă aproximativă", "Bugetul poate fi un interval", "Telefonul sau e-mailul sunt suficiente pentru răspuns"],
  },
];

function BrowserFrame({ children, address = "www.afacerea-ta.ro" }: { children: React.ReactNode; address?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl shadow-blue/10">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <div className="flex gap-1"><span className="h-2 w-2 rounded-full bg-red-400"/><span className="h-2 w-2 rounded-full bg-amber-400"/><span className="h-2 w-2 rounded-full bg-emerald-400"/></div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[9px] font-semibold text-slate-500"><ShieldCheck size={10} className="text-emerald-500"/><span className="truncate">{address}</span></div>
      </div>
      {children}
    </div>
  );
}

function StepPreview({ step }: { step: number }) {
  if (step === 0) return (
    <BrowserFrame>
      <div className="bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-wide">LOGO</span><div className="flex gap-2 text-[7px] text-white/60"><span>Servicii</span><span>Despre</span><span>Contact</span></div></div>
        <div className="py-7 text-center"><div className="mx-auto mb-2 h-2 w-3/4 rounded bg-white/90"/><div className="mx-auto mb-4 h-1.5 w-1/2 rounded bg-white/30"/><span className="inline-flex items-center gap-1 rounded-md bg-blue px-3 py-1.5 text-[8px] font-bold"><MousePointerClick size={10}/>Cere o ofertă</span></div>
      </div>
    </BrowserFrame>
  );
  if (step === 1) return (
    <BrowserFrame address="https://www.numefirma.ro">
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3"><Globe2 size={18} className="mb-2 text-blue"/><p className="text-[9px] font-black text-slate-800">numefirma.ro</p><p className="mt-1 text-[7px] text-slate-400">Domeniul tău</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3"><Mail size={18} className="mb-2 text-blue"/><p className="text-[9px] font-black text-slate-800">contact@...</p><p className="mt-1 text-[7px] text-slate-400">E-mail profesional</p></div>
      </div>
    </BrowserFrame>
  );
  if (step === 2) return (
    <BrowserFrame>
      <div className="bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-1">{["Acasă", "Despre", "Servicii", "Portofoliu", "Contact"].map((item, index) => <span key={item} className={`rounded px-2 py-1 text-[7px] font-bold ${index === 0 ? "bg-blue text-white" : "bg-slate-100 text-slate-500"}`}>{item}</span>)}</div>
        <div className="grid grid-cols-[1.35fr_.65fr] gap-2"><div className="h-20 rounded-lg bg-gradient-to-br from-blue/20 to-blue/5 p-3"><LayoutTemplate size={17} className="text-blue"/><div className="mt-2 h-1.5 w-3/4 rounded bg-slate-700"/><div className="mt-1.5 h-1 w-1/2 rounded bg-slate-300"/></div><div className="grid gap-2"><div className="rounded-lg bg-slate-100"/><div className="rounded-lg bg-slate-100"/></div></div>
      </div>
    </BrowserFrame>
  );
  if (step === 3) return (
    <BrowserFrame>
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-3">
        <div className="rounded-lg bg-white p-3"><Palette size={16} className="mb-2 text-blue"/><div className="h-2 w-3/4 rounded bg-slate-800"/><div className="mt-2 h-1 w-full rounded bg-slate-200"/><div className="mt-1 h-1 w-2/3 rounded bg-slate-200"/></div>
        <div className="overflow-hidden rounded-lg bg-gradient-to-br from-violet-600 to-blue p-3 text-white"><div className="h-5 w-5 rounded-full border border-white/50"/><div className="mt-4 h-2 w-full rounded bg-white/80"/><div className="mt-2 h-1 w-2/3 rounded bg-white/40"/></div>
        <div className="col-span-2 flex gap-1.5"><span className="flex flex-1 items-center justify-center rounded bg-emerald-500 py-1.5 text-[7px] font-bold text-white">WhatsApp</span><span className="flex flex-1 items-center justify-center rounded bg-blue py-1.5 text-[7px] font-bold text-white">Formular ofertă</span></div>
      </div>
    </BrowserFrame>
  );
  if (step === 4) return (
    <BrowserFrame>
      <div className="grid grid-cols-[.8fr_1.2fr] gap-2 bg-slate-50 p-3">
        <div className="space-y-2">{["f", "◎", "♪"].map((icon, index) => <div key={icon} className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm"><span className={`grid h-5 w-5 place-items-center rounded-md text-[10px] font-black text-white ${index === 0 ? "bg-blue" : index === 1 ? "bg-pink-500" : "bg-slate-900"}`}>{icon}</span><span className="text-[7px] font-bold text-slate-600">Cont activ</span></div>)}</div>
        <div className="rounded-lg bg-white p-3 shadow-sm"><Megaphone size={17} className="text-blue"/><p className="mt-2 text-[9px] font-black text-slate-800">Campanie conectată</p><div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full w-2/3 rounded bg-blue"/></div><p className="mt-1 text-[7px] text-slate-400">Audiență → site → cerere</p></div>
      </div>
    </BrowserFrame>
  );
  return (
    <BrowserFrame>
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4">
        <div className="rounded-lg bg-white p-3 shadow-sm"><CalendarCheck size={18} className="mb-2 text-blue"/><p className="text-[9px] font-black text-slate-800">Lansare</p><p className="mt-1 text-[7px] text-slate-400">Perioadă estimată</p></div>
        <div className="rounded-lg bg-white p-3 shadow-sm"><WalletCards size={18} className="mb-2 text-blue"/><p className="text-[9px] font-black text-slate-800">Buget</p><p className="mt-1 text-[7px] text-slate-400">Interval orientativ</p></div>
        <div className="col-span-2 flex items-center gap-2 rounded-lg border border-blue/15 bg-blue/5 p-2.5"><Check size={14} className="text-blue"/><p className="text-[8px] font-bold text-slate-600">Primești o propunere potrivită obiectivelor tale</p></div>
      </div>
    </BrowserFrame>
  );
}

function StepExplainer({ step }: { step: number }) {
  const guide = STEP_GUIDES[step];
  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl lg:sticky lg:top-24">
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue text-sm font-black">{step + 1}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-bright">Ghid vizual</p><p className="text-xs font-semibold text-white/50">{guide.eyebrow}</p></div></div>
        <h2 className="text-2xl font-extrabold leading-tight">{guide.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">{guide.text}</p>
        <div className="my-6"><StepPreview step={step}/></div>
        <ul className="space-y-2.5">{guide.points.map((point) => <li key={point} className="flex items-start gap-2.5 text-xs leading-5 text-white/70"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-blue/20 text-blue-bright"><Check size={10} strokeWidth={3}/></span>{point}</li>)}</ul>
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
      className="w-full rounded-lg border border-line-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
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
      className="w-full rounded-lg border border-line-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
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
      className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
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
    <div className="flex flex-wrap gap-2.5">
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
    <div className="flex flex-wrap gap-2.5">
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
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
      <StepExplainer step={step} />
      <div className="rounded-2xl border border-line-light bg-paper-soft p-6 shadow-sm sm:p-10">
      {/* Progress */}
      <div className="mb-8">
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

      <div className="space-y-7">
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

        {/* STEP 1 — Domeniu & Hosting */}
        {step === 1 && (
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
              <FieldLabel>Dorești certificat SSL și monitorizare uptime incluse în mentenanță?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu știu, recomandați voi"]}
                value={data.wantsSSL}
                onChange={(v) => set("wantsSSL", v)}
              />
            </div>
          </>
        )}

        {/* STEP 2 — Structură & conținut */}
        {step === 2 && (
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

        {/* STEP 3 — Design & funcționalități */}
        {step === 3 && (
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

        {/* STEP 4 — Marketing & social media */}
        {step === 4 && (
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

        {/* STEP 5 — Termen, buget & contact */}
        {step === 5 && (
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
      <div className="mt-9 flex items-center justify-between border-t border-line-light pt-6">
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
