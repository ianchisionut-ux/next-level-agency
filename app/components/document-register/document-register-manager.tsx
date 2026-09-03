"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/app/components/ui/page-header";
import { useToast } from "@/app/components/ui/toast";

type Direction = "INCOMING" | "OUTGOING" | "INTERNAL";
type FormData = {
  registrationDate: string;
  direction: Direction;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  partnerName: string;
  subject: string;
  notes: string;
};

export type CompanyDocumentData = {
  id: string;
  registrationNumber: number;
  registrationDate: string;
  direction: string;
  documentType: string;
  documentNumber: string | null;
  documentDate: string | null;
  partnerName: string;
  subject: string;
  notes: string | null;
  isCancelled: boolean;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

const labels: Record<Direction, string> = {
  INCOMING: "Intrare",
  OUTGOING: "Ieșire",
  INTERNAL: "Intern",
};

const types = ["Contract", "Act adițional", "Factură", "Cerere", "Adresă", "Notificare", "Decizie", "Proces-verbal", "Ofertă", "Declarație"];

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function blank(): FormData {
  return { registrationDate: today(), direction: "INCOMING", documentType: "", documentNumber: "", documentDate: "", partnerName: "", subject: "", notes: "" };
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function registerNumber(item: CompanyDocumentData) {
  return String(item.registrationNumber).padStart(4, "0") + "/" + new Date(item.registrationDate).getUTCFullYear();
}

function badge(direction: string) {
  if (direction === "INCOMING") return "bg-blue-500/10 text-blue-700 ring-blue-600/20";
  if (direction === "OUTGOING") return "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20";
  return "bg-violet-500/10 text-violet-700 ring-violet-600/20";
}

export function DocumentRegisterManager({ initialDocuments, company }: {
  initialDocuments: CompanyDocumentData[];
  company: { legalName: string; cui: string; tradeRegistryNumber: string };
}) {
  const toast = useToast();
  const [items, setItems] = useState(initialDocuments);
  const [form, setForm] = useState<FormData>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"ALL" | Direction>("ALL");
  const [year, setYear] = useState("ALL");

  const years = useMemo(() => Array.from(new Set(items.map((item) =>
    String(new Date(item.registrationDate).getUTCFullYear())
  ))).sort((a, b) => Number(b) - Number(a)), [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ro-RO");
    return items.filter((item) => {
      const itemYear = String(new Date(item.registrationDate).getUTCFullYear());
      const text = [registerNumber(item), item.documentType, item.documentNumber, item.partnerName, item.subject, item.notes]
        .filter(Boolean).join(" ").toLocaleLowerCase("ro-RO");
      return (direction === "ALL" || item.direction === direction)
        && (year === "ALL" || itemYear === year)
        && (!needle || text.includes(needle));
    });
  }, [items, query, direction, year]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addNew() {
    setEditingId(null);
    setForm(blank());
    setFormOpen(true);
  }

  function edit(item: CompanyDocumentData) {
    setEditingId(item.id);
    setForm({
      registrationDate: item.registrationDate.slice(0, 10),
      direction: item.direction as Direction,
      documentType: item.documentType,
      documentNumber: item.documentNumber || "",
      documentDate: item.documentDate ? item.documentDate.slice(0, 10) : "",
      partnerName: item.partnerName,
      subject: item.subject,
      notes: item.notes || "",
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    setFormOpen(false);
    setEditingId(null);
    setForm(blank());
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editingId ? "/api/document-register/" + editingId : "/api/document-register", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut salva actul.");
      setItems((current) => [data.document, ...current.filter((item) => item.id !== data.document.id)]
        .sort((a, b) => b.registrationNumber - a.registrationNumber));
      toast.success(editingId ? "Înregistrarea a fost actualizată." : "Act înregistrat cu numărul " + registerNumber(data.document) + ".");
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nu am putut salva actul.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCancelled(item: CompanyDocumentData) {
    const verb = item.isCancelled ? "reactivezi" : "anulezi";
    if (!window.confirm("Sigur vrei să " + verb + " înregistrarea " + registerNumber(item) + "?")) return;
    setBusyId(item.id);
    try {
      const response = await fetch("/api/document-register/" + item.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCancelled: !item.isCancelled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Operațiunea a eșuat.");
      setItems((current) => current.map((entry) => entry.id === item.id ? data.document : entry));
      toast.success(item.isCancelled ? "Înregistrarea a fost reactivată." : "Înregistrarea a fost anulată.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operațiunea a eșuat.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteItem(item: CompanyDocumentData) {
    const confirmed = window.confirm(
      "Ștergerea este definitivă. Numărul " + registerNumber(item) + " nu va fi realocat. Continui?"
    );
    if (!confirmed) return;

    setBusyId(item.id);
    try {
      const response = await fetch("/api/document-register/" + item.id, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut șterge înregistrarea.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) close();
      toast.success("Înregistrarea " + registerNumber(item) + " a fost ștearsă.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nu am putut șterge înregistrarea.");
    } finally {
      setBusyId(null);
    }
  }
  const active = items.filter((item) => !item.isCancelled).length;
  const thisYear = items.filter((item) => !item.isCancelled && new Date(item.registrationDate).getUTCFullYear() === new Date().getFullYear()).length;

  return (
    <div className="document-register-page space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Registru acte"
          description="Registrul oficial de intrare-ieșire. Numerele se alocă automat și nu se reutilizează."
          actions={<>
            <button onClick={() => window.print()} className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm font-semibold text-mist-100 hover:border-signal hover:bg-signal-soft">Tipărește registrul</button>
            <button onClick={addNew} className="rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white shadow-floating hover:bg-signal-bright">+ Înregistrează act</button>
          </>}
        />
      </div>

      <header className="hidden border-b-2 border-black pb-4 print:block">
        <div className="flex justify-between gap-8">
          <div>
            <h1 className="text-xl font-bold text-black">REGISTRU DE INTRARE-IEȘIRE A DOCUMENTELOR</h1>
            <p className="mt-1 text-sm font-semibold text-black">{company.legalName}</p>
            <p className="text-xs text-slate-600">CUI {company.cui} · {company.tradeRegistryNumber}</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Generat: {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</p>
            <p>{visible.length} înregistrări</p>
          </div>
        </div>
      </header>

      {formOpen && (
        <form onSubmit={save} className="glass-card rounded-2xl border border-ink-700 bg-ink-800 p-5 print:hidden">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-display font-semibold">{editingId ? "Corectează înregistrarea" : "Act nou"}</h2>
              <p className="mt-1 text-xs text-mist-500">{editingId ? "Numărul de înregistrare nu se modifică." : "Numărul se alocă automat la salvare."}</p>
            </div>
            <button type="button" onClick={close} className="text-sm text-mist-500 hover:text-mist-100">Închide</button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Data înregistrării *"><input required type="date" value={form.registrationDate} onChange={(e) => set("registrationDate", e.target.value)} className="input" /></Field>
            <Field label="Sens *"><select value={form.direction} onChange={(e) => set("direction", e.target.value as Direction)} className="input"><option value="INCOMING">Intrare</option><option value="OUTGOING">Ieșire</option><option value="INTERNAL">Intern</option></select></Field>
            <Field label="Tip act *"><input required list="document-types" value={form.documentType} onChange={(e) => set("documentType", e.target.value)} placeholder="Ex: Contract" className="input" /><datalist id="document-types">{types.map((type) => <option key={type} value={type} />)}</datalist></Field>
            <Field label="Nr. document"><input value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} placeholder="Numărul de pe act" className="input" /></Field>
            <Field label="Data documentului"><input type="date" value={form.documentDate} onChange={(e) => set("documentDate", e.target.value)} className="input" /></Field>
            <div className="md:col-span-1 xl:col-span-3"><Field label="Expeditor / Destinatar *"><input required value={form.partnerName} onChange={(e) => set("partnerName", e.target.value)} placeholder="Firmă, instituție sau persoană" className="input" /></Field></div>
            <div className="md:col-span-2 xl:col-span-4"><Field label="Obiectul documentului *"><textarea required rows={2} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Descriere scurtă și clară" className="input resize-y" /></Field></div>
            <div className="md:col-span-2 xl:col-span-4"><Field label="Observații"><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Opțional" className="input resize-y" /></Field></div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm font-semibold text-mist-500">Renunță</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-signal px-5 py-2.5 text-sm font-semibold text-white hover:bg-signal-bright disabled:opacity-50">{saving ? "Se salvează…" : editingId ? "Salvează corecția" : "Alocă număr și salvează"}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <Stat label="Total" value={items.length} />
        <Stat label="Active" value={active} />
        <Stat label={"În " + new Date().getFullYear()} value={thisYear} />
        <Stat label="Anulate" value={items.length - active} />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-700 bg-ink-800 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_8rem] print:hidden">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută după număr, partener, tip sau obiect…" className="input min-w-0" />
        <select value={direction} onChange={(e) => setDirection(e.target.value as "ALL" | Direction)} className="input"><option value="ALL">Toate sensurile</option><option value="INCOMING">Intrări</option><option value="OUTGOING">Ieșiri</option><option value="INTERNAL">Interne</option></select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="input"><option value="ALL">Toți anii</option>{years.map((entry) => <option key={entry}>{entry}</option>)}</select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 shadow-card print:rounded-none print:border-0 print:bg-white print:shadow-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[1100px] text-left text-sm print:min-w-0 print:table-fixed print:text-[9px] print:text-black">
            <thead><tr className="border-b border-ink-700 text-xs uppercase text-mist-500 print:border-black print:text-[8px] print:text-black">
              <Th cls="w-24 print:w-[9%]">Nr. înreg.</Th><Th cls="w-24 print:w-[8%]">Data</Th><Th cls="w-24 print:w-[7%]">Sens</Th><Th cls="print:w-[11%]">Tip act</Th><Th cls="print:w-[12%]">Nr./data act</Th><Th cls="print:w-[18%]">Expeditor / Destinatar</Th><Th cls="print:w-[25%]">Obiect</Th><Th cls="print:w-[10%]">Observații</Th><Th cls="w-44 print:hidden">Acțiuni</Th>
            </tr></thead>
            <tbody>{visible.map((item) => (
              <tr key={item.id} className={"border-b border-ink-700 last:border-0 print:border-slate-400 " + (item.isCancelled ? "opacity-55 line-through" : "hover:bg-ink-900/40")}>
                <Td cls="font-mono font-semibold text-mist-100 print:text-black">{registerNumber(item)}{item.isCancelled && <span className="block text-[9px] font-bold uppercase text-state-error print:text-black">Anulat</span>}</Td>
                <Td>{displayDate(item.registrationDate)}</Td>
                <Td><span className={"rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset print:p-0 print:text-black print:ring-0 " + badge(item.direction)}>{labels[item.direction as Direction]}</span></Td>
                <Td cls="font-medium text-mist-100 print:text-black">{item.documentType}</Td>
                <Td><span className="block">{item.documentNumber || "—"}</span><span className="block text-xs print:text-[8px]">{displayDate(item.documentDate)}</span></Td>
                <Td cls="text-mist-100 print:text-black">{item.partnerName}</Td>
                <Td cls="text-mist-100 print:text-black">{item.subject}</Td>
                <Td cls="text-xs print:text-[8px]">{item.notes || "—"}</Td>
                <td className="px-3 py-3 print:hidden"><div className="flex justify-end gap-1">
                  <button type="button" onClick={() => edit(item)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-signal hover:bg-signal-soft">Editează</button>
                  <button type="button" disabled={busyId === item.id} onClick={() => toggleCancelled(item)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-mist-500 hover:bg-ink-700 hover:text-state-error disabled:opacity-50">{item.isCancelled ? "Reactivează" : "Anulează"}</button>
                  <button type="button" disabled={busyId === item.id} onClick={() => deleteItem(item)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-state-error hover:bg-state-error/10 disabled:opacity-50">Șterge</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {visible.length === 0 && <div className="px-6 py-14 text-center text-sm text-mist-500 print:text-black">{items.length === 0 ? "Nu există acte înregistrate încă." : "Nicio înregistrare nu corespunde filtrelor."}</div>}
      </div>
      <p className="hidden pt-3 text-[8px] text-slate-600 print:block">Înregistrările anulate sunt păstrate pentru continuitatea numerotării.</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-medium text-mist-500">{label}{children}</label>;
}
function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-ink-700 bg-ink-800 px-4 py-3"><p className="text-xs text-mist-500">{label}</p><p className="font-mono text-lg font-semibold text-mist-100">{value}</p></div>;
}
function Th({ children, cls = "" }: { children: React.ReactNode; cls?: string }) {
  return <th className={"px-3 py-3 font-semibold print:px-1 print:py-2 " + cls}>{children}</th>;
}
function Td({ children, cls = "" }: { children: React.ReactNode; cls?: string }) {
  return <td className={"px-3 py-3 text-mist-500 print:px-1 print:py-2 print:text-black " + cls}>{children}</td>;
}
