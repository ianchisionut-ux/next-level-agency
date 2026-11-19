import { useId, type ReactNode } from "react";
import {
  CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, CreditCard,
  FileText, Globe2, GraduationCap, Image as ImageIcon, LayoutTemplate, Mail,
  MapPin, Megaphone, MessageCircle, Package, Paintbrush, Palette, Phone,
  Search, Settings2, ShieldCheck, ShoppingBag, Sparkles, Store, Target,
  UserRound, Users, Wallet, type LucideIcon,
} from "lucide-react";

export const STEP_ICONS = [Store, LayoutTemplate, ShoppingBag, FileText, Settings2, Palette, Globe2, UserRound];

// Display copy is separate from the original values sent to /api/audit.
const OPTION_COPY: Record<string, { label: string; hint?: string; icon?: LucideIcon }> = {
  "Da, completă": { label: "Da, logo și culori", icon: Palette },
  "Parțial (doar logo)": { label: "Am doar un logo", icon: ImageIcon },
  "Nu, avem nevoie de branding": { label: "Am nevoie de logo și culori", icon: Paintbrush },
  "Să sune": { label: "Să mă sune", icon: Phone },
  "Să trimită mesaj / cerere de ofertă": { label: "Să ceară detalii sau o ofertă", icon: MessageCircle },
  "Să vadă portofoliul": { label: "Să vadă lucrările mele", icon: ImageIcon },
  "Să cumpere online": { label: "Să cumpere online", icon: ShoppingBag },
  "Site pentru prezentarea firmei": { label: "Să prezinte afacerea", hint: "Cine ești și ce oferi", icon: Store },
  "Pagină pentru o campanie": { label: "O pagină pentru promovare", hint: "Pentru o ofertă sau un eveniment", icon: Megaphone },
  "Magazin online": { label: "Un magazin online", hint: "Produse, comenzi și plăți", icon: ShoppingBag },
  "Programări sau rezervări": { label: "Programări sau rezervări", hint: "Clienții aleg o zi și o oră", icon: CalendarDays },
  "Restaurant sau evenimente": { label: "Restaurant sau evenimente", hint: "Meniu, bilete sau rezervări", icon: Store },
  "Site cu anunțuri sau mai mulți vânzători": { label: "Anunțuri sau mai mulți vânzători", icon: Users },
  "Platformă cu conturi pentru clienți": { label: "Un site cu conturi de client", icon: Users },
  "Cursuri sau zonă pentru membri": { label: "Cursuri sau acces pentru membri", icon: GraduationCap },
  "Blog sau comunitate": { label: "Articole sau o comunitate", icon: FileText },
  "Alt tip de proiect": { label: "Altă idee de proiect", icon: Sparkles },
  "Nu există tranzacții online": { label: "Fără plăți pe site", hint: "Clienții mă contactează", icon: MessageCircle },
  "Da, plată integrală online": { label: "Da, clienții plătesc online", icon: CreditCard },
  "Da, avans sau garanție": { label: "Doar un avans sau o garanție", icon: Wallet },
  "Cerere de ofertă, plata ulterior": { label: "Întâi o ofertă, apoi plata", icon: FileText },
  "Se importă din alt sistem": { label: "Le preluăm din alt program", icon: Package },
  "Abonament recurent": { label: "Abonamente cu plată automată", icon: CalendarDays },
  "Plată în mai multe monede": { label: "Lei, euro sau alte monede", icon: Wallet },
  "Nu, totul este public": { label: "Nu, oricine poate vedea site-ul", icon: Globe2 },
  "Da, clienții au cont": { label: "Da, clienții au contul lor", icon: UserRound },
  "Da, există mai multe tipuri de cont": { label: "Da, mai multe tipuri de utilizatori", icon: Users },
  "Ajutor cu inteligență artificială": { label: "Un asistent care răspunde automat", icon: Sparkles },
  "Program de clienți": { label: "Programul în care țin clienții", icon: Users },
  "Program de gestiune": { label: "Programul pentru stocuri sau comenzi", icon: Package },
  "Da, îl am deja": { label: "Da, am deja adresa site-ului", icon: Globe2 },
  "Nu, doresc sprijin pentru alegere și achiziție": { label: "Vreau ajutor să aleg adresa", icon: CircleHelp },
  "Da, la o firmă existentă": { label: "Da, am deja găzduire", icon: CheckCircle2 },
  "Nu, doresc ca găzduirea să fie inclusă în proiect": { label: "Vreau să vă ocupați voi", icon: ShieldCheck },
  "Nu, folosesc deja o adresă existentă": { label: "Am deja adresa de e-mail potrivită", icon: Mail },
  "Nu știu, recomandați voi": { label: "Nu știu, alegem împreună", icon: CircleHelp },
  "Spectaculos, cu animații și efecte moderne": { label: "Dinamic, cu animații", icon: Sparkles },
  "Simplu, curat și aerisit": { label: "Simplu și aerisit", icon: LayoutTemplate },
  "Modificări rare, la cerere": { label: "Vă contactez când am nevoie", icon: MessageCircle },
  "Pachet de mentenanță lunară": { label: "Aș vrea ajutor în fiecare lună", icon: CalendarDays },
  "Încă nu știm": { label: "Nu știu încă", icon: CircleHelp },
  "Nu știm încă": { label: "Nu știu încă", icon: CircleHelp },
  "Urmează să pornim și campaniile": { label: "Le pornim în curând", icon: Megaphone },
};

