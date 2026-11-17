"use client";

import { useEffect, useRef, useState } from "react";
import { bucharestDate } from "@/lib/accounting/date";
import { roundMoney } from "@/lib/accounting/money";
import { completePendingOperation, pendingOperation, readPendingOperation, type PendingOperation } from "./pending-operation";

type RefundRequest = { amount: number; date: string; method: string; refund: true };

export function InvoiceRefund({
  invoiceId,
  remaining,
  onSaved,
}: {
  invoiceId: number;
  remaining: number;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(remaining);
  const [date, setDate] = useState(bucharestDate());
  const [method, setMethod] = useState("bank");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingOperation<RefundRequest> | null>(null);
  const lock = useRef(false);
  const storageKey = `nextlevel.accounting.${invoiceId}.refund`;

  useEffect(() => {
    try {
      const previous = readPendingOperation<RefundRequest>(storageKey);
      setPending(previous);
      if (previous) { setAmount(previous.payload.amount); setDate(previous.payload.date); setMethod(previous.payload.method); }
    } catch { setError("Restituirea anterioară nu poate fi citită. Verifică încasările înainte de a continua."); }
  }, [storageKey]);

  async function recover(operationKey: string) {
    try {
      const response = await fetch(`/api/accounting/invoices/${invoiceId}`, { cache: "no-store" });
      if (!response.ok) return false;
      const data = await response.json();
      if (!Array.isArray(data.payments) || !data.payments.some((row: { operationKey?: string }) => row.operationKey === operationKey)) return false;
      completePendingOperation(storageKey); setPending(null);
      setError("Restituirea anterioară este deja înregistrată. Situația a fost reîncărcată.");
      onSaved();
      return true;
    } catch { return false; }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const previous = readPendingOperation<RefundRequest>(storageKey);
      if (previous && await recover(previous.operationKey)) return;
      if (!Number.isFinite(amount) || amount <= 0 || (!previous && amount > remaining) || roundMoney(amount) !== amount) throw new Error("Suma trebuie să fie pozitivă, cu maximum două zecimale și în limita soldului de restituit.");
      const operation = pendingOperation<RefundRequest>(storageKey, { amount, date, method, refund: true });
      setPending(operation);
      const response = await fetch(
        `/api/accounting/invoices/${invoiceId}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...operation.payload, operationKey: operation.operationKey }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (await recover(operation.operationKey)) return;
        throw new Error(
          data.error || "Restituirea nu a putut fi înregistrată.",
        );
      }
      completePendingOperation(storageKey); setPending(null);
      onSaved();
    } catch (caught) {
      try {
        const previous = readPendingOperation<RefundRequest>(storageKey);
        if (previous && await recover(previous.operationKey)) return;
      } catch { /* Storage errors remain visible and never rotate the key. */ }
      setError(
        caught instanceof Error ? caught.message : "Eroare de conexiune.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="card mb-6 p-4 space-y-3" onSubmit={save}>
      <h3 className="font-bold">Restituire către client</h3>
      <p>
        Sold de restituit: {remaining.toFixed(2)} în moneda facturii.
        Înregistrează aici transferul sau plata deja efectuată.
      </p>
      <label className="field-label">
        Sumă
        <input
          className="input"
          type="number"
          min="0.01"
          max={remaining}
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          required
        />
      </label>
      <label className="field-label">
        Data
        <input
          className="input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </label>
      <label className="field-label">
        Metodă
        <select
          className="input"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value="bank">Bancă</option>
          <option value="numerar">Numerar</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {pending && <p className="text-sm">Reverificarea păstrează identificatorul inițial și împiedică înregistrarea de două ori. Poți corecta datele unei cereri respinse.</p>}
      <button className="btn-primary" disabled={busy || (!pending && remaining <= 0)}>
        {busy ? "Se salvează…" : pending ? "Reverifică restituirea" : "Înregistrează restituirea"}
      </button>
    </form>
  );
}
