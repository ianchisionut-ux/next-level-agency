"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateInvoiceTotals } from "@/lib/accounting/money";

type Correction = { clientId: number; dueDate: string; paymentTerms: string; notes: string; items: { id: number; description: string; qty: number; unitPrice: number }[] };
type FinancialSnapshot = { items: { id: number; qty: number; unitPrice: number; vatRate: number; vatCategoryCode: string }[]; discountPercent: number; currency: string; subtotal: number; vatTotal: number; total: number; frozen: boolean };
export function InvoiceCorrection({ invoiceId }: { invoiceId: number }) {
  const [value, setValue] = useState<Correction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [clients, setClients] = useState<{id:number;name:string}[]>([]);
  const [financial, setFinancial] = useState<FinancialSnapshot | null>(null);
  const lock = useRef(false);
  const open = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/accounting/invoices/${invoiceId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setValue({ clientId: data.invoice.clientId, dueDate: data.invoice.dueDate || "", paymentTerms: data.invoice.paymentTerms || "", notes: data.invoice.notes || "", items: data.items.map((i: Correction['items'][number]) => ({ id: i.id, description: i.description, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })) });
      setFinancial({ items: data.items, discountPercent: Number(data.invoice.discountPercent || 0), currency: data.invoice.currency, subtotal: data.invoice.subtotal, vatTotal: data.invoice.vatTotal, total: data.invoice.total, frozen: Number(data.invoice.paidAmount) !== 0 || data.payments.length > 0 || data.receipts.length > 0 });
      const clientResponse = await fetch('/api/accounting/clients');
      if (clientResponse.ok) setClients(await clientResponse.json());
    } catch { setMessage("Factura nu a putut fi încărcată."); } finally { lock.current = false; setBusy(false); }
  }, [invoiceId]);
  useEffect(() => {
    if (window.location.hash === "#editare-factura") void open();
  }, [open]);
  const moneyChanged = Boolean(value && financial && value.items.some(item => {
    const original = financial.items.find(row => row.id === item.id);
    return !original || Number(original.qty) !== item.qty || Number(original.unitPrice) !== item.unitPrice;
  }));
  let totals = financial && { subtotal: financial.subtotal, vatTotal: financial.vatTotal, total: financial.total };
  let calculationError = "";
  if (value && financial && moneyChanged) {
    try {
      totals = calculateInvoiceTotals(value.items.map(item => ({ ...financial.items.find(row => row.id === item.id)!, ...item })), financial.discountPercent);
      if (totals.total <= 0 || value.items.some(item => item.unitPrice < 0)) calculationError = "Factura normală trebuie să aibă un total pozitiv și prețuri nenegative.";
    } catch (error) { calculationError = error instanceof Error ? error.message : "Verifică valorile facturii."; }
  }
  async function save() {
    if (lock.current || !value || calculationError) return;
    lock.current = true;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/accounting/invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Salvarea a eșuat."); } finally { lock.current = false; setBusy(false); }
  }
  return <div className="card mb-4" id="editare-factura">
    <button className="btn-secondary" disabled={busy} onClick={open}>Editează factura</button>
    <p className="text-xs mt-2">Corectezi detaliile, beneficiarul, cantitățile și prețurile înainte de transmitere sau după respingerea exclusiv în Test. După încasare, beneficiarul și valorile sunt protejate. TVA-ul, plățile și chitanțele nu sunt modificate.</p>
    {message && <p role="alert" className="text-red-600 mt-2">{message}</p>}
    {value && <div className="space-y-3 mt-3">
      <label className="block">Beneficiar<select className="input" disabled={financial?.frozen || busy} value={value.clientId} onChange={e => setValue({...value,clientId:Number(e.target.value)})}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {value.items.map(item => <div className="flex gap-3" key={`amount-${item.id}`}><label>Cantitate<input type="number" min="0.000001" max={1000000000} step="0.000001" disabled={financial?.frozen || busy} className="input" value={item.qty} onChange={e=>setValue({...value,items:value.items.map(i=>i.id===item.id?{...i,qty:Number(e.target.value)}:i)})}/></label><label>Preț unitar<input type="number" min="0" max={1000000000} step="0.000000001" disabled={financial?.frozen || busy} className="input" value={item.unitPrice} onChange={e=>setValue({...value,items:value.items.map(i=>i.id===item.id?{...i,unitPrice:Number(e.target.value)}:i)})}/></label></div>)}
      {totals && financial && <p className="text-sm">Subtotal {totals.subtotal.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · TVA {totals.vatTotal.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Total {totals.total.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {financial.currency}</p>}
      {calculationError && <p role="alert" className="text-red-600">{calculationError}</p>}
      <label className="block">Scadență<input className="input" type="date" value={value.dueDate} onChange={e => setValue({ ...value, dueDate: e.target.value })}/></label>
      <label className="block">Termene de plată<input className="input" value={value.paymentTerms} onChange={e => setValue({ ...value, paymentTerms: e.target.value })}/></label>
      <label className="block">Observații<textarea className="input" value={value.notes} onChange={e => setValue({ ...value, notes: e.target.value })}/></label>
      {value.items.map((item, index) => <label className="block" key={item.id}>Descriere poziția {index + 1}<input className="input" value={item.description} onChange={e => setValue({ ...value, items: value.items.map(i => i.id === item.id ? { ...i, description: e.target.value } : i) })}/></label>)}
      <button className="btn-primary" disabled={busy || Boolean(calculationError)} onClick={save}>{busy ? "Se salvează…" : "Salvează corecțiile"}</button>
      <button className="btn-secondary ml-2" disabled={busy} onClick={() => setValue(null)}>Renunță</button>
    </div>}
  </div>;
}