function choiceIcon(value: string): LucideIcon {
  const valueLower = value.toLocaleLowerCase("ro");
  if (/nu ști|nu știm|încă|poate/.test(valueLower)) return CircleHelp;
  if (/whatsapp|mesaj|formular|cerer|contact/.test(valueLower)) return MessageCircle;
  if (/telefon|sune/.test(valueLower)) return Phone;
  if (/e-mail|email|newsletter|sms|alert/.test(valueLower)) return Mail;
  if (/card|plat|bancar|ramburs|lei|buget|încase|vinde/.test(valueLower)) return CreditCard;
  if (/programăr|calendar|rezerv|abonament|lunar/.test(valueLower)) return CalendarDays;
  if (/produs|stoc|curier|livr|retur|gestiune/.test(valueLower)) return Package;
  if (/document|pdf|factur|contract|articol|blog|tabel/.test(valueLower)) return FileText;
  if (/client|echip|angajat|firme|persoane|partener|furnizor|membr|administrator|utilizator/.test(valueLower)) return Users;
  if (/curs|profesor/.test(valueLower)) return GraduationCap;
  if (/hart|maps|sediu/.test(valueLower)) return MapPin;
  if (/căutar|filtr/.test(valueLower)) return Search;
  if (/logo|culor|poze|portofoliu|lucrări|recenzi|favorite/.test(valueLower)) return ImageIcon;
  if (/facebook|instagram|tiktok|social|promov|reclame/.test(valueLower)) return Megaphone;
  if (/acasă|servicii|despre|pagin|site/.test(valueLower)) return LayoutTemplate;
  if (/român|limb|oricine/.test(valueLower)) return Globe2;
  if (/da|complete|am o parte/.test(valueLower)) return CheckCircle2;
  if (/nu/.test(valueLower)) return CircleHelp;
  return Target;
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return <><legend className="audit-question-title">{children}</legend>{hint && <p className="audit-hint">{hint}</p>}</>;
}

export function TextInput({ value, onChange, placeholder, type = "text", label, autoComplete, required = false }: {
  value: string; onChange: (value: string) => void; placeholder?: string; type?: string;
  label?: string; autoComplete?: string; required?: boolean;
}) {
  return <label className="audit-input-wrap">
    {label && <span className="audit-input-label">{label}{required && <span className="audit-required"> · obligatoriu</span>}</span>}
    <input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label || placeholder} aria-required={required || undefined} autoComplete={autoComplete} className="audit-input" />
  </label>;
}

