import type { PoolClient } from "pg";
import { ready } from "@/lib/accounting/db";
import { addMoney, convertMoney, prorateMoney, roundMoney, subtractMoney } from "./money";

export type RefTransactionType = "INCOME" | "EXPENSE";
export type RefFiscalCategory =
  | "TAXABLE_INCOME"
  | "NON_TAXABLE_INCOME"
  | "DEDUCTIBLE_EXPENSE"
  | "PARTIAL_EXPENSE"
  | "NON_DEDUCTIBLE_EXPENSE";

export type RefTransaction = {
  id: number;
  type: RefTransactionType;
  date: string;
  documentType: string;
  documentNumber: string;
  explanation: string;
  grossAmount: number;
  vatAmount: number;
  vatRate: number | null;
  netAmount: number;
  fiscalCategory: RefFiscalCategory;
  deductibilityPercent: number;
  fiscalAmount: number;
  invoiceId: number | null;
  paymentId: number | null;
  source: "MANUAL" | "AUTO_PAYMENT";
  partnerName: string;
  partnerCif: string;
  partnerCountryCode: string;
  partnerVatPayer: number;
  notes: string;
  createdAt: string;
};

export type RefSummary = {
  totalIncome: number;
  taxableIncome: number;
  totalExpenses: number;
  deductibleExpenses: number;
  fiscalResult: number;
};

export type RefTransactionInput = {
  type: RefTransactionType;
  date: string;
  documentType: string;
  documentNumber?: string;
  explanation: string;
  grossAmount: number;
  vatAmount?: number;
  vatRate?: number | null;
  fiscalCategory: RefFiscalCategory;
  deductibilityPercent?: number;
  notes?: string;
  partnerName?: string;
  partnerCif?: string;
  partnerCountryCode?: string;
  partnerVatPayer?: number;
};

function round2(value: number) {
  return roundMoney(value);
}

function mapTransaction(row: Record<string, unknown>): RefTransaction {
  return {
    ...(row as unknown as RefTransaction),
    date: String(row.date).slice(0, 10),
    grossAmount: Number(row.grossAmount),
    vatAmount: Number(row.vatAmount),
    vatRate: row.vatRate == null ? null : Number(row.vatRate),
    netAmount: Number(row.netAmount),
    deductibilityPercent: Number(row.deductibilityPercent),
    fiscalAmount: Number(row.fiscalAmount),
  };
}

export async function getRefVatPayer(): Promise<boolean> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT "vatPayer" FROM company WHERE id=1`);
  return Boolean(Number(rows[0]?.vatPayer || 0));
}

export function calculateRefFiscalAmount(input: {
  type: RefTransactionType;
  category: RefFiscalCategory;
  grossAmount: number;
  vatAmount: number;
  vatPayer: boolean;
  deductibilityPercent?: number;
}) {
  const gross = round2(input.grossAmount);
  const vat = round2(input.vatAmount);
  const net = subtractMoney(gross, vat);
  const base = input.vatPayer ? net : gross;

  if (input.type === "INCOME") {
    return input.category === "TAXABLE_INCOME" ? round2(base) : 0;
  }
  if (input.category === "NON_DEDUCTIBLE_EXPENSE") return 0;
  const percent = input.category === "PARTIAL_EXPENSE"
    ? Number(input.deductibilityPercent ?? 50)
    : 100;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Procentul de deductibilitate este invalid.");
  return prorateMoney(base, percent, 100);
}

function validateInput(input: RefTransactionInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Data înregistrării este obligatorie.");
  const parsedDate = new Date(`${input.date}T00:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.date) throw new Error("Data înregistrării nu este validă.");
  if (!["INCOME", "EXPENSE"].includes(input.type)) throw new Error("Tipul înregistrării este invalid.");
  if (!input.documentType.trim()) throw new Error("Tipul documentului este obligatoriu.");
  if (!input.explanation.trim()) throw new Error("Explicația este obligatorie.");
  if (!Number.isFinite(input.grossAmount) || input.grossAmount <= 0) throw new Error("Suma brută trebuie să fie pozitivă.");
  const vat = Number(input.vatAmount || 0);
  if (!Number.isFinite(vat) || vat < 0 || vat > input.grossAmount) throw new Error("Valoarea TVA este invalidă.");
  if (input.vatRate != null && (![0,5,9,11,19,20,21,24].includes(Number(input.vatRate)))) throw new Error("Cota TVA nu este acceptată de formularele ANAF.");
  if (input.partnerCountryCode && !/^[A-Za-z]{2}$/.test(input.partnerCountryCode.trim())) throw new Error("Codul țării partenerului trebuie să aibă două litere.");
  if (input.deductibilityPercent != null && (!Number.isFinite(Number(input.deductibilityPercent)) || Number(input.deductibilityPercent) < 0 || Number(input.deductibilityPercent) > 100)) throw new Error("Procentul de deductibilitate trebuie să fie între 0 și 100.");
  const incomeCategories = ["TAXABLE_INCOME", "NON_TAXABLE_INCOME"];
  const expenseCategories = ["DEDUCTIBLE_EXPENSE", "PARTIAL_EXPENSE", "NON_DEDUCTIBLE_EXPENSE"];
  if (input.type === "INCOME" && !incomeCategories.includes(input.fiscalCategory)) throw new Error("Categoria fiscală nu corespunde unui venit.");
  if (input.type === "EXPENSE" && !expenseCategories.includes(input.fiscalCategory)) throw new Error("Categoria fiscală nu corespunde unei cheltuieli.");
}

