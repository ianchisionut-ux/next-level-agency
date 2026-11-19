"use client";

import { useId, useState } from "react";
import {
  BadgeCheck, Check, CheckCheck, ClipboardCheck, FileText, LayoutTemplate,
  ListFilter, Mail, MessageSquare, MousePointer2, PanelsTopLeft, RefreshCw,
  Send, ShieldCheck, Sparkles, Target, UsersRound, Workflow, type LucideIcon,
} from "lucide-react";
import styles from "./service-explainer.module.css";

export type ServiceExplainerKind = "web" | "marketing" | "automation";
type ExplainerStep = { label: string; title: string; text: string; icon: LucideIcon };

const explanations: Record<ServiceExplainerKind, { title: string; intro: string; note: string; steps: ExplainerStep[] }> = {
  web: {
    title: "De la prima vizită la o conversație",
    intro: "Alege o etapă și vezi cum poate ghida un site oamenii către informația potrivită.",
    note: "Parcurs ilustrativ. Paginile și funcțiile se aleg în funcție de afacerea ta.",
    steps: [
      { label: "Prima impresie", title: "Înțeleg repede cine ești", text: "Un mesaj clar, o imagine potrivită și o structură aerisită îi ajută pe vizitatori să înțeleagă ce oferi.", icon: PanelsTopLeft },
      { label: "Descoperă oferta", title: "Găsesc ce îi interesează", text: "Serviciile, proiectele și informațiile importante au locul lor. Navigarea îi conduce către detalii, fără căutări inutile.", icon: LayoutTemplate },
      { label: "Cer detalii", title: "Fac ușor următorul pas", text: "Un formular scurt sau un mod direct de contact îi ajută să explice ce au nevoie. Stabilim împreună ce informații sunt utile.", icon: MessageSquare },
      { label: "Continuăm discuția", title: "Echipa poate prelua solicitarea", text: "Cererea ajunge prin canalul agreat. De aici începe conversația despre nevoi, soluție și pașii următori.", icon: UsersRound },
    ],
  },
  marketing: {
    title: "Cum se leagă piesele unei campanii",
    intro: "Explorează pașii unei campanii: de la o intenție clară la decizii bazate pe ce observăm.",
    note: "Exemplu de proces. Canalele, bugetul și indicatorii se stabilesc pentru fiecare proiect.",
    steps: [
      { label: "Obiectiv", title: "Alegem ce contează pentru afacere", text: "Pornim de la ofertă și de la oamenii cărora le este utilă. Stabilim obiectivul și ce vrem să urmărim.", icon: Target },
      { label: "Mesaj", title: "Punem oferta într-o formă clară", text: "Pregătim mesajul, vizualul și pagina către care duce campania. Ele trebuie să spună aceeași poveste.", icon: Sparkles },
      { label: "Promovare", title: "Alegem unde are sens să apară", text: "Selectăm canalele și pregătim campania în limitele bugetului agreat. Fiecare platformă are propriile reguli și cerințe.", icon: MousePointer2 },
      { label: "Îmbunătățire", title: "Observăm și ajustăm", text: "Urmărim datele disponibile și calitatea solicitărilor. Folosim ce aflăm pentru a revizui mesajele, publicul și pagina.", icon: RefreshCw },
    ],
  },
  automation: {
    title: "O solicitare, un traseu mai ordonat",
    intro: "Vezi un exemplu simplu de flux care leagă aplicațiile și păstrează verificarea umană acolo unde contează.",
    note: "Flux ilustrativ. Integrările și pașii se construiesc după procesele și accesul disponibile.",
    steps: [
      { label: "Solicitare", title: "Totul pornește de la un eveniment", text: "Un formular completat, un e-mail nou sau o acțiune într-o aplicație poate porni fluxul, dacă integrarea permite acest lucru.", icon: Mail },
      { label: "Organizare", title: "Informația ajunge unde trebuie", text: "Datele utile pot fi ordonate și direcționate către persoana sau aplicația potrivită, după reguli stabilite împreună.", icon: ListFilter },
      { label: "Validare", title: "Omul verifică deciziile importante", text: "Un mesaj pregătit automat poate aștepta revizuirea echipei. Stabilim ce se execută automat și ce are nevoie de confirmare.", icon: ShieldCheck },
      { label: "Răspuns", title: "Continuăm prin canalul potrivit", text: "După verificările agreate, echipa poate trimite răspunsul sau poate permite continuarea fluxului. Pașii rămân ușor de urmărit.", icon: Send },
    ],
  },
};

function WebVisual({ step }: { step: number }) {
  return <div className={styles.browser} aria-hidden="true">
    <div className={styles.browserChrome}><span /><span /><span /><b>Site-ul afacerii tale</b></div>
    <div className={styles.browserBody}>
      <div className={styles.mockNav}><strong>Brandul tău</strong><span>Servicii · Contact</span></div>
      {step === 0 && <div className={styles.landingPreview}><div><p>O idee clară.<br /><em>O prezență potrivită.</em></p><span className={styles.mockAction}>Descoperă serviciile</span></div><div className={styles.glassObject}><i /><i /><i /></div></div>}
      {step === 1 && <div className={styles.offerPreview}><p>Ce putem face pentru tine</p><div><span><LayoutTemplate size={25} />Prezentarea afacerii</span><span><FileText size={25} />Servicii și proiecte</span></div><div className={styles.mockLines}><i /><i /></div></div>}
      {step === 2 && <div className={styles.formPreview}><p>Spune-ne ce ai nevoie</p><span>Numele tău</span><span>Adresa de e-mail</span><span>Despre proiectul tău</span><b>Solicită detalii</b></div>}
      {step === 3 && <div className={styles.confirmation}><span className={styles.largeIcon}><CheckCheck size={36} strokeWidth={1.6} /></span><strong>Solicitarea ajunge la echipă</strong><p>De aici începe conversația.</p><div className={styles.messageBubble}><UsersRound size={19} /><span>Nevoile tale · Idei · Pașii următori</span></div></div>}
    </div>
  </div>;
}

