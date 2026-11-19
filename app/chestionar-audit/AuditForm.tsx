"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from "lucide-react";
import { FieldLabel, MultiChoice, QuestionnaireProgress, SingleChoice, STEP_ICONS, TextAreaInput, TextInput } from "./AuditChoices";

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

const STEP_TITLES = ["Afacerea", "Ideea", "Comenzi", "Pagini", "Funcții", "Aspect", "Online", "Contact"];
const STEP_DETAILS = [
  { title: "Să începem cu afacerea ta", text: "Spune-ne cine ești și ce ai vrea să obții cu noul site." },
  { title: "Ce ai vrea să construim?", text: "Alege variantele care seamănă cu ideea ta. Le putem combina." },
  { title: "Cum vor cumpăra clienții?", text: "Site-ul poate primi comenzi, plăți sau doar cereri de ofertă." },
  { title: "Ce vor găsi oamenii pe site?", text: "Alege paginile și spune-ne ce materiale ai deja." },
  { title: "Ce le-ar fi util clienților?", text: "Alege doar ce ți se potrivește. Detaliile le stabilim împreună." },
  { title: "Cum ți-ai dori să arate?", text: "Un stil care îți place și moduri simple de a lua legătura cu tine." },
  { title: "Pregătim site-ul pentru lansare", text: "Spune-ne ce ai deja. Te putem ajuta cu restul." },
  { title: "Mai avem nevoie de câteva detalii", text: "Un termen aproximativ, un buget orientativ și cum te putem contacta." },
];