export async function createRefTransaction(input: RefTransactionInput): Promise<number> {
  validateInput(input);
  const pool = await ready();
  const vatPayer = await getRefVatPayer();
  const gross = round2(Number(input.grossAmount));
  const vat = round2(Number(input.vatAmount || 0));
  if (gross <= 0) throw new Error("Suma brută trebuie să fie de cel puțin 0,01 RON.");
  const net = subtractMoney(gross, vat);
  const vatRate = input.vatRate == null ? null : Number(input.vatRate);
  if (vat > 0 && vatRate == null) throw new Error("Cota TVA este obligatorie când documentul conține TVA.");
  if (vatRate != null && vat !== prorateMoney(net, vatRate, 100)) throw new Error("TVA-ul nu corespunde exact cotei selectate și bazei documentului.");
  const percent = input.fiscalCategory === "PARTIAL_EXPENSE"
    ? Math.min(100, Math.max(0, Number(input.deductibilityPercent ?? 50)))
    : input.fiscalCategory === "NON_DEDUCTIBLE_EXPENSE" ? 0 : 100;
  const fiscalAmount = calculateRefFiscalAmount({
    type: input.type,
    category: input.fiscalCategory,
    grossAmount: gross,
    vatAmount: vat,
    vatPayer,
    deductibilityPercent: percent,
  });
  const { rows } = await pool.query(
    `INSERT INTO ref_transactions
      (type, date, "documentType", "documentNumber", explanation, "grossAmount", "vatAmount", "netAmount",
       "fiscalCategory", "deductibilityPercent", "fiscalAmount", source, notes, "partnerName", "partnerCif", "partnerCountryCode", "vatRate", "partnerVatPayer")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'MANUAL',$12,$13,$14,$15,$16,$17) RETURNING id`,
    [input.type, input.date, input.documentType.trim(), input.documentNumber?.trim() || "", input.explanation.trim(),
      gross, vat, net, input.fiscalCategory, percent, fiscalAmount, input.notes?.trim() || "",
      input.partnerName?.trim() || "", input.partnerCif?.trim().toUpperCase() || "", input.partnerCountryCode?.trim().toUpperCase() || "RO", vatRate, Number(input.partnerVatPayer??-1)]
  );
  return Number(rows[0].id);
}

