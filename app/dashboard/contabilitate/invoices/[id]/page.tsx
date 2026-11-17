"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/accounting/StatusBadge";
import { EFacturaPanel } from "@/components/accounting/EFacturaPanel";
import { InvoiceCorrection } from "@/components/accounting/InvoiceCorrection";
import { InvoiceRefund } from "@/components/accounting/InvoiceRefund";
import { ArrowLeft, Download, Receipt as ReceiptIcon, RotateCcw } from "lucide-react";
import { bucharestDate } from "@/lib/accounting/date";
import { addMoney, roundMoney, subtractMoney } from "@/lib/accounting/money";
import { completePendingOperation, pendingOperation, readPendingOperation, type PendingOperation } from "@/components/accounting/pending-operation";

type PaymentRequest = { amount: number; date: string; method: string };
type ReceiptRequest = { amount: number; issueDate: string };

type FullInvoice = {
  invoice: {
    id: number;
    series: string;
    number: number;
    issueDate: string;
    status: string;
    total: number;
    subtotal: number;
    vatTotal: number;
    paidAmount: number;
    currency: string;
    invoiceType: "STANDARD" | "STORNO";
    originalInvoiceId: number | null;
    stornoReason: string;
  };
  items: { id: number; description: string; um: string; qty: number; unitPrice: number; vatRate: number; valoare: number; vatValue: number }[];
  client: { id: number; name: string; cif: string };
  company: { name: string };
  user: { id: number; name: string; role: string } | null;
  receipts: { id: number; series: string; number: number; issueDate: string; amount: number; operationKey?: string }[];
  payments: { id: number; amount: number; date: string; method: string; operationKey?: string }[];
  eFacturaSubmission: null | { status: string; uploadId: string };
};

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<FullInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(bucharestDate());
  const [payMethod, setPayMethod] = useState("numerar");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const paymentLock = useRef(false);
  const receiptLock = useRef(false);
  const [pendingPayment, setPendingPayment] = useState<PendingOperation<PaymentRequest> | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<PendingOperation<ReceiptRequest> | null>(null);
  const [loadError, setLoadError] = useState("");
  const paymentStorageKey = `nextlevel.accounting.${id}.payment`;
  const receiptStorageKey = `nextlevel.accounting.${id}.receipt`;

  const load = useCallback(() => {
    fetch(`/api/accounting/invoices/${id}`)
      .then(async (r) => { const result = await r.json(); if (!r.ok || !result.invoice) throw new Error(result.error || "Factura nu a putut fi încărcată."); return result as FullInvoice; })
      .then((d) => {
        setData(d);
        let payment = readPendingOperation<PaymentRequest>(paymentStorageKey);
        let receipt = readPendingOperation<ReceiptRequest>(receiptStorageKey);
        if (payment && d.payments.some(row => row.operationKey === payment?.operationKey)) { completePendingOperation(paymentStorageKey); payment = null; }
        if (receipt && d.receipts.some(row => row.operationKey === receipt?.operationKey)) { completePendingOperation(receiptStorageKey); receipt = null; }
        setPendingPayment(payment); setPendingReceipt(receipt);
        setPayAmount(payment?.payload.amount ?? Math.max(0, subtractMoney(d.invoice.total, d.invoice.paidAmount)));
        if (payment) { setPayDate(payment.payload.date); setPayMethod(payment.payload.method); }
        setLoadError("");
      }).catch((error) => setLoadError(error instanceof Error ? error.message : "Factura nu a putut fi încărcată."));
  }, [id, paymentStorageKey, receiptStorageKey]);
  useEffect(load, [load]);

  async function recoverOperation(kind: "payment" | "receipt", operationKey: string) {
    try {
      const response = await fetch(`/api/accounting/invoices/${id}`, { cache: "no-store" });
      if (!response.ok) return false;
      const current = await response.json() as FullInvoice;
      const rows = kind === "payment" ? current.payments : current.receipts;
      if (!rows.some(row => row.operationKey === operationKey)) return false;
      completePendingOperation(kind === "payment" ? paymentStorageKey : receiptStorageKey);
      if (kind === "payment") setPendingPayment(null); else setPendingReceipt(null);
      load();
      alert("Operațiunea anterioară este deja înregistrată. Situația facturii a fost reîncărcată.");
      return true;
    } catch { return false; }
  }

  async function recoverPending(kind: "payment" | "receipt") {
    try {
      const previous = readPendingOperation(kind === "payment" ? paymentStorageKey : receiptStorageKey);
      return previous ? await recoverOperation(kind, previous.operationKey) : false;
    } catch { return false; }
  }

  async function addPayment() {
    if (paymentLock.current || !data) return;
    paymentLock.current = true;
    setPaymentBusy(true);
    try {
      const previous = readPendingOperation<PaymentRequest>(paymentStorageKey);
      if (previous && await recoverOperation("payment", previous.operationKey)) return;
      const remaining = Math.max(0, subtractMoney(data.invoice.total, data.invoice.paidAmount));
      if (!Number.isFinite(payAmount) || payAmount <= 0 || roundMoney(payAmount) !== payAmount || (!previous && payAmount > remaining)) return alert("Introdu o sumă pozitivă cu maximum două zecimale, în limita restului de plată.");
      const pending = pendingOperation(paymentStorageKey, { amount: payAmount, date: payDate, method: payMethod });
      setPendingPayment(pending);
      const response = await fetch(`/api/accounting/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending.payload, operationKey: pending.operationKey }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (await recoverOperation("payment", pending.operationKey)) return;
        return alert(result.error || "Plata nu a putut fi înregistrată.");
      }
      completePendingOperation(paymentStorageKey); setPendingPayment(null);
      load();
    } catch {
      if (await recoverPending("payment")) return;
      alert("Plata nu a putut fi confirmată. Reîncarcă factura și verifică încasările înainte de o nouă plată.");
    } finally {
      paymentLock.current = false;
      setPaymentBusy(false);
    }
  }

  async function generateReceipt() {
    if (!data || receiptLock.current) return;
    receiptLock.current = true;
    setReceiptBusy(true);
    try {
    const previous = readPendingOperation<ReceiptRequest>(receiptStorageKey);
    if (previous && await recoverOperation("receipt", previous.operationKey)) return;
    if (!previous && data.invoice.currency !== "RON") return alert("Chitanțele sunt disponibile numai pentru facturi în RON.");
    const cashPaid = data.payments
      .filter((payment) => payment.method.toLowerCase() === "numerar" || payment.method.toLowerCase() === "cash")
      .reduce((sum, payment) => addMoney(sum, payment.amount), 0);
    const receipted = data.receipts.reduce((sum, receipt) => addMoney(sum, receipt.amount), 0);
    const amount = subtractMoney(cashPaid, receipted);
    if (!previous && amount <= 0) return alert("Înregistrează mai întâi o plată în numerar. Chitanța se emite numai pentru suma încasată.");
    const pending = pendingOperation(receiptStorageKey, { amount: amount > 0 ? amount : previous!.payload.amount, issueDate: payDate });
    setPendingReceipt(pending);
      const response = await fetch(`/api/accounting/invoices/${id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending.payload, operationKey: pending.operationKey }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (await recoverOperation("receipt", pending.operationKey)) return;
        return alert(result.error || "Chitanța nu a putut fi emisă.");
      }
      completePendingOperation(receiptStorageKey); setPendingReceipt(null);
      load();
    } catch {
      if (await recoverPending("receipt")) return;
      alert("Chitanța nu a putut fi confirmată. Reîncarcă factura și verifică documentele existente înainte de a reîncerca.");
    } finally {
      receiptLock.current = false;
      setReceiptBusy(false);
    }
  }

  if (!data) return <div role={loadError ? "alert" : "status"} style={{ color: "var(--text-faint)" }}>{loadError || "Se încarcă…"}</div>;
  const { invoice, items, client, user, receipts, payments } = data;
  const rest = subtractMoney(invoice.total, invoice.paidAmount);
  const cashPaid = payments
    .filter((payment) => payment.method.toLowerCase() === "numerar" || payment.method.toLowerCase() === "cash")
    .reduce((sum, payment) => addMoney(sum, payment.amount), 0);
  const receiptedAmount = receipts.reduce((sum, receipt) => addMoney(sum, receipt.amount), 0);
  const receiptAvailable = Math.max(0, subtractMoney(cashPaid, receiptedAmount));
  const paymentDisabledReason = rest <= 0 ? "Factura este achitată integral." : !Number.isFinite(payAmount) || payAmount <= 0 ? "Introdu o sumă mai mare decât 0." : payAmount > rest ? "Suma depășește restul de plată." : roundMoney(payAmount) !== payAmount ? "Suma poate avea maximum două zecimale." : "";
  const receiptDisabledReason = invoice.currency !== "RON" ? "Chitanțele sunt disponibile numai în RON." : receiptAvailable <= 0 ? "Nu există o plată în numerar fără chitanță." : "";
  const financialLocked = invoice.invoiceType === "STORNO" || ["storno", "stornoed", "canceled"].includes(invoice.status);
  const canStorno = invoice.invoiceType !== "STORNO" && !financialLocked;

  return (
    <div>
      <Link href="/dashboard/contabilitate/invoices" className="btn-secondary mb-4 inline-flex items-center gap-2">
        <ArrowLeft size={16} /> Înapoi la facturi
      </Link>
      <div className="page-head">
        <div>
          <div className="eyebrow">Factura</div>
          <h1 className="page-title">
            <span className="doc-chip" style={{ fontSize: 18, padding: "5px 12px" }}>
              {invoice.series} {String(invoice.number).padStart(4, "0")}
            </span>
          </h1>
          <p className="page-subtitle">
            {client.name} &middot; {new Date(invoice.issueDate).toLocaleDateString("ro-RO")}
            {user && <> &middot; intocmita de {user.name}</>}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="flex gap-3 mb-6">
        <a href={`/api/accounting/invoices/${id}/pdf`} download className="btn-primary">
          <Download size={15} /> Descarca factura (PDF)
        </a>
        {canStorno && <a href={`/dashboard/contabilitate/invoices/storno?invoice=${id}`} className="btn-secondary">
          <RotateCcw size={14} /> Stornează factura
        </a>}
        <span className="ef-delete-lock">Document emis · anularea se face prin storno</span>
      </div>

      <EFacturaPanel invoiceId={Number(id)} />
      {loadError && <p role="alert" className="mb-4 text-red-600">{loadError}</p>}
      {(pendingPayment || pendingReceipt) && <div className="card mb-6">
        <p className="text-sm mb-3">O operațiune anterioară așteaptă confirmarea. Reverificarea păstrează identificatorul inițial și previne dublarea. Poți corecta datele unei cereri respinse.</p>
        {pendingPayment && <button className="btn-secondary mr-2" onClick={addPayment} disabled={paymentBusy}>Reverifică plata de {fmt(pendingPayment.payload.amount)} {invoice.currency}</button>}
        {pendingReceipt && <button className="btn-secondary" onClick={generateReceipt} disabled={receiptBusy}>Reverifică chitanța de {fmt(pendingReceipt.payload.amount)} RON</button>}
      </div>}
      {invoice.status === "stornoed" && Number(invoice.paidAmount) > 0 && (
        <InvoiceRefund
          invoiceId={invoice.id}
          remaining={Number(invoice.paidAmount)}
          onSaved={load}
        />
      )}
      {!financialLocked && <InvoiceCorrection invoiceId={Number(id)} />}

      <div className="card-table mb-6">
        <table>
          <thead>
            <tr>
              <th>Denumire</th>
              <th>U.M.</th>
              <th className="text-right">Cant.</th>
              <th className="text-right">Pret</th>
              <th className="text-right">TVA%</th>
              <th className="text-right">Valoare</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td>{it.um}</td>
                <td className="text-right num">{it.qty}</td>
                <td className="text-right num">{fmt(it.unitPrice)}</td>
                <td className="text-right num">{it.vatRate}%</td>
                <td className="text-right num">{fmt(it.valoare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div style={{ width: 260 }} className="text-sm space-y-1">
          <div className="flex justify-between" style={{ color: "var(--text-dim)" }}>
            <span>Subtotal</span>
            <span className="num">{fmt(invoice.subtotal)} {invoice.currency}</span>
          </div>
          <div className="flex justify-between" style={{ color: "var(--text-dim)" }}>
            <span>TVA</span>
            <span className="num">{fmt(invoice.vatTotal)} {invoice.currency}</span>
          </div>
          <div
            className="flex justify-between font-bold pt-2"
            style={{ borderTop: "1px solid var(--border-soft)", fontSize: 16 }}
          >
            <span>Total</span>
            <span className="num" style={{ color: "var(--cyan-strong)" }}>
              {fmt(invoice.total)} {invoice.currency}
            </span>
          </div>
          <div className="flex justify-between" style={{ color: "var(--text-dim)" }}>
            <span>Incasat</span>
            <span className="num">{fmt(invoice.paidAmount)} {invoice.currency}</span>
          </div>
          <div className="flex justify-between font-semibold" style={{ color: "var(--amber)" }}>
            <span>Rest de plata</span>
            <span className="num">{financialLocked ? "—" : `${fmt(Math.max(0, rest))} ${invoice.currency}`}</span>
          </div>
        </div>
      </div>

      {financialLocked && <div className="card mb-6"><div className="section-label">Document fără încasare</div><p className="text-sm text-slate-500">{invoice.invoiceType === "STORNO" ? `Aceasta este factura storno pentru documentul inițial. ${invoice.stornoReason || ""}` : "Factura a fost stornată; încasările și chitanțele sunt blocate."}</p></div>}
      {!financialLocked && <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="section-label">Inregistreaza o plata</div>
          <div className="space-y-2">
            <div>
              <label className="field-label">Suma ({invoice.currency})</label>
              <input type="number" min="0.01" max={Math.max(0, rest)} step="0.01" className="input" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label">Data</label>
              <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Metoda</label>
              <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="numerar">Numerar</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer bancar</option>
              </select>
            </div>
            <button title={paymentDisabledReason} onClick={addPayment} disabled={Boolean(paymentDisabledReason || loadError) || paymentBusy || Boolean(pendingPayment)} className="btn-primary mt-2 disabled:cursor-not-allowed disabled:opacity-50">
              {paymentBusy ? "Se înregistrează…" : "Adaugă plata"}
            </button>
            {paymentDisabledReason && <p className="text-xs" style={{ color: "var(--text-faint)" }}>{paymentDisabledReason}</p>}
          </div>
          {payments.length > 0 && (
            <div className="mt-4 text-xs space-y-1">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between pt-1"
                  style={{ borderTop: "1px solid var(--border-soft)", color: "var(--text-dim)" }}
                >
                  <span>
                    {new Date(p.date).toLocaleDateString("ro-RO")} &middot; {p.method}
                  </span>
                  <span className="num">{fmt(p.amount)} {invoice.currency}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label">Chitante</div>
          <button title={receiptDisabledReason} onClick={generateReceipt} disabled={Boolean(receiptDisabledReason || loadError) || receiptBusy || Boolean(pendingReceipt)} className="btn-primary mb-2 disabled:cursor-not-allowed disabled:opacity-50">
            <ReceiptIcon size={14} /> {receiptBusy ? "Se generează…" : `Generează chitanță · ${fmt(receiptAvailable)} RON`}
          </button>
          {receiptDisabledReason && <p className="mb-2 text-xs" style={{ color: "var(--text-faint)" }}>{receiptDisabledReason}</p>}
          <p className="mb-3 text-xs" style={{ color: "var(--text-faint)" }}>Chitanța acoperă numai plățile în numerar deja înregistrate și nu poate fi emisă de două ori pentru aceeași sumă.</p>
          <div className="space-y-2">
            {receipts.length === 0 && <p className="text-xs" style={{ color: "var(--text-faint)" }}>Nicio chitanta emisa inca.</p>}
            {receipts.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm pt-2"
                style={{ borderTop: "1px solid var(--border-soft)" }}
              >
                <span className="doc-chip">
                  {r.series} {String(r.number).padStart(4, "0")}
                </span>
                <span className="num">{fmt(r.amount)} RON</span>
                <a href={`/api/accounting/receipts/${r.id}/pdf`} download className="link-action">
                  descarca PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}