function MarketingVisual({ step }: { step: number }) {
  const cards = [
    { icon: Target, title: "Un obiectiv clar", labels: ["Cui ne adresăm", "Ce oferim", "Ce urmărim"] },
    { icon: Sparkles, title: "O ofertă, un mesaj coerent", labels: ["Mesaj", "Imagine", "Pagină de destinație"] },
    { icon: MousePointer2, title: "Canale alese pentru proiect", labels: ["Google", "Meta", "TikTok"] },
    { icon: RefreshCw, title: "Învățăm din ce observăm", labels: ["Date disponibile", "Calitatea solicitărilor", "Ajustări"] },
  ];
  const current = cards[step], Icon = current.icon;
  return <div className={styles.marketingBoard} aria-hidden="true">
    <div className={styles.orbitLines}><i /><i /></div>
    <div className={styles.campaignCore}><Icon size={36} strokeWidth={1.5} /><strong>{current.title}</strong></div>
    <div className={styles.campaignTiles}>{current.labels.map(label => <span key={label}><Check size={16} />{label}</span>)}</div>
    <div className={styles.campaignPath}>{cards.map(({ icon: StageIcon, title }, index) => <span key={title} className={index === step ? styles.pathActive : undefined}><StageIcon size={20} />{index < step && <Check size={11} className={styles.pathCheck} />}</span>)}</div>
  </div>;
}

function AutomationVisual({ step }: { step: number }) {
  return <div className={styles.automationBoard} aria-hidden="true">
    <div className={styles.flowRail}>{[Mail, Workflow, ShieldCheck, Send].map((Icon, index) => <span className={index === step ? styles.flowCurrent : index < step ? styles.flowComplete : undefined} key={index}><Icon size={23} strokeWidth={1.7} /></span>)}</div>
    <div className={styles.automationCard}>
      {step === 0 && <><div className={styles.cardHeading}><Mail size={24} /><strong>O cerere nouă</strong></div><div className={styles.messageSheet}><p>„Aș vrea să discutăm despre o ofertă.”</p><span>Un formular, un e-mail sau o aplicație conectată</span></div></>}
      {step === 1 && <><div className={styles.cardHeading}><ListFilter size={24} /><strong>Informații organizate</strong></div><dl className={styles.organizedData}><div><dt>Tipul solicitării</dt><dd>Cerere de ofertă</dd></div><div><dt>Responsabil</dt><dd>Echipa potrivită</dd></div><div><dt>Următorul pas</dt><dd>Pregătirea răspunsului</dd></div></dl></>}
      {step === 2 && <><div className={styles.cardHeading}><ShieldCheck size={24} /><strong>Revizuire de către echipă</strong></div><div className={styles.validationList}>{["Informații complete", "Destinatar potrivit", "Mesaj revizuit"].map(label => <span key={label}><ClipboardCheck size={19} />{label}</span>)}</div><p className={styles.reviewTag}>Continuă după verificare</p></>}
      {step === 3 && <div className={styles.confirmation}><span className={styles.largeIcon}><BadgeCheck size={37} strokeWidth={1.6} /></span><strong>Un răspuns pregătit</strong><p>Continuă prin canalul stabilit.</p><div className={styles.messageBubble}><Send size={18} /><span>Echipă · Client · Conversație</span></div></div>}
    </div>
  </div>;
}

export default function ServiceExplainer({ kind }: { kind: ServiceExplainerKind }) {
  const [step, setStep] = useState(0);
  const id = useId();
  const content = explanations[kind], current = content.steps[step], Icon = current.icon;
  return <div className={styles.explainer} role="group" aria-labelledby={`${id}-title`}>
    <div className={styles.intro}><h3 id={`${id}-title`}>{content.title}</h3><p>{content.intro}</p></div>
    <div className={styles.layout}>
      <div className={styles.steps} aria-label="Alege etapa explicată">{content.steps.map(({ label, icon: StepIcon }, index) => <button type="button" key={label} aria-pressed={step === index} aria-controls={`${id}-panel`} className={step === index ? styles.stepActive : styles.step} onClick={() => setStep(index)}><span className={styles.stepIcon}><StepIcon size={22} strokeWidth={1.7} aria-hidden="true" /></span><span>{label}</span><Check size={17} className={styles.selectedCheck} aria-hidden="true" /></button>)}</div>
      <div className={styles.panel} id={`${id}-panel`}>
        <span className={styles.exampleLabel}>Exemplu ilustrativ</span>
        <div className={styles.visual}>{kind === "web" ? <WebVisual step={step} /> : kind === "marketing" ? <MarketingVisual step={step} /> : <AutomationVisual step={step} />}</div>
        <div className={styles.explanation} role="status" aria-live="polite" aria-atomic="true"><span><Icon size={21} aria-hidden="true" /></span><div><h4>{current.title}</h4><p>{current.text}</p></div></div>
      </div>
    </div>
    <div className={styles.footer}><p>{content.note}</p><div><button type="button" onClick={() => setStep(0)} disabled={step === 0}>Reia exemplul</button><button type="button" onClick={() => setStep((step + 1) % content.steps.length)}>{step === content.steps.length - 1 ? "Vezi din nou" : "Etapa următoare"}</button></div></div>
  </div>;
}