export default function AuditForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const lastStep = STEP_TITLES.length - 1;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const StepIcon = STEP_ICONS[step];

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step]);

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
        body: JSON.stringify({ ...data, questionnaireType: "advanced" }),
      });
      if (!res.ok) throw new Error("send-failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <div className="audit-success" role="status">
      <span className="audit-success-icon"><CheckCircle2 size={32} aria-hidden="true" /></span>
      <h2>Mulțumim, am primit răspunsurile tale!</h2>
      <p>Echipa Next Level le analizează și te contactează pentru a discuta pașii următori.</p>
      <a href="https://wa.me/40712345002" target="_blank" rel="noopener noreferrer" className="audit-primary-link">Ne poți scrie și pe WhatsApp <ArrowRight size={17} aria-hidden="true" /></a>
    </div>;
  }

  return (
    <div className="audit-form-shell">
      <QuestionnaireProgress step={step} titles={STEP_TITLES} />
      <div className="audit-panel">
        <div className="audit-step-heading">
          <span className="audit-step-icon"><StepIcon size={26} strokeWidth={1.7} aria-hidden="true" /></span>
          <div>
            <p className="audit-step-kicker" aria-live="polite">Pasul {step + 1} · {STEP_TITLES[step]}</p>
            <h2 ref={headingRef} tabIndex={-1}>{STEP_DETAILS[step].title}</h2>
            <p>{STEP_DETAILS[step].text}</p>
          </div>
        </div>
        <p className="audit-optional-note">Poți lăsa necompletat ce nu știi încă. Câmpurile necesare sunt marcate.</p>
        <div className="audit-fields">
        {/* STEP 0 — Afacerea ta & brand */}
        {step === 0 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel>Cum se numește afacerea ta?</FieldLabel>
              <div className="space-y-3">
                <TextInput
                  value={data.companyName}
                  onChange={(v) => set("companyName", v)}
                  placeholder="Numele firmei" label="Numele firmei" autoComplete="organization" required
                />
                <TextAreaInput
                  value={data.activity}
                  onChange={(v) => set("activity", v)}
                  placeholder="Cu ce se ocupă firma, pe scurt"
                  rows={2} label="Cu ce te ocupi?"
                />
              </div>
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Ai deja un logo și culori pentru afacere?</FieldLabel>
              <SingleChoice
                options={["Da, completă", "Parțial (doar logo)", "Nu, avem nevoie de branding"]}
                value={data.brandIdentity}
                onChange={(v) => set("brandIdentity", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel hint="Ce ar face un client interesat de afacerea ta?">
                Ce ai vrea să facă oamenii pe site?
              </FieldLabel>
              <MultiChoice
                options={["Să sune", "Să trimită mesaj / cerere de ofertă", "Să vadă portofoliul", "Să cumpere online"]}
                values={data.ctaGoals}
                onChange={(v) => set("ctaGoals", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Ai deja reclame sau o campanie de promovare?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Urmează să pornim și campaniile"]}
                value={data.linkedCampaign}
                onChange={(v) => set("linkedCampaign", v)}
              />
            </fieldset>
          </>
        )}

        {/* STEP 1 — Tipul proiectului */}
        {step === 1 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel hint="Poți alege mai multe variante.">
                Ce fel de site îți dorești?
              </FieldLabel>
              <MultiChoice
                options={["Site pentru prezentarea firmei", "Pagină pentru o campanie", "Magazin online", "Programări sau rezervări", "Restaurant sau evenimente", "Site cu anunțuri sau mai mulți vânzători", "Platformă cu conturi pentru clienți", "Cursuri sau zonă pentru membri", "Blog sau comunitate", "Alt tip de proiect"]}
                values={data.projectTypes}
                onChange={(v) => set("projectTypes", v)}
              />
            </fieldset>
            <fieldset className="audit-question">
              <FieldLabel>Pentru cine este site-ul?</FieldLabel>
              <MultiChoice
                options={["Oricine intră pe site", "Clienți persoane fizice", "Firme", "Angajații mei", "Parteneri sau furnizori", "Membri sau cursanți"]}
                values={data.audienceTypes}
                onChange={(v) => set("audienceTypes", v)}
              />
            </fieldset>
            <fieldset className="audit-question">
              <FieldLabel hint="Gândește-te la lucrul cel mai important pentru tine.">Ce rezultat îți dorești?</FieldLabel>
              <MultiChoice
                options={["Aduce cereri și clienți", "Vinde produse", "Vinde servicii", "Încasează abonamente", "Ajută echipa să lucreze", "Strânge donații", "Încă nu știm"]}
                values={data.businessModels}
                onChange={(v) => set("businessModels", v)}
              />
            </fieldset>
          </>
        )}

        {/* STEP 2 — Vânzare & operațiuni */}
        {step === 2 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel>Vrei să primești plăți prin site?</FieldLabel>
              <SingleChoice
                options={["Nu există tranzacții online", "Da, plată integrală online", "Da, avans sau garanție", "Cerere de ofertă, plata ulterior", "Încă nu știm"]}
                value={data.salesModel}
                onChange={(v) => set("salesModel", v)}
              />
            </fieldset>
            {data.salesModel && data.salesModel !== "Nu există tranzacții online" && data.salesModel !== "Încă nu știm" && (
              <>
                <fieldset className="audit-question">
                  <FieldLabel>Cam câte produse sau servicii vei prezenta?</FieldLabel>
                  <SingleChoice options={["1–20", "21–100", "101–500", "Peste 500", "Se importă din alt sistem", "Nu știm încă"]} value={data.catalogSize} onChange={(v) => set("catalogSize", v)} />
                </fieldset>
                <fieldset className="audit-question">
                  <FieldLabel>Cum ar putea plăti clienții?</FieldLabel>
                  <MultiChoice options={["Card online", "Transfer bancar", "Ramburs", "Plată la sediu", "Apple Pay / Google Pay", "Plată în rate", "Abonament recurent", "Plată în mai multe monede"]} values={data.paymentMethods} onChange={(v) => set("paymentMethods", v)} />
                </fieldset>
                <fieldset className="audit-question">
                  <FieldLabel hint="Ce trebuie să se întâmple după ce clientul comandă?">De ce mai ai nevoie pentru comenzi?</FieldLabel>
                  <MultiChoice options={["Produse și opțiuni", "Stoc", "Curier și livrare", "Facturi", "Reduceri", "Retururi", "Abonamente", "Programări", "Bilete", "Mesaje despre comandă", "Legare cu programul de gestiune"]} values={data.commerceOperations} onChange={(v) => set("commerceOperations", v)} />
                </fieldset>
              </>
            )}
            {data.salesModel === "Nu există tranzacții online" && <p className="rounded-lg bg-blue/5 px-4 py-3 text-sm leading-6 text-ink-soft">În regulă. Site-ul poate prezenta afacerea și primi mesaje, fără plăți online.</p>}
          </>
        )}

        {/* STEP 4 — Conturi, funcții & integrări */}
        {step === 4 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel>Oamenii vor avea un cont pe site?</FieldLabel>
              <SingleChoice options={["Nu, totul este public", "Da, clienții au cont", "Da, există mai multe tipuri de cont", "Doar echipa mea se conectează", "Nu știm încă"]} value={data.accountNeeds} onChange={(v) => set("accountNeeds", v)} />
            </fieldset>
            {data.accountNeeds && data.accountNeeds !== "Nu, totul este public" && (
              <fieldset className="audit-question">
                <FieldLabel>Cine se va conecta?</FieldLabel>
                <MultiChoice options={["Client", "Administrator", "Angajat", "Furnizor sau vânzător", "Partener", "Profesor", "Cursant sau membru"]} values={data.userRoles} onChange={(v) => set("userRoles", v)} />
              </fieldset>
            )}
            <fieldset className="audit-question">
              <FieldLabel hint="Alege doar ce știi că îți trebuie. Restul îl stabilim împreună.">Ce funcții ți-ar fi utile?</FieldLabel>
              <MultiChoice options={["Pagină personală după conectare", "Căutare și filtre", "Programări și calendar", "Formulare", "Trimitere documente", "Creare PDF sau contracte", "Mesaje între utilizatori", "Recenzii", "Favorite", "Alerte prin e-mail sau SMS", "Hartă", "Calculator de preț", "Rapoarte", "Ajutor cu inteligență artificială"]} values={data.platformFeatures} onChange={(v) => set("platformFeatures", v)} />
            </fieldset>
            <details className="audit-extra"><summary>Folosești deja alte programe? (opțional)</summary><div className="audit-extra-content">
<fieldset className="audit-question">
              <FieldLabel hint="Ne ajută să știm ce folosești pentru clienți sau comenzi.">Ce programe folosești deja?</FieldLabel>
              <MultiChoice options={["Plată cu cardul", "Facturare", "Program de clienți", "Program de gestiune", "Curier", "Google Calendar sau Maps", "Newsletter", "WhatsApp sau SMS", "Social media", "Statistici și reclame", "Alt program al firmei", "Nu știm încă"]} values={data.integrations} onChange={(v) => set("integrations", v)} />
            </fieldset>
            <fieldset className="audit-question">
              <FieldLabel>Ai informații de mutat în noul site?</FieldLabel>
              <SingleChoice options={["Nu", "Da, dintr-un tabel", "Da, din site-ul vechi", "Da, din alt program", "Nu știm încă"]} value={data.dataMigration} onChange={(v) => set("dataMigration", v)} />
            </fieldset>
</div></details>
            <fieldset className="audit-question">
              <FieldLabel hint="O propoziție sau două sunt suficiente.">Mai ai o idee pe care vrei să ne-o spui?</FieldLabel>
              <TextAreaInput value={data.customRequirements} onChange={(v) => set("customRequirements", v)} placeholder="Ex.: clientul cere o ofertă și o primește automat." rows={4} label="Ideea ta (opțional)" />
            </fieldset>
          </>
        )}

        {/* STEP 6 — Domeniu & Hosting */}
        {step === 6 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel hint="De exemplu, numefirma.ro.">Ai deja o adresă pentru site?</FieldLabel>
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
                    placeholder="numefirma.ro" label="Adresa site-ului"
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel hint="Serviciul care ține site-ul online.">Ai deja găzduire pentru site?</FieldLabel>
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
                    placeholder="Numele furnizorului" label="Firma care găzduiește site-ul"
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel hint="De exemplu, contact@numefirma.ro.">Vrei un e-mail cu numele firmei?</FieldLabel>
              <SingleChoice
                options={["Da, am nevoie", "Nu, folosesc deja o adresă existentă"]}
                value={data.needsEmail}
                onChange={(v) => set("needsEmail", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Vrei să ne ocupăm și de siguranța site-ului?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu știu, recomandați voi"]}
                value={data.wantsSSL}
                onChange={(v) => set("wantsSSL", v)}
              />
            </fieldset>
          </>
        )}

        {/* STEP 3 — Structură & conținut */}
        {step === 3 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel>Ce pagini ți-ar fi utile?</FieldLabel>
              <MultiChoice
                options={["Acasă", "Despre Noi", "Servicii", "Portofoliu / Lucrări", "Blog / Articole", "Contact"]}
                values={data.pages}
                onChange={(v) => set("pages", v)}
              />
              <div className="mt-3">
                <TextInput
                  value={data.pagesOther}
                  onChange={(v) => set("pagesOther", v)}
                  placeholder="Alte pagini (opțional)" label="Alte pagini (opțional)"
                />
              </div>
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Ai deja pregătite textele, pozele și logo-ul?</FieldLabel>
              <SingleChoice
                options={["Da, sunt complete", "Am o parte din ele", "Am nevoie de ajutor pentru creare"]}
                value={data.hasContent}
                onChange={(v) => set("hasContent", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>În ce limbă va fi site-ul?</FieldLabel>
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
                    placeholder="Ce altă limbă?" label="Ce altă limbă?"
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Vrei să afișezi părerile clienților?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Nu știu încă"]}
                value={data.wantsTestimonials}
                onChange={(v) => set("wantsTestimonials", v)}
              />
            </fieldset>
          </>
        )}

        {/* STEP 5 — Design & funcționalități */}
        {step === 5 && (
          <>
            <details className="audit-extra"><summary>Ai un site care îți place? (opțional)</summary><div className="audit-extra-content">
<fieldset className="audit-question">
              <FieldLabel>Lasă-ne unul sau două exemple</FieldLabel>
              <div className="space-y-3">
                <TextInput
                  value={data.likedSite1}
                  onChange={(v) => set("likedSite1", v)}
                  placeholder="Exemplu 1 (link sau nume)" label="Primul exemplu (opțional)"
                />
                <TextInput
                  value={data.likedSite2}
                  onChange={(v) => set("likedSite2", v)}
                  placeholder="Exemplu 2 (link sau nume)" label="Al doilea exemplu (opțional)"
                />
              </div>
            </fieldset>
</div></details>

            <fieldset className="audit-question">
              <FieldLabel>Ce stil îți place mai mult?</FieldLabel>
              <SingleChoice
                options={["Simplu, curat și aerisit", "Spectaculos, cu animații și efecte moderne"]}
                value={data.visualStyle}
                onChange={(v) => set("visualStyle", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Cum te-ar putea contacta clienții?</FieldLabel>
              <MultiChoice
                options={["Formular de mesaj", "Buton direct de WhatsApp", "Hartă Google", "Formular cerere ofertă"]}
                values={data.contactElements}
                onChange={(v) => set("contactElements", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel hint="De exemplu, un buton către pagina ta de Instagram.">
                Vrei să apară și rețelele tale sociale pe site?
              </FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Nu știu încă"]}
                value={data.wantsSocialIntegration}
                onChange={(v) => set("wantsSocialIntegration", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Cum ai vrea să actualizăm site-ul după lansare?</FieldLabel>
              <SingleChoice
                options={["Modificări rare, la cerere", "Pachet de mentenanță lunară"]}
                value={data.maintenance}
                onChange={(v) => set("maintenance", v)}
              />
            </fieldset>
          </>
        )}

        {/* STEP 6 — Marketing & social media */}
        {step === 6 && (
          <>
            <details className="audit-extra"><summary>Vrei ajutor și cu promovarea? (opțional)</summary><div className="audit-extra-content">
<p className="audit-inline-note">Dacă vrei, te putem ajuta și cu promovarea afacerii.</p>

            <fieldset className="audit-question">
              <FieldLabel>Pe ce rețele sociale este afacerea ta?</FieldLabel>
              <MultiChoice
                options={["Facebook", "Instagram", "TikTok"]}
                values={data.socialAccounts}
                onChange={(v) => set("socialAccounts", v)}
              />
              <div className="mt-3">
                <TextInput
                  value={data.socialOther}
                  onChange={(v) => set("socialOther", v)}
                  placeholder="Alte conturi (opțional)" label="Alte rețele (opțional)"
                />
              </div>
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Vrei să te ajutăm și cu postările?</FieldLabel>
              <SingleChoice
                options={["Da", "Nu", "Poate, ulterior"]}
                value={data.wantsSocialManagement}
                onChange={(v) => set("wantsSocialManagement", v)}
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Ce sumă ai în minte pentru reclame, pe lună?</FieldLabel>
              <SingleChoice
                options={["Nu avem încă buget alocat", "sub 500 lei", "500 – 2.000 lei", "peste 2.000 lei"]}
                value={data.adBudget}
                onChange={(v) => set("adBudget", v)}
              />
            </fieldset>
</div></details>
          </>
        )}

        {/* STEP 7 — Termen, buget & contact */}
        {step === 7 && (
          <>
            <fieldset className="audit-question">
              <FieldLabel>Când ai vrea să fie gata site-ul?</FieldLabel>
              <TextInput
                value={data.launchDate}
                onChange={(v) => set("launchDate", v)}
                placeholder="ex: în 6 săptămâni / o dată aproximativă" label="Perioada aproximativă"
              />
            </fieldset>

            <fieldset className="audit-question">
              <FieldLabel>Ce buget ai în minte pentru site?</FieldLabel>
              <TextInput
                value={data.budget}
                onChange={(v) => set("budget", v)}
                placeholder="ex: 3.000 - 5.000 lei" label="Bugetul aproximativ"
              />
            </fieldset>

            <div className="border-t border-line-light pt-6">
              <h3 className="text-base font-extrabold text-slate-900">Cum te putem contacta?</h3>
              <p className="audit-hint">Numele tău și un telefon sau un e-mail sunt suficiente.</p>
              <div className="mt-4 space-y-3">
                <TextInput
                  value={data.contactName}
                  onChange={(v) => set("contactName", v)}
                  placeholder="Nume și Prenume" label="Numele tău" autoComplete="name" required
                />
                <TextInput
                  value={data.contactPhone}
                  onChange={(v) => set("contactPhone", v)}
                  placeholder="Telefon"
                  type="tel" label="Telefon" autoComplete="tel"
                />
                <TextInput
                  value={data.contactEmail}
                  onChange={(v) => set("contactEmail", v)}
                  placeholder="Email"
                  type="email" label="E-mail" autoComplete="email"
                />
              </div>
            </div>

            {status === "error" && (
              <p role="alert" className="audit-error">
                Ceva nu a mers bine la trimitere. Ne poți scrie direct la{" "}
                <a href="mailto:contact@nextlevel-agency.ro" className="underline">
                  contact@nextlevel-agency.ro
                </a>{" "}
                sau la +40 712 345 002.
              </p>
            )}
          </>
        )}
      </div>

      <div className="audit-actions">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || status === "loading"} className="audit-back"><ArrowLeft size={17} aria-hidden="true" /> Înapoi</button>
        {step < lastStep ? (
          <button type="button" onClick={() => canContinue() && setStep((s) => Math.min(lastStep, s + 1))} disabled={!canContinue()} className="audit-next">Următorul pas <ArrowRight size={17} aria-hidden="true" /></button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={!canContinue() || status === "loading"} className="audit-next">{status === "loading" ? "Se trimite…" : "Trimite cererea"} <Send size={17} aria-hidden="true" /></button>
        )}
      </div>
      {step === 0 && !canContinue() && <p className="audit-required-note">Completează numele firmei ca să continuăm.</p>}
      {step === lastStep && <p className="audit-required-note">Sunt necesare numele tău și cel puțin un telefon sau un e-mail. Nu plătești nimic prin acest formular.</p>}
      </div>
    </div>
  );
}
