"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Palette, Send, Store, UserRound } from "lucide-react";
import { FieldLabel, MultiChoice, QuestionnaireProgress, SingleChoice, TextAreaInput, TextInput } from "../chestionar-audit/AuditChoices";

type FormState = {
  companyName: string; activity: string; ctaGoals: string[]; pages: string[]; pagesOther: string;
  brandIdentity: string; hasContent: string; visualStyle: string; likedSite1: string;
  contactElements: string[]; hasDomain: string; domainName: string; languages: string;
  otherLanguage: string; launchDate: string; budget: string; customRequirements: string;
  contactName: string; contactPhone: string; contactEmail: string;
};

const initialState: FormState = {
  companyName: "", activity: "", ctaGoals: [], pages: ["Acasă", "Despre noi", "Servicii", "Contact"],
  pagesOther: "", brandIdentity: "", hasContent: "", visualStyle: "", likedSite1: "",
  contactElements: ["Formular de contact"], hasDomain: "", domainName: "",
  languages: "Doar în română", otherLanguage: "", launchDate: "", budget: "",
  customRequirements: "", contactName: "", contactPhone: "", contactEmail: "",
};

const steps = ["Despre firmă", "Paginile site-ului", "Aspect și conținut", "Termen și contact"];
const stepIcons = [Store, FileText, Palette, UserRound];
const stepDetails = [
  { title: "Să începem cu afacerea ta", text: "Spune-ne cine ești și cum te-ar putea ajuta noul site." },
  { title: "Ce vor găsi oamenii pe site?", text: "Am bifat paginile de bază. Păstrează-le sau alege ce ți se potrivește." },
  { title: "Cum ți-ai dori să arate?", text: "Un stil care îți place și materialele de la care putem porni." },
  { title: "Mai avem doar câteva detalii", text: "Spune-ne când ai vrea să lansăm site-ul și cum te putem contacta." },
];

function Choices({ options, values, onChange, single = false }: { options: string[]; values: string[]; onChange: (values: string[]) => void; single?: boolean }) {
  return single ? <SingleChoice options={options} value={values[0] || ""} onChange={value => onChange([value])} /> : <MultiChoice options={options} values={values} onChange={onChange} />;
}

