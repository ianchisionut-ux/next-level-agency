"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, RefreshCw } from "lucide-react";

type Partner = { partnerName: string; partnerCif: string; countryCode: string; documentCount: number; taxableBase: number; vat: number; gross: number };
type Purchase = { id: number; partnerName: string; partnerCif: string; countryCode: string; documentType: string; documentNumber: string; net: number; vat: number; gross: number };
type Report = {
  workflow: { status: "DRAFT"|"REVIEW"|"APPROVED"|"FILED"; notes: string; receiptNumber: string; updatedAt: string|null };
  basis: { vatPayer: boolean; vatOnCashAccounting: boolean };
  d300: { dueDate: string; outputVat: number; invoicedOutputVat: number; inputVat: number; vatPayable: number; vatRefundable: number; ready: boolean; vatRows: { vatRate:number; taxableBase:number; vat:number; documentCount:number }[] };
  d394: { dueDate: string; sales: Partner[]; purchases: Purchase[]; ready: boolean };
  d390: { dueDate: string; sales: Partner[]; ready: boolean };
  eFactura: { total:number; validated:number; errors:number };
  warnings: string[];
};

const now = new Date();
const money = (value:number) => value.toLocaleString("ro-RO", { minimumFractionDigits:2, maximumFractionDigits:2 });
const months = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
const statusLabels = { DRAFT:"În lucru", REVIEW:"La verificare", APPROVED:"Aprobată", FILED:"Depusă" };

