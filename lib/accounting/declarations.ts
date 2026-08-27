import { ready } from "./db";

export type DeclarationStatus = "DRAFT" | "REVIEW" | "APPROVED" | "FILED";
export type DeclarationType = "D300" | "D394" | "D390";

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "GR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "SE", "SI", "SK",
]);

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function periodBounds(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("An fiscal invalid.");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Lună fiscală invalidă.");
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, next };
}

function indicativeDueDate(year: number, month: number, day: number) {
  const dueYear = month === 12 ? year + 1 : year;
  const dueMonth = month === 12 ? 1 : month + 1;
  const maxDay = new Date(Date.UTC(dueYear, dueMonth, 0)).getUTCDate();
  return `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
}

type PartnerRow = {
  partnerName: string;
  partnerCif: string;
  countryCode: string;
  documentCount: number;
  taxableBase: number;
  vat: number;
  gross: number;
};

export async function getDeclarationPeriod(year: number, month: number) {
  const { start, next } = periodBounds(year, month);
  const pool = await ready();
  const [companyResult, vatRowsResult, salesPartnersResult, expensesResult, incomeResult, efResult, savedResult] = await Promise.all([
    pool.query(`SELECT "vatPayer", "vatIncasare" FROM company WHERE id=1`),
    pool.query(
      `SELECT ii."vatRate" as "vatRate", COUNT(DISTINCT i.id)::int as "documentCount",
              COALESCE(SUM(ii.valoare * i."exchangeRate"),0) as "taxableBase",
              COALESCE(SUM(ii."vatValue" * i."exchangeRate"),0) as vat
         FROM invoices i JOIN invoice_items ii ON ii."invoiceId"=i.id
        WHERE i."issueDate"::date >= $1::date AND i."issueDate"::date < $2::date AND i.status<>'canceled'
        GROUP BY ii."vatRate" ORDER BY ii."vatRate" DESC`,
      [start, next]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(i."clientSnapshot"->>'name',''),c.name) as "partnerName",
              UPPER(COALESCE(NULLIF(i."clientSnapshot"->>'cif',''),c.cif,'')) as "partnerCif",
              UPPER(COALESCE(NULLIF(i."clientSnapshot"->>'countryCode',''),c."countryCode",'RO')) as "countryCode",
              COUNT(*)::int as "documentCount",
              COALESCE(SUM(i.subtotal*i."exchangeRate"),0) as "taxableBase",
              COALESCE(SUM(i."vatTotal"*i."exchangeRate"),0) as vat,
              COALESCE(SUM(i.total*i."exchangeRate"),0) as gross
         FROM invoices i JOIN clients c ON c.id=i."clientId"
        WHERE i."issueDate"::date >= $1::date AND i."issueDate"::date < $2::date AND i.status<>'canceled'
        GROUP BY 1,2,3 ORDER BY 1`,
      [start, next]
    ),
    pool.query(
      `SELECT id, "partnerName", "partnerCif", UPPER("partnerCountryCode") as "partnerCountryCode",
              "documentType", "documentNumber", "grossAmount", "netAmount", "vatAmount",
              "deductibilityPercent", "fiscalCategory"
         FROM ref_transactions
        WHERE type='EXPENSE' AND date >= $1::date AND date < $2::date ORDER BY date,id`,
      [start, next]
    ),
    pool.query(
      `SELECT COALESCE(SUM("vatAmount"),0) as "collectedVat"
         FROM ref_transactions WHERE type='INCOME' AND date >= $1::date AND date < $2::date`,
      [start, next]
    ),
    pool.query(
      `SELECT COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE latest.status='VALIDATED')::int as validated,
              COUNT(*) FILTER (WHERE latest.status IN ('REJECTED','ERROR'))::int as errors
         FROM invoices i
         LEFT JOIN LATERAL (SELECT status FROM efactura_submissions s WHERE s."invoiceId"=i.id ORDER BY s.id DESC LIMIT 1) latest ON true
        WHERE i."issueDate"::date >= $1::date AND i."issueDate"::date < $2::date
          AND i.status<>'canceled' AND i."autoEfactura"=1`,
      [start, next]
    ),
    pool.query(`SELECT * FROM tax_declaration_periods WHERE year=$1 AND month=$2`, [year, month]),
  ]);

  const vatRows = vatRowsResult.rows.map((row) => ({
    vatRate: Number(row.vatRate), documentCount: Number(row.documentCount), taxableBase: round2(Number(row.taxableBase)), vat: round2(Number(row.vat)),
  }));
  const salesPartners: PartnerRow[] = salesPartnersResult.rows.map((row) => ({
    partnerName: String(row.partnerName || ""), partnerCif: String(row.partnerCif || ""), countryCode: String(row.countryCode || "RO"),
    documentCount: Number(row.documentCount), taxableBase: round2(Number(row.taxableBase)), vat: round2(Number(row.vat)), gross: round2(Number(row.gross)),
  }));
  const expenses = expensesResult.rows.map((row) => ({
    id: Number(row.id), partnerName: String(row.partnerName || ""), partnerCif: String(row.partnerCif || ""),
    countryCode: String(row.partnerCountryCode || "RO"), documentType: String(row.documentType), documentNumber: String(row.documentNumber || ""),
    gross: round2(Number(row.grossAmount)), net: round2(Number(row.netAmount)), vat: round2(Number(row.vatAmount)),
    deductibleVat: row.fiscalCategory === "NON_DEDUCTIBLE_EXPENSE" ? 0 : round2(Number(row.vatAmount) * Number(row.deductibilityPercent) / 100),
  }));
  const domesticSales = salesPartners.filter((row) => row.countryCode === "RO");
  const intraEuSales = salesPartners.filter((row) => row.countryCode !== "RO" && EU_COUNTRIES.has(row.countryCode));
  const domesticPurchases = expenses.filter((row) => row.countryCode === "RO" && row.documentType === "FACTURA");
  const missingPurchasePartners = domesticPurchases.filter((row) => !row.partnerName || !row.partnerCif).length;
  const vatOnCashAccounting = Boolean(Number(companyResult.rows[0]?.vatIncasare || 0));
  const invoicedOutputVat = round2(vatRows.reduce((sum, row) => sum + row.vat, 0));
  const outputVat = vatOnCashAccounting ? round2(Number(incomeResult.rows[0]?.collectedVat || 0)) : invoicedOutputVat;
  const inputVat = round2(expenses.reduce((sum, row) => sum + row.deductibleVat, 0));
  const ef = efResult.rows[0] || { total: 0, validated: 0, errors: 0 };
  const warnings: string[] = [];
  if (!Number(companyResult.rows[0]?.vatPayer || 0)) warnings.push("Firma nu este marcată ca plătitoare de TVA.");
  if (vatOnCashAccounting) warnings.push("D300 folosește TVA din încasările înregistrate în REF, conform configurării TVA la încasare; verifică extrasele și numerarul perioadei.");
  if (missingPurchasePartners) warnings.push(`${missingPurchasePartners} achiziții interne nu au furnizorul sau CUI-ul completat.`);
  if (intraEuSales.length) warnings.push("Operațiunile intracomunitare trebuie clasificate de contabil ca livrări, servicii sau operațiuni triunghiulare înainte de D390.");
  if (Number(ef.total) > Number(ef.validated)) warnings.push(`${Number(ef.total) - Number(ef.validated)} facturi ale perioadei nu sunt încă validate în RO e-Factura.`);

  const saved = savedResult.rows[0];
  return {
    period: { year, month, start, endExclusive: next },
    workflow: {
      status: (saved?.status || "DRAFT") as DeclarationStatus,
      notes: String(saved?.notes || ""), receiptNumber: String(saved?.receiptNumber || ""), updatedAt: saved?.updatedAt || null,
    },
    basis: { vatPayer: Boolean(Number(companyResult.rows[0]?.vatPayer || 0)), vatOnCashAccounting },
    d300: {
      dueDate: indicativeDueDate(year, month, 25), outputVat, invoicedOutputVat, inputVat,
      vatPayable: Math.max(0, round2(outputVat - inputVat)), vatRefundable: Math.max(0, round2(inputVat - outputVat)), vatRows,
      ready: Boolean(Number(companyResult.rows[0]?.vatPayer || 0)),
    },
    d394: {
      dueDate: indicativeDueDate(year, month, 30), sales: domesticSales, purchases: domesticPurchases,
      ready: missingPurchasePartners === 0,
    },
    d390: { dueDate: indicativeDueDate(year, month, 25), sales: intraEuSales, ready: intraEuSales.length === 0 },
    eFactura: { total: Number(ef.total), validated: Number(ef.validated), errors: Number(ef.errors) },
    warnings,
  };
}