export async function createRefIncomeForPayment(input: {
  paymentId: number;
  invoiceId: number;
  date: string;
  amount: number;
  invoiceTotal: number;
  invoiceSubtotal: number;
  currency?: string;
  exchangeRate?: number;
  paidAmountBefore?: number;
  series: string;
  number: number;
  clientName: string;
}, client?: PoolClient) {
  const executor = client || await ready();
  if (!Number.isFinite(input.invoiceTotal) || input.invoiceTotal <= 0) throw new Error("Totalul facturii pentru încasare este invalid.");
  if (!Number.isFinite(input.invoiceSubtotal) || input.invoiceSubtotal < 0 || input.invoiceSubtotal > input.invoiceTotal) throw new Error("Baza facturii pentru încasare este invalidă.");
  const currency = input.currency || "RON";
  const exchangeRate = input.exchangeRate ?? 1;
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate >= 1_000_000 || (currency === "RON" && exchangeRate !== 1)) throw new Error("Moneda sau cursul încasării este invalid.");
  // Allocate the difference of cumulative balances, so the final payment or
  // refund closes every cent, even across many partial payments. Historical VAT
  // derives from the issued invoice, never from today's company VAT setting.
  const before = round2(input.paidAmountBefore ?? 0);
  const after = addMoney(before, input.amount);
  if (before < 0 || before > input.invoiceTotal || after < 0 || after > input.invoiceTotal || round2(input.amount) === 0) throw new Error("Soldurile încasării sunt în afara limitelor facturii.");
  const gross = subtractMoney(convertMoney(after, exchangeRate), convertMoney(before, exchangeRate));
  const netBefore = prorateMoney(before, input.invoiceSubtotal, input.invoiceTotal);
  const netAfter = prorateMoney(after, input.invoiceSubtotal, input.invoiceTotal);
  const net = subtractMoney(convertMoney(netAfter, exchangeRate), convertMoney(netBefore, exchangeRate));
  const vat = subtractMoney(gross, net);
  const fiscalAmount = net;
  await executor.query(
    `INSERT INTO ref_transactions
      (type, date, "documentType", "documentNumber", explanation, "grossAmount", "vatAmount", "netAmount",
       "fiscalCategory", "deductibilityPercent", "fiscalAmount", "invoiceId", "paymentId", source)
     VALUES ('INCOME',$1,'FACTURA',$2,$3,$4,$5,$6,'TAXABLE_INCOME',100,$7,$8,$9,'AUTO_PAYMENT')
     ON CONFLICT ("paymentId") WHERE "paymentId" IS NOT NULL DO NOTHING`,
    [input.date, `${input.series} ${input.number}`, `Încasare factură – ${input.clientName}`, gross, vat, net,
      fiscalAmount, input.invoiceId, input.paymentId]
  );
}

export async function listRefTransactions(year: number): Promise<RefTransaction[]> {
  const pool = await ready();
  const { rows } = await pool.query(
    `SELECT * FROM ref_transactions WHERE EXTRACT(YEAR FROM date)=$1 ORDER BY date, id`,
    [year]
  );
  return rows.map(mapTransaction);
}

export function summarizeRefTransactions(rows: RefTransaction[]): RefSummary {
  const summary = rows.reduce((acc, row) => {
    if (row.type === "INCOME") {
      acc.totalIncome = addMoney(acc.totalIncome, row.grossAmount);
      acc.taxableIncome = addMoney(acc.taxableIncome, row.fiscalAmount);
    } else {
      acc.totalExpenses = addMoney(acc.totalExpenses, row.grossAmount);
      acc.deductibleExpenses = addMoney(acc.deductibleExpenses, row.fiscalAmount);
    }
    return acc;
  }, { totalIncome: 0, taxableIncome: 0, totalExpenses: 0, deductibleExpenses: 0 });
  return {
    totalIncome: round2(summary.totalIncome),
    taxableIncome: round2(summary.taxableIncome),
    totalExpenses: round2(summary.totalExpenses),
    deductibleExpenses: round2(summary.deductibleExpenses),
    fiscalResult: subtractMoney(summary.taxableIncome, summary.deductibleExpenses),
  };
}

export async function getRefReport(year: number) {
  const transactions = await listRefTransactions(year);
  return { transactions, summary: summarizeRefTransactions(transactions), vatPayer: await getRefVatPayer() };
}

export async function deleteRefTransaction(id: number) {
  const pool = await ready();
  const { rowCount } = await pool.query(`DELETE FROM ref_transactions WHERE id=$1 AND source='MANUAL'`, [id]);
  if (!rowCount) throw new Error("Înregistrările generate automat din încasări nu pot fi șterse manual.");
}