export default function DeclarationsPage() {
  const [year,setYear]=useState(now.getFullYear()), [month,setMonth]=useState(now.getMonth()+1);
  const [report,setReport]=useState<Report|null>(null), [loading,setLoading]=useState(true), [saving,setSaving]=useState(false), [error,setError]=useState("");
  const [notes,setNotes]=useState(""), [receipt,setReceipt]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");const r=await fetch(`/api/accounting/declarations?year=${year}&month=${month}`);const d=await r.json();if(!r.ok)setError(d.error||"Perioada nu a putut fi încărcată.");else{setReport(d);setNotes(d.workflow.notes);setReceipt(d.workflow.receiptNumber);}setLoading(false);},[year,month]);
  useEffect(()=>{load();},[load]);
  async function setStatus(status:Report["workflow"]["status"]){setSaving(true);setError("");const r=await fetch(`/api/accounting/declarations?year=${year}&month=${month}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,notes,receiptNumber:receipt})});const d=await r.json();setSaving(false);if(!r.ok)setError(d.error||"Statusul nu a putut fi salvat.");else setReport(d);}
  const exportUrl=(type:string)=>`/api/accounting/declarations/export?type=${type}&year=${year}&month=${month}`;
  const pdfUrl=(type:string)=>`/api/accounting/declarations/pdf?type=${type}&year=${year}&month=${month}`;
  if(loading&&!report)return <div className="empty-row">Se calculează perioada fiscală…</div>;
  return <div>
    <div className="page-head"><div><div className="eyebrow">Fișe de lucru · control contabil</div><h2 className="page-title">Declarații ANAF</h2><p className="page-subtitle">Reconciliere TVA și pregătire D300, D394 și D390 din documentele existente.</p></div><div className="declaration-period"><select className="input" value={month} onChange={e=>setMonth(Number(e.target.value))}>{months.map((label,index)=><option value={index+1} key={label}>{label}</option>)}</select><select className="input" value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:7},(_,i)=>now.getFullYear()-5+i).reverse().map(v=><option key={v}>{v}</option>)}</select><button className="btn-secondary" onClick={load}><RefreshCw size={14}/></button></div></div>
    {error&&<div className="ref-error">{error}</div>}
    <div className="ref-notice"><strong>Control contabil obligatoriu:</strong> exporturile sunt fișe de lucru, nu declarații semnate. Valorile trebuie aprobate de contabil și validate cu instrumentele ANAF înainte de depunere.</div>
    {report&&<>
      <div className="declaration-workflow card"><div><div className="section-label">Perioadă fiscală</div><strong>{months[month-1]} {year}</strong><span className={`declaration-status status-${report.workflow.status.toLowerCase()}`}>{statusLabels[report.workflow.status]}</span></div><div className="declaration-steps">{(["DRAFT","REVIEW","APPROVED","FILED"] as const).map(status=><button key={status} disabled={saving} className={report.workflow.status===status?"active":""} onClick={()=>setStatus(status)}>{statusLabels[status]}</button>)}</div></div>
      {report.warnings.length>0&&<div className="declaration-warnings">{report.warnings.map(w=><div key={w}><AlertTriangle size={15}/><span>{w}</span></div>)}</div>}
      <div className="declaration-grid">
        <DeclarationCard code="D300" title="Decont TVA" due={report.d300.dueDate} ready={report.d300.ready} csvHref={exportUrl("D300")} pdfHref={pdfUrl("D300")}><div className="declaration-values"><span>TVA colectată<strong>{money(report.d300.outputVat)} RON</strong></span><span>TVA deductibilă<strong>{money(report.d300.inputVat)} RON</strong></span><span>{report.d300.vatPayable>0?"TVA de plată":"TVA de recuperat"}<strong>{money(report.d300.vatPayable||report.d300.vatRefundable)} RON</strong></span></div></DeclarationCard>
        <DeclarationCard code="D394" title="Operațiuni interne" due={report.d394.dueDate} ready={report.d394.ready} csvHref={exportUrl("D394")} pdfHref={pdfUrl("D394")}><div className="declaration-values"><span>Clienți raportați<strong>{report.d394.sales.length}</strong></span><span>Achiziții înregistrate<strong>{report.d394.purchases.length}</strong></span></div></DeclarationCard>
        <DeclarationCard code="D390" title="Operațiuni UE" due={report.d390.dueDate} ready={report.d390.ready} csvHref={exportUrl("D390")} pdfHref={pdfUrl("D390")}><div className="declaration-values"><span>Parteneri UE<strong>{report.d390.sales.length}</strong></span><span>Bază raportată<strong>{money(report.d390.sales.reduce((s,r)=>s+r.taxableBase,0))} RON</strong></span></div></DeclarationCard>
      </div>
      <div className="ef-status-grid declaration-bottom"><div className="card"><div className="section-label">Reconciliere RO e-Factura</div><div className="ef-status-line"><span>Facturi ale perioadei</span><strong>{report.eFactura.total}</strong></div><div className="ef-status-line"><span>Validate ANAF</span><strong>{report.eFactura.validated}</strong></div><div className="ef-status-line"><span>Erori / respingeri</span><strong>{report.eFactura.errors}</strong></div></div><div className="card declaration-notes"><div className="section-label">Dosarul contabil</div><label className="field-label">Note pentru contabil<textarea className="input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></label><label className="field-label">Număr recipisă după depunere<input className="input" value={receipt} onChange={e=>setReceipt(e.target.value)}/></label><button className="btn-secondary" disabled={saving} onClick={()=>setStatus(report.workflow.status)}>Salvează notele</button></div></div>
    </>}
  </div>;
}

function DeclarationCard({code,title,due,ready,csvHref,pdfHref,children}:{code:string;title:string;due:string;ready:boolean;csvHref:string;pdfHref:string;children:React.ReactNode}){
  return <div className="card declaration-card"><div className="declaration-card-head"><div><span>{code}</span><h3>{title}</h3></div>{ready?<span className="declaration-ready"><CheckCircle2 size={14}/>Date complete</span>:<span className="declaration-review"><AlertTriangle size={14}/>Necesită verificare</span>}</div>{children}<div className="declaration-card-foot"><span>Termen orientativ: <strong>{due}</strong></span><div className="declaration-downloads"><a className="btn-secondary" href={pdfHref}><Download size={14}/>PDF</a><a className="btn-secondary" href={csvHref}><Download size={14}/>CSV</a></div></div></div>
}
