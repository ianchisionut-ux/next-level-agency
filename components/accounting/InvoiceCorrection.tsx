"use client";
import { useState } from "react";

type Correction = { dueDate: string; paymentTerms: string; notes: string; items: { id: number; description: string }[] };
export function InvoiceCorrection({ invoiceId }: { invoiceId: number }) {
  const [value, setValue] = useState<Correction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function open() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/accounting/invoices/${invoiceId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setValue({ dueDate: data.invoice.dueDate || "", paymentTerms: data.invoice.paymentTerms || "", notes: data.invoice.notes || "", items: data.items.map((i: { id: number; description: string }) => ({ id: i.id, description: i.description })) });
    } catch { setMessage("Factura nu a putut fi încărcată."); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/accounting/invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Salvarea a eșuat."); } finally { setBusy(false); }
  }
  return <div className="card mb-4">
    <button className="btn-secondary" disabled={busy} onClick={open}>Corectează detaliile înainte de transmitere</button>
    <p className="text-xs mt-2">Scadență, termene, observații și descrieri. Sumele, TVA-ul, plățile și chitanțele nu se modifică. Disponibil numai înainte de transmitere sau după o respingere exclusiv în Test.</p>
    {message && <p role="alert" className="text-red-600 mt-2">{message}</p>}
    {value && <div className="space-y-3 mt-3">
      <label className="block">Scadență<input className="input" type="date" value={value.dueDate} onChange={e => setValue({ ...value, dueDate: e.target.value })}/></label>
      <label className="block">Termene de plată<input className="input" value={value.paymentTerms} onChange={e => setValue({ ...value, paymentTerms: e.target.value })}/></label>
      <label className="block">Observații<textarea className="input" value={value.notes} onChange={e => setValue({ ...value, notes: e.target.value })}/></label>
      {value.items.map((item, index) => <label className="block" key={item.id}>Descriere poziția {index + 1}<input className="input" value={item.description} onChange={e => setValue({ ...value, items: value.items.map(i => i.id === item.id ? { ...i, description: e.target.value } : i) })}/></label>)}
      <button className="btn-primary" disabled={busy} onClick={save}>{busy ? "Se salvează…" : "Salvează corecțiile"}</button>
      <button className="btn-secondary ml-2" disabled={busy} onClick={() => setValue(null)}>Renunță</button>
    </div>}
  </div>;
}