export default function SimplePresentationForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const sending = useRef(false);
  const StepIcon = stepIcons[step];
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setData((current) => ({ ...current, [key]: value }));
  const canContinue = step === 0
    ? Boolean(data.companyName.trim() && data.activity.trim())
    : step === 3
      ? Boolean(data.contactName.trim() && (data.contactPhone.trim() || data.contactEmail.trim()))
      : true;

  async function submit() {
    if (!canContinue || sending.current) return;
    sending.current = true;
    setStatus("loading");
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          questionnaireType: "simple-presentation",
          projectTypes: ["Site pentru prezentarea firmei"],
          audienceTypes: ["Oricine intră pe site"],
          businessModels: ["Aduce cereri și clienți"],
          salesModel: "Nu există tranzacții online",
          accountNeeds: "Nu, totul este public",
          wantsSSL: "Da",
        }),
      });
      if (!response.ok) throw new Error("save-failed");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  if (status === "success") return (
    <div className="audit-success" role="status">
      <span className="audit-success-icon"><CheckCircle2 size={32} aria-hidden="true" /></span>
      <h2>Mulțumim, am primit răspunsurile tale!</h2>
      <p>Analizăm informațiile și te contactăm pentru o propunere potrivită afacerii tale.</p>
      <a href="https://wa.me/40712345002" target="_blank" rel="noopener noreferrer" className="audit-primary-link">Ne poți scrie și pe WhatsApp</a>
    </div>
  );

  return (
    <div className="audit-form-shell">
      <QuestionnaireProgress step={step} titles={steps} icons={stepIcons} />
      <section className="audit-panel" aria-labelledby="simple-step-heading">
        <div className="audit-step-heading">
          <span className="audit-step-icon"><StepIcon size={26} strokeWidth={1.7} aria-hidden="true" /></span>
          <div><p className="audit-step-kicker" aria-live="polite">Pasul {step + 1} · {steps[step]}</p><h2 id="simple-step-heading" ref={headingRef} tabIndex={-1}>{stepDetails[step].title}</h2><p>{stepDetails[step].text}</p></div>
        </div>
        <p className="audit-optional-note">Completează ce știi acum. Câmpurile necesare sunt marcate, iar răspunsurile rămân când revii la un pas anterior.</p>
        <div className="audit-fields">
          {step === 0 && <>
            <fieldset className="audit-question"><FieldLabel>Cum se numește afacerea ta?</FieldLabel><TextInput label="Numele firmei" required autoComplete="organization" value={data.companyName} onChange={(value) => set("companyName", value)} placeholder="Numele firmei" /></fieldset>
            <fieldset className="audit-question"><FieldLabel>Cu ce te ocupi?</FieldLabel><TextAreaInput label="Activitatea firmei · obligatoriu" value={data.activity} onChange={value => set("activity", value)} placeholder="Serviciile sau produsele pe care le oferi, pe scurt" /></fieldset>
            <fieldset className="audit-question"><FieldLabel>Ce ai vrea să facă oamenii pe site?</FieldLabel><Choices options={["Să sune", "Să trimită un mesaj", "Să ceară o ofertă", "Să vadă serviciile", "Să vadă portofoliul", "Să găsească locația"]} values={data.ctaGoals} onChange={(values) => set("ctaGoals", values)} /></fieldset>
          </>}

          {step === 1 && <>
            <fieldset className="audit-question"><FieldLabel hint="Am selectat deja o structură de bază. O poți modifica.">Ce pagini îți dorești?</FieldLabel><Choices options={["Acasă", "Despre noi", "Servicii", "Portofoliu / Lucrări", "Galerie foto", "Recenzii", "Blog", "Contact"]} values={data.pages} onChange={(values) => set("pages", values)} /></fieldset>
            <TextInput label="Alte pagini sau secțiuni · opțional" value={data.pagesOther} onChange={(value) => set("pagesOther", value)} placeholder="Spune-ne dacă mai lipsește ceva" />
            <fieldset className="audit-question"><FieldLabel>În ce limbă va fi site-ul?</FieldLabel><Choices single options={["Doar în română", "Română + altă limbă"]} values={[data.languages]} onChange={(values) => set("languages", values[0] || "")} />{data.languages === "Română + altă limbă" && <TextInput label="Ce altă limbă?" value={data.otherLanguage} onChange={(value) => set("otherLanguage", value)} placeholder="De exemplu: engleză sau maghiară" />}</fieldset>
          </>}

          {step === 2 && <>
            <fieldset className="audit-question"><FieldLabel>Ai deja un logo și culorile firmei?</FieldLabel><Choices single options={["Da, identitatea este completă", "Am doar logo-ul", "Nu, am nevoie de ajutor"]} values={data.brandIdentity ? [data.brandIdentity] : []} onChange={(values) => set("brandIdentity", values[0] || "")} /></fieldset>
            <fieldset className="audit-question"><FieldLabel>Ai textele și fotografiile pregătite?</FieldLabel><Choices single options={["Da, sunt pregătite", "Doar o parte", "Am nevoie de ajutor"]} values={data.hasContent ? [data.hasContent] : []} onChange={(values) => set("hasContent", values[0] || "")} /></fieldset>
            <fieldset className="audit-question"><FieldLabel>Ce stil îți place?</FieldLabel><Choices single options={["Simplu, curat și aerisit", "Elegant și premium", "Modern, cu animații discrete", "Nu știu, recomandați voi"]} values={data.visualStyle ? [data.visualStyle] : []} onChange={(values) => set("visualStyle", values[0] || "")} /></fieldset>
            <TextInput label="Un site care îți place · opțional" value={data.likedSite1} onChange={(value) => set("likedSite1", value)} placeholder="Linkul sau numele site-ului" />
            <fieldset className="audit-question"><FieldLabel>Cum te vor contacta oamenii?</FieldLabel><Choices options={["Formular de contact", "Buton WhatsApp", "Telefon", "Hartă Google"]} values={data.contactElements} onChange={(values) => set("contactElements", values)} /></fieldset>
          </>}

          {step === 3 && <>
            <fieldset className="audit-question"><FieldLabel>Ai deja adresa site-ului?</FieldLabel><Choices single options={["Da, îl am deja", "Nu, am nevoie de ajutor"]} values={data.hasDomain ? [data.hasDomain] : []} onChange={(values) => set("hasDomain", values[0] || "")} />{data.hasDomain === "Da, îl am deja" && <TextInput label="Adresa site-ului" value={data.domainName} onChange={(value) => set("domainName", value)} placeholder="exemplu.ro" />}</fieldset>
            <div className="audit-input-row"><TextInput label="Când ai vrea să lansăm site-ul? · opțional" value={data.launchDate} onChange={(value) => set("launchDate", value)} placeholder="De exemplu: în 4–6 săptămâni" /><TextInput label="Buget orientativ · opțional" value={data.budget} onChange={(value) => set("budget", value)} placeholder="Un interval aproximativ, în lei sau euro" /></div>
            <TextAreaInput label="Alte detalii · opțional" value={data.customRequirements} onChange={value => set("customRequirements", value)} placeholder="Ce altceva ar fi bine să știm?" />
            <fieldset className="audit-question"><FieldLabel hint="Avem nevoie de numele tău și cel puțin un număr de telefon sau o adresă de e-mail.">Cum luăm legătura cu tine?</FieldLabel><div className="audit-fields"><TextInput label="Nume și prenume" required autoComplete="name" value={data.contactName} onChange={(value) => set("contactName", value)} /><div className="audit-input-row"><TextInput label="Telefon" autoComplete="tel" value={data.contactPhone} onChange={(value) => set("contactPhone", value)} type="tel" /><TextInput label="E-mail" autoComplete="email" value={data.contactEmail} onChange={(value) => set("contactEmail", value)} type="email" /></div></div></fieldset>
            {status === "error" && <p className="audit-error" role="alert">Trimiterea nu a reușit. Răspunsurile tale sunt păstrate aici. Încearcă din nou sau scrie-ne pe WhatsApp.</p>}
          </>}
        </div>

        <div className="audit-actions">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || status === "loading"} className="audit-back"><ChevronLeft size={17} aria-hidden="true" /> Înapoi</button>
          {step < steps.length - 1
            ? <button type="button" onClick={() => canContinue && setStep((current) => current + 1)} disabled={!canContinue} className="audit-next">Continuă <ChevronRight size={17} aria-hidden="true" /></button>
            : <button type="button" onClick={submit} disabled={!canContinue || status === "loading"} className="audit-next"><Send size={16} aria-hidden="true" /> {status === "loading" ? "Se trimite…" : "Trimite chestionarul"}</button>}
        </div>
      </section>
    </div>
  );
}