export function TextAreaInput({ value, onChange, placeholder, rows = 3, label }: {
  value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; label?: string;
}) {
  return <label className="audit-input-wrap">
    {label && <span className="audit-input-label">{label}</span>}
    <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={rows} aria-label={label || placeholder} className="audit-input audit-textarea" />
  </label>;
}

function ChoiceCard({ value, active, onChange, type, name }: {
  value: string; active: boolean; onChange: () => void; type: "radio" | "checkbox"; name: string;
}) {
  const copy = OPTION_COPY[value];
  const Icon = copy?.icon || choiceIcon(value);
  return <label className={`audit-choice${active ? " audit-choice--active" : ""}`}>
    <input className="audit-choice-input" type={type} name={name} value={value} checked={active} onChange={onChange} />
    <span className="audit-choice-icon"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
    <span className="audit-choice-copy"><span>{copy?.label || value}</span>{copy?.hint && <small>{copy.hint}</small>}</span>
    <span className={`audit-choice-check${type === "radio" ? " audit-choice-check--radio" : ""}`} aria-hidden="true">{active && <Check size={13} strokeWidth={3} />}</span>
  </label>;
}

export function SingleChoice({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const name = useId();
  return <><p className="audit-choice-note">Alege o variantă</p><div className="audit-options">{options.map(option => <ChoiceCard key={option} value={option} active={value === option} onChange={() => onChange(option)} type="radio" name={name} />)}</div></>;
}

export function MultiChoice({ options, values, onChange }: { options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  const name = useId();
  const visible = options.length > 8 ? options.slice(0, 6) : options;
  const more = options.length > 8 ? options.slice(6) : [];
  const selectedMore = more.filter(option => values.includes(option)).length;
  const render = (items: string[]) => items.map(option => <ChoiceCard key={option} value={option} active={values.includes(option)} onChange={() => onChange(values.includes(option) ? values.filter(item => item !== option) : [...values, option])} type="checkbox" name={name} />);
  return <>
    <p className="audit-choice-note">Poți alege mai multe{values.length ? <span> · {values.length} {values.length === 1 ? "aleasă" : "alese"}</span> : null}</p>
    <div className="audit-options">{render(visible)}</div>
    {more.length > 0 && <details className="audit-more-options"><summary>Mai multe variante <span>{selectedMore ? `${selectedMore} alese` : `+${more.length}`}</span><ChevronDown size={16} aria-hidden="true" /></summary><div className="audit-options">{render(more)}</div></details>}
  </>;
}

export function QuestionnaireProgress({ step, titles, icons = STEP_ICONS }: { step: number; titles: string[]; icons?: LucideIcon[] }) {
  return <div className="audit-progress">
    <div className="audit-progress-meta"><span>Pasul {step + 1} din {titles.length}</span><span>{step === titles.length - 1 ? "Aproape gata" : "Răspunsurile rămân când revii înapoi"}</span></div>
    <div className="audit-progress-track" role="progressbar" aria-label="Progresul chestionarului" aria-valuemin={0} aria-valuemax={titles.length} aria-valuenow={step + 1} aria-valuetext={`Pasul ${step + 1} din ${titles.length}: ${titles[step]}`}><span style={{ width: `${((step + 1) / titles.length) * 100}%` }} /></div>
    <ol className="audit-progress-steps" style={{ gridTemplateColumns: `repeat(${titles.length}, minmax(0, 1fr))` }} aria-label="Pașii chestionarului">{titles.map((title, index) => {
      const Icon = index < step ? Check : icons[index];
      return <li key={title} data-state={index === step ? "current" : index < step ? "complete" : "upcoming"} aria-current={index === step ? "step" : undefined}><span><Icon size={17} aria-hidden="true" /></span><small>{title}</small></li>;
    })}</ol>
  </div>;
}
