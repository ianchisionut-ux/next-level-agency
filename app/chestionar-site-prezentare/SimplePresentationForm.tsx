"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, Send, Sparkles } from "lucide-react";

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
const summary = ["Obiectivul site-ului", "Paginile și conținutul", "Stilul preferat", "Termenul și contactul"];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return <div className="mb-2"><p className="text-sm font-bold text-slate-900">{children}</p>{hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}</div>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-line-light bg-white px-4 py-3 text-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10" />;
}

function Choices({ options, values, onChange, single = false }: { options: string[]; values: string[]; onChange: (values: string[]) => void; single?: boolean }) {
  return <div className="flex flex-wrap gap-2">{options.map((option) => {
    const active = values.includes(option);
    return <button key={option} type="button" onClick={() => onChange(single ? [option] : toggle(values, option))} className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${active ? "border-blue bg-blue text-white shadow-sm" : "border-line-light bg-white text-ink-soft hover:border-blue/40"}`}>{option}</button>;
  })}</div>;
}

export default function SimplePresentationForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setData((current) => ({ ...current, [key]: value }));
  const canContinue = step === 0
    ? Boolean(data.companyName.trim() && data.activity.trim())
    : step === 3
      ? Boolean(data.contactName.trim() && (data.contactPhone.trim() || data.contactEmail.trim()))
      : true;

  async function submit() {
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
    }
  }

  if (status === "success") return (
    <div className="mx-auto max-w-2xl rounded-3xl border-2 border-blue bg-white p-8 text-center shadow-xl sm:p-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue text-white"><Check size={28} strokeWidth={3} /></div>
      <p className="eyebrow mt-6 text-blue">Chestionar trimis</p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Am primit informațiile despre site</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink-soft">Analizăm răspunsurile și revenim cu o propunere potrivită pentru afacerea ta.</p>
      <a href="https://wa.me/40740565663" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-xl bg-blue px-6 py-3 text-sm font-bold text-white">Scrie-ne pe WhatsApp</a>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
      <aside className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:sticky lg:top-24 lg:self-start sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue/20 px-3 py-1.5 text-xs font-bold text-blue-bright"><Clock3 size={14} /> Aproximativ 2 minute</div>
        <h2 className="mt-5 text-2xl font-extrabold">Doar întrebările esențiale</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">Pentru un site de prezentare fără magazin, conturi de utilizator sau funcții complicate.</p>
        <div className="mt-6 space-y-3">{summary.map((item, index) => <div key={item} className="flex items-center gap-3 text-sm text-white/75"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-bold">{index + 1}</span>{item}</div>)}</div>
        <div className="mt-7 rounded-2xl border border-blue/20 bg-blue/10 p-4"><div className="flex items-center gap-2 text-sm font-bold text-blue-bright"><Sparkles size={16} /> Ai nevoie de mai mult?</div><p className="mt-2 text-xs leading-5 text-white/55">Pentru magazin online, rezervări, conturi sau automatizări folosește chestionarul avansat.</p></div>
      </aside>

      <section className="rounded-3xl border border-line-light bg-paper-soft p-5 shadow-sm sm:p-8">
        <div className="mb-7">
          <div className="flex items-center justify-between gap-4"><p className="text-xs font-bold uppercase tracking-widest text-blue">Pasul {step + 1} din {steps.length}</p><p className="text-sm font-bold text-slate-700">{steps[step]}</p></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-light"><div className="h-full rounded-full bg-blue transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        </div>

        <div className="min-h-[430px] space-y-6">
          {step === 0 && <>
            <div><Label>Numele firmei</Label><Input value={data.companyName} onChange={(value) => set("companyName", value)} placeholder="Ex: Firma Exemplu SRL" /></div>
            <div><Label>Cu ce se ocupă firma?</Label><textarea value={data.activity} onChange={(event) => set("activity", event.target.value)} rows={4} placeholder="Descrie pe scurt serviciile sau produsele oferite" className="w-full rounded-xl border border-line-light bg-white px-4 py-3 text-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10" /></div>
            <div><Label hint="Poți alege mai multe variante.">Ce vrei să facă vizitatorul?</Label><Choices options={["Să sune", "Să trimită un mesaj", "Să ceară o ofertă", "Să vadă serviciile", "Să vadă portofoliul", "Să găsească locația"]} values={data.ctaGoals} onChange={(values) => set("ctaGoals", values)} /></div>
          </>}

          {step === 1 && <>
            <div><Label hint="Am selectat deja structura recomandată. O poți modifica.">Ce pagini dorești?</Label><Choices options={["Acasă", "Despre noi", "Servicii", "Portofoliu / Lucrări", "Galerie foto", "Recenzii", "Blog", "Contact"]} values={data.pages} onChange={(values) => set("pages", values)} /></div>
            <div><Label>Alte pagini sau secțiuni</Label><Input value={data.pagesOther} onChange={(value) => set("pagesOther", value)} placeholder="Opțional" /></div>
            <div><Label>În ce limbă va fi site-ul?</Label><Choices single options={["Doar în română", "Română + altă limbă"]} values={[data.languages]} onChange={(values) => set("languages", values[0] || "")} />{data.languages === "Română + altă limbă" && <div className="mt-3"><Input value={data.otherLanguage} onChange={(value) => set("otherLanguage", value)} placeholder="Ex: engleză, maghiară" /></div>}</div>
          </>}

          {step === 2 && <>
            <div><Label>Ai deja logo și culorile firmei?</Label><Choices single options={["Da, identitatea este completă", "Am doar logo-ul", "Nu, am nevoie de ajutor"]} values={data.brandIdentity ? [data.brandIdentity] : []} onChange={(values) => set("brandIdentity", values[0] || "")} /></div>
            <div><Label>Ai pregătite textele și fotografiile?</Label><Choices single options={["Da, sunt pregătite", "Doar o parte", "Am nevoie de ajutor"]} values={data.hasContent ? [data.hasContent] : []} onChange={(values) => set("hasContent", values[0] || "")} /></div>
            <div><Label>Ce stil îți place?</Label><Choices single options={["Simplu, curat și aerisit", "Elegant și premium", "Modern, cu animații discrete", "Nu știu, recomandați voi"]} values={data.visualStyle ? [data.visualStyle] : []} onChange={(values) => set("visualStyle", values[0] || "")} /></div>
            <div><Label>Un site care îți place</Label><Input value={data.likedSite1} onChange={(value) => set("likedSite1", value)} placeholder="Link sau numele site-ului (opțional)" /></div>
            <div><Label>Contact rapid pe site</Label><Choices options={["Formular de contact", "Buton WhatsApp", "Telefon", "Hartă Google"]} values={data.contactElements} onChange={(values) => set("contactElements", values)} /></div>
          </>}

          {step === 3 && <>
            <div><Label>Ai deja un domeniu?</Label><Choices single options={["Da, îl am deja", "Nu, am nevoie de ajutor"]} values={data.hasDomain ? [data.hasDomain] : []} onChange={(values) => set("hasDomain", values[0] || "")} />{data.hasDomain === "Da, îl am deja" && <div className="mt-3"><Input value={data.domainName} onChange={(value) => set("domainName", value)} placeholder="exemplu.ro" /></div>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label>Când dorești lansarea?</Label><Input value={data.launchDate} onChange={(value) => set("launchDate", value)} placeholder="Ex: în 4-6 săptămâni" /></div><div><Label>Buget orientativ</Label><Input value={data.budget} onChange={(value) => set("budget", value)} placeholder="Ex: 2.000-4.000 lei" /></div></div>
            <div><Label>Alte detalii importante</Label><textarea value={data.customRequirements} onChange={(event) => set("customRequirements", event.target.value)} rows={3} placeholder="Orice informație care ne ajută să pregătim oferta" className="w-full rounded-xl border border-line-light bg-white px-4 py-3 text-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10" /></div>
            <div className="border-t border-line-light pt-5"><Label>Date de contact</Label><div className="grid gap-3 sm:grid-cols-2"><Input value={data.contactName} onChange={(value) => set("contactName", value)} placeholder="Nume și prenume" /><Input value={data.contactPhone} onChange={(value) => set("contactPhone", value)} placeholder="Telefon" type="tel" /><div className="sm:col-span-2"><Input value={data.contactEmail} onChange={(value) => set("contactEmail", value)} placeholder="E-mail" type="email" /></div></div></div>
            {status === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">Trimiterea nu a reușit. Încearcă din nou sau contactează-ne pe WhatsApp.</p>}
          </>}
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-line-light pt-5">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex items-center gap-2 rounded-xl border border-line-light px-4 py-3 text-sm font-bold text-ink-soft disabled:opacity-35"><ChevronLeft size={17} /> Înapoi</button>
          {step < steps.length - 1
            ? <button type="button" onClick={() => canContinue && setStep((current) => current + 1)} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Continuă <ChevronRight size={17} /></button>
            : <button type="button" onClick={submit} disabled={!canContinue || status === "loading"} className="inline-flex items-center gap-2 rounded-xl bg-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-40"><Send size={16} /> {status === "loading" ? "Se trimite..." : "Trimite chestionarul"}</button>}
        </div>
      </section>
    </div>
  );
}