export async function updateDeclarationPeriod(year: number, month: number, input: { status: DeclarationStatus; notes?: string; receiptNumber?: string }) {
  periodBounds(year, month);
  if (!["DRAFT", "REVIEW", "APPROVED", "FILED"].includes(input.status)) throw new Error("Status fiscal invalid.");
  if (input.status === "FILED" && !input.receiptNumber?.trim()) throw new Error("Numărul recipisei este obligatoriu pentru marcarea perioadei ca depusă.");
  const snapshot = input.status === "APPROVED" || input.status === "FILED" ? await getDeclarationPeriod(year, month) : {};
  const pool = await ready();
  await pool.query(
    `INSERT INTO tax_declaration_periods (year,month,status,notes,"receiptNumber","snapshot","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,now())
     ON CONFLICT (year,month) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes,
       "receiptNumber"=EXCLUDED."receiptNumber","snapshot"=EXCLUDED."snapshot","updatedAt"=now()`,
    [year, month, input.status, input.notes?.trim() || "", input.receiptNumber?.trim() || "", JSON.stringify(snapshot)]
  );
  return getDeclarationPeriod(year, month);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function exportDeclarationWorkingPaper(type: DeclarationType, year: number, month: number) {
  const report = await getDeclarationPeriod(year, month);
  let rows: unknown[][];
  if (type === "D300") {
    rows = [["Cota TVA", "Bază impozabilă RON", "TVA colectată RON", "Documente"], ...report.d300.vatRows.map((row) => [row.vatRate, row.taxableBase, row.vat, row.documentCount]), [], ["TVA deductibilă", report.d300.inputVat], ["TVA de plată", report.d300.vatPayable], ["TVA de recuperat", report.d300.vatRefundable]];
  } else if (type === "D394") {
    rows = [["Tip", "Partener", "CUI", "Țară", "Documente", "Bază RON", "TVA RON", "Total RON"],
      ...report.d394.sales.map((row) => ["LIVRARE", row.partnerName, row.partnerCif, row.countryCode, row.documentCount, row.taxableBase, row.vat, row.gross]),
      ...report.d394.purchases.map((row) => ["ACHIZIȚIE", row.partnerName, row.partnerCif, row.countryCode, 1, row.net, row.vat, row.gross])];
  } else {
    rows = [["Partener", "Cod TVA", "Țară", "Documente", "Bază RON"], ...report.d390.sales.map((row) => [row.partnerName, row.partnerCif, row.countryCode, row.documentCount, row.taxableBase])];
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export type DeclarationReport = Awaited<ReturnType<typeof getDeclarationPeriod>>;
