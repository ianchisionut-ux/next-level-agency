"use client";

import { useEffect, useState } from "react";
import { Plus, Download, AlertTriangle, Search, Building2, Loader2 } from "lucide-react";

type Client = {
  id: number; name: string; clientType: "PF" | "PJ"; regCom: string; cif: string; cnp: string;
  address: string; judet: string; city: string; phone: string; email: string;
  vatPayer: number; countryCode: string; postalCode: string;
  ciSeries: string; ciNumber: string; sourceConnectionId: string | null; sourceNib: string; flagged: number;
};
type ConnectionBeneficiary = {
  id: string; nib: string; beneficiary: string; identifier: string; phone: string;
  address: string; judet: string; city: string; ciSeries: string; ciNumber: string;
};
const emptyForm = {
  name: "", clientType: "PJ" as "PF" | "PJ", regCom: "", cif: "", cnp: "", address: "",
  judet: "", city: "", phone: "", email: "", vatPayer: 0, countryCode: "RO", postalCode: "", ciSeries: "", ciNumber: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [connections, setConnections] = useState<ConnectionBeneficiary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [connectionId, setConnectionId] = useState("");
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [anafLoading, setAnafLoading] = useState(false);
  const [anafError, setAnafError] = useState("");

  function load() {
    fetch("/api/accounting/clients").then((r) => r.json()).then(setClients);
  }
  function loadConnections() {
    fetch("/api/accounting/connection-beneficiaries").then((r) => r.json()).then(setConnections);
  }
  useEffect(() => { load(); }, []);

  async function importConnection() {
    if (!connectionId) return;
    setImporting(true);
    const response = await fetch("/api/accounting/connection-beneficiaries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    const data = await response.json();
    setImporting(false);
    if (!response.ok) return alert(data.error || "Beneficiarul nu a putut fi preluat.");
    setConnectionId("");
    load();
  }

  async function lookupAnaf() {
    const cui = form.cif.replace(/\D/g, "");
    if (!cui) { setAnafError("Introdu mai întâi CUI-ul firmei."); return; }
    setAnafLoading(true); setAnafError("");
    const response = await fetch(`/api/accounting/anaf/company-lookup?cui=${encodeURIComponent(cui)}`);
    const company = await response.json();
    setAnafLoading(false);
    if (!response.ok) { setAnafError(company.error || "Firma nu a fost găsită la ANAF."); return; }
    setForm((current) => ({
      ...current,
      clientType: "PJ",
      cif: company.cui || current.cif,
      name: company.name || current.name,
      address: company.address || current.address,
      regCom: company.regCom || current.regCom,
      phone: company.phone || current.phone,
      postalCode: company.postalCode || current.postalCode,
      judet: company.judet || current.judet,
      city: company.city || current.city,
      vatPayer: company.vatPayer ? 1 : 0,
    }));
  }
  async function submit() {
    if (!form.name.trim()) return;
    const response = await fetch(editingId ? `/api/accounting/clients/${editingId}` : "/api/accounting/clients", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) return alert("Datele clientului nu au putut fi salvate.");
    setForm(emptyForm); setEditingId(null); setShowForm(false); load();
  }

  function edit(c: Client) {
    setForm({
      name: c.name, clientType: c.clientType || "PJ", regCom: c.regCom, cif: c.cif, cnp: c.cnp,
      address: c.address, judet: c.judet, city: c.city, phone: c.phone, email: c.email,
      vatPayer: c.vatPayer || 0, countryCode: c.countryCode || "RO", postalCode: c.postalCode || "",
      ciSeries: c.ciSeries, ciNumber: c.ciNumber,
    });
    setEditingId(c.id); setShowForm(true);
  }

  async function remove(id: number) {
    if (!confirm("Ștergi acest client?")) return;
    const response = await fetch(`/api/accounting/clients/${id}`, { method: "DELETE" });
    if (!response.ok) return alert("Clientul este folosit într-o factură și nu poate fi șters.");
    load();
  }

  async function toggleFlag(c: Client) {
    await fetch(`/api/accounting/clients/${c.id}/flag`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagged: !c.flagged }),
    });
    load();
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("ro-RO");
  const visibleClients = normalizedSearch
    ? clients.filter((client) => `${client.name} ${client.cif} ${client.cnp} ${client.regCom}`.toLocaleLowerCase("ro-RO").includes(normalizedSearch))
    : clients;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Registru beneficiari</div>
          <h1 className="page-title">Clienți</h1>
          <p className="page-subtitle">{clients.length} beneficiari disponibili pentru facturare.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm((s) => !s); }} className="btn-primary">
          {showForm ? "Închide" : <><Plus size={15}/> Client nou</>}
        </button>
      </div>

      <div className="flex justify-end mb-4"><a href="/api/accounting/export/clients" className="btn-secondary"><Download size={14}/> Export CSV</a></div>

      {showForm && (
        <div className="card mb-6 grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="field-label">Tip beneficiar</label>
            <div className="flex gap-2">
              {(["PF","PJ"] as const).map((type) => <button key={type} type="button" className={`btn-secondary ${form.clientType === type ? "accounting-choice-active" : ""}`} onClick={() => setForm({...form,clientType:type})}>{type === "PF" ? "Persoană fizică" : "Persoană juridică"}</button>)}
            </div>
          </div>
          <div className="col-span-2"><label className="field-label">Denumire firmă / Nume și prenume</label><input className="input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div>
          {form.clientType === "PJ" ? <>
            <div><label className="field-label">CIF / CUI</label><div className="flex gap-2"><input className="input" value={form.cif} onChange={(e)=>{setForm({...form,cif:e.target.value});setAnafError("");}}/><button type="button" onClick={lookupAnaf} disabled={anafLoading} className="btn-secondary whitespace-nowrap">{anafLoading?<Loader2 size={14} className="animate-spin"/>:<Building2 size={14}/>} Caută ANAF</button></div>{anafError&&<p className="text-xs mt-1" style={{color:"var(--red)"}}>{anafError}</p>}</div>
            <div><label className="field-label">Nr. Registrul Comerțului</label><input className="input" value={form.regCom} onChange={(e)=>setForm({...form,regCom:e.target.value})}/></div>
          </> : <>
            <div><label className="field-label">CNP</label><input className="input" value={form.cnp} onChange={(e)=>setForm({...form,cnp:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="field-label">Serie CI</label><input className="input" value={form.ciSeries} onChange={(e)=>setForm({...form,ciSeries:e.target.value})}/></div><div><label className="field-label">Număr CI</label><input className="input" value={form.ciNumber} onChange={(e)=>setForm({...form,ciNumber:e.target.value})}/></div></div>
          </>}
          <div className="col-span-2"><label className="field-label">Adresă completă</label><input className="input" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/></div>
          <div><label className="field-label">Județ</label><input className="input" value={form.judet} onChange={(e)=>setForm({...form,judet:e.target.value})}/></div>
          <div><label className="field-label">Localitate</label><input className="input" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/></div>
          <div><label className="field-label">Țară (cod ISO)</label><input className="input" maxLength={2} value={form.countryCode} onChange={(e)=>setForm({...form,countryCode:e.target.value.toUpperCase()})}/></div>
          <div><label className="field-label">Cod poștal</label><input className="input" value={form.postalCode} onChange={(e)=>setForm({...form,postalCode:e.target.value})}/></div>
          {form.clientType === "PJ" && <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.vatPayer} onChange={(e)=>setForm({...form,vatPayer:e.target.checked?1:0})}/> Client înregistrat în scopuri de TVA</label>}
          <div><label className="field-label">Telefon</label><input className="input" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></div>
          <div><label className="field-label">E-mail</label><input type="email" className="input" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></div>
          <div className="col-span-2"><button onClick={submit} className="btn-primary">{editingId ? "Salvează modificările" : "Adaugă client"}</button></div>
        </div>
      )}

      <div className="card mb-4"><label className="field-label">Caută client după nume sau CUI</label><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-faint)"}}/><input className="input pl-9" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Ex: NEXT LEVEL sau 12345678"/></div></div>

      <div className="card-table"><table><thead><tr><th>Beneficiar</th><th>Identificare</th><th>Adresă</th><th>Contact</th><th>Status</th><th></th></tr></thead>
        <tbody>{visibleClients.length===0&&<tr><td colSpan={6} className="empty-row">Niciun client înregistrat încă.</td></tr>}
          {visibleClients.map((c)=><tr key={c.id}>
            <td><strong>{c.name}</strong>{c.sourceNib&&<div className="text-xs mt-1" style={{color:"var(--cyan-strong)"}}>din {c.sourceNib}</div>}</td>
            <td><span className="doc-chip">{c.clientType || "PJ"}</span><div className="num mt-1">{c.clientType==="PF" ? c.cnp : c.cif}</div>{c.regCom&&<div className="text-xs">{c.regCom}</div>}</td>
            <td>{c.address || "—"}{(c.city||c.judet)&&<div className="text-xs mt-1" style={{color:"var(--text-faint)"}}>{[c.city,c.judet].filter(Boolean).join(", ")}</div>}</td>
            <td>{c.phone||"—"}<div className="text-xs">{c.email}</div></td>
            <td><button onClick={()=>toggleFlag(c)} className={`badge ${c.flagged?"badge-canceled":"badge-paid"}`}>{c.flagged?<span className="inline-flex items-center gap-1"><AlertTriangle size={11}/> neplatnic</span>:"în regulă"}</button></td>
            <td className="text-right space-x-3"><button onClick={()=>edit(c)} className="link-action">editează</button><button onClick={()=>remove(c.id)} className="link-danger">șterge</button></td>
          </tr>)}
        </tbody></table></div>
    </div>
  );
}
