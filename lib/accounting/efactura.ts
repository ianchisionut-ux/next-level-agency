import { encrypt, decrypt } from "@/lib/crypto";
import { ready } from "@/lib/accounting/db";
import type { PoolClient } from "pg";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { strFromU8, unzipSync } from "fflate";
import { XMLValidator } from "fast-xml-parser";
import { bucharestDate } from "@/lib/accounting/date";
import { financialValidationErrors, roundMoney } from "@/lib/accounting/money";
import {
  getInvoiceFull,
  type Company,
  type Client,
  type Invoice,
  type InvoiceItem,
} from "@/lib/accounting/repo";

const AUTH_BASE = "https://logincert.anaf.ro/anaf-oauth2/v1";
// ANAF exposes two transports: webserviceapl.anaf.ro requires a client certificate
// on every request, while api.anaf.ro accepts the OAuth bearer token used here.
const API_BASES = {
  test: "https://api.anaf.ro/test/FCTEL/rest",
  production: "https://api.anaf.ro/prod/FCTEL/rest",
} as const;
export type AnafEnvironment = keyof typeof API_BASES;
export type EFacturaStatus =
  "DRAFT" | "UPLOADING" | "PROCESSING" | "VALIDATED" | "REJECTED" | "ERROR" | "UNCERTAIN";

function config() {
  const environment: AnafEnvironment =
    process.env.ANAF_ENVIRONMENT === "production" ? "production" : "test";
  return {
    clientId: process.env.ANAF_CLIENT_ID || "",
    clientSecret: process.env.ANAF_CLIENT_SECRET || "",
    redirectUri:
      process.env.ANAF_REDIRECT_URI ||
      "https://www.nextlevel-agency.ro/api/accounting/efactura/callback",
    environment,
    apiBase: API_BASES[environment],
  };
}
export function getAnafPublicConfig() {
  const c = config();
  return {
    configured: Boolean(c.clientId && c.clientSecret),
    environment: c.environment,
    redirectUri: c.redirectUri,
  };
}
export function getAnafAuthorizeUrl(state: string) {
  const c = config();
  if (!c.clientId) throw new Error("ANAF_CLIENT_ID nu este configurat.");
  const q = new URLSearchParams({
    response_type: "code",
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    token_content_type: "jwt",
    state,
  });
  return `${AUTH_BASE}/authorize?${q}`;
}

async function saveTokens(data: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}, transaction?: PoolClient) {
  const executor = transaction || await ready();
  const environment = config().environment;
  const expiresAt = new Date(
    Date.now() + Math.max(60, Number(data.expires_in || 3600)) * 1000,
  );
  await executor.query(
    `INSERT INTO anaf_connections (id,"accessToken","refreshToken","expiresAt",scope,environment) VALUES (1,$1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET "accessToken"=$1,"refreshToken"=$2,"expiresAt"=$3,scope=$4,environment=$5,"updatedAt"=now()`,
    [
      encrypt(data.access_token),
      data.refresh_token ? encrypt(data.refresh_token) : "",
      expiresAt,
      data.scope || "",
      environment,
    ],
  );
}
async function requestAnafToken(body: URLSearchParams) {
  const c = config();
  if (!c.clientId || !c.clientSecret)
    throw new Error("Acreditările OAuth ANAF nu sunt configurate.");
  body.set("token_content_type", "jwt");
  const credentials = Buffer.from(
    `${c.clientId}:${c.clientSecret}`,
    "utf8",
  ).toString("base64");
  return fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
}
export async function exchangeAnafCode(code: string) {
  const c = config();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: c.redirectUri,
  });
  const response = await requestAnafToken(body);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token)
    throw new Error(
      data.error_description || data.error || "ANAF nu a emis tokenul OAuth.",
    );
  await saveTokens(data);
}
async function refreshAccessToken(refreshToken: string, transaction: PoolClient) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await requestAnafToken(body);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token)
    throw new Error(
      data.error_description ||
        data.error ||
        "Sesiunea ANAF a expirat. Reconectează certificatul în SPV.",
    );
  await saveTokens({
    ...data,
    refresh_token: data.refresh_token || refreshToken,
  }, transaction);
  return data.access_token as string;
}
export async function getAnafConnectionStatus() {
  const pool = await ready();
  const environment = config().environment;
  const automationId = environment === "production" ? 2 : 1;
  const [connectionResult, automationResult, backlog] = await Promise.all([
    pool.query(
      `SELECT "expiresAt","connectedAt","updatedAt",scope,environment,(COALESCE("refreshToken",'')<>'') AS "refreshAvailable" FROM anaf_connections WHERE id=1 AND environment=$1`,
      [environment],
    ),
    pool.query(
      `SELECT status,checked,sent,failed,message,"lastRunAt","lastSuccessAt",pending,blocked,overdue,"oldestIssueDate","earliestDueDate" FROM efactura_automation_state WHERE id=$1`,
      [automationId],
    ),
    getAnafBacklog(),
  ]);
  const connection = connectionResult.rows[0];
  const connected = Boolean(connection && new Date(connection.expiresAt).getTime() > Date.now() + 60_000);
  const refreshAvailable = Boolean(connection?.refreshAvailable);
  return {
    ...getAnafPublicConfig(),
    connected,
    hasConnection: Boolean(connection),
    refreshAvailable,
    canAttempt: connected || refreshAvailable,
    needsReconnect: !connected && !refreshAvailable,
    tokenStatus: connected ? "VALID" : refreshAvailable ? "EXPIRED_REFRESHABLE" : connection ? "RECONNECT_REQUIRED" : "DISCONNECTED",
    connection: connection || null,
    automation: automationResult.rows[0] || null,
    backlog,
  };
}

function orthodoxEaster(year: number) {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = (d + e + 114) % 31 + 1;
  const gregorianOffset = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  return new Date(Date.UTC(year, month - 1, day + gregorianOffset));
}
function romanianHolidays(year: number) {
  const dates = new Set(["01-01", "01-02", "01-06", "01-07", "01-24", "05-01", "06-01", "08-15", "11-30", "12-01", "12-25", "12-26"].map(day => `${year}-${day}`));
  const easter = orthodoxEaster(year);
  for (const offset of [-2, 0, 1, 49, 50]) {
    dates.add(new Date(easter.getTime() + offset * 86_400_000).toISOString().slice(0, 10));
  }
  return dates;
}

// OUG 120/2021 as amended for 2026: five working days after issue.
// This estimates from the issue date, not the separate legal issue deadline
// (which depends on the underlying supply/payment and is not stored here).
export function anafTransmissionDeadline(issueDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) throw new Error("Data emiterii nu este validă pentru calculul termenului ANAF.");
  const date = new Date(`${issueDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== issueDate) throw new Error("Data emiterii nu este validă pentru calculul termenului ANAF.");
  let workingDays = 0;
  while (workingDays < 5) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !romanianHolidays(date.getUTCFullYear()).has(date.toISOString().slice(0, 10))) workingDays++;
  }
  return date.toISOString().slice(0, 10);
}

export async function getAnafBacklog() {
  const pool = await ready();
  const environment = config().environment;
  const { rows } = await pool.query(
    `SELECT i.id,i.series,i.number,i."issueDate",i."anafSendAfter",ef.status,ef.retryable,
            ef."archiveDownloadedAt",ef."downloadId"
       FROM invoices i
       LEFT JOIN LATERAL (
         SELECT status,retryable,"downloadId","archiveDownloadedAt" FROM efactura_submissions
          WHERE "invoiceId"=i.id AND environment=$1 ORDER BY id DESC LIMIT 1
       ) ef ON true
      WHERE ((i."autoEfactura"=1 AND i."anafApprovedEnvironment"=$1) OR ef.status IS NOT NULL)
        AND i.status IN ('issued','partial','paid','storno','stornoed')
        AND (ef.status IS DISTINCT FROM 'VALIDATED' OR ef."archiveDownloadedAt" IS NULL)
      ORDER BY i."issueDate",i.id`, [environment],
  );
  const today = bucharestDate();
  const unresolved = rows.filter(row => row.status !== "VALIDATED");
  const issues = unresolved.map(row => {
    let deadline: string | null = null;
    try { deadline = anafTransmissionDeadline(String(row.issueDate)); } catch {}
    return {
      invoiceId: Number(row.id), reference: `${row.series} ${row.number}`, issueDate: String(row.issueDate),
      deadline, status: String(row.status || "PENDING"),
      blocked: ["UNCERTAIN", "REJECTED"].includes(row.status) || (row.status === "ERROR" && !Number(row.retryable)),
      overdue: deadline ? deadline < today : true,
    };
  });
  const dates = issues.map(issue => issue.deadline).filter((date): date is string => Boolean(date)).sort();
  return {
    pending: issues.length,
    blocked: issues.filter(issue => issue.blocked).length,
    overdue: issues.filter(issue => issue.overdue).length,
    dueToday: issues.filter(issue => issue.deadline === today).length,
    archivePending: rows.filter(row => ["VALIDATED", "REJECTED"].includes(row.status) && !row.archiveDownloadedAt).length,
    oldestIssueDate: issues[0]?.issueDate || null,
    earliestDueDate: dates[0] || null,
    issues: issues.slice(0, 25),
  };
}
export async function disconnectAnaf() {
  await (await ready()).query(`DELETE FROM anaf_connections WHERE id=1`);
}
async function accessToken(transaction?: PoolClient) {
  const pool = await ready();
  const connection = transaction || await pool.connect();
  const ownsTransaction = !transaction;
  const environment = config().environment;
  try {
    if (ownsTransaction) await connection.query("BEGIN");
    // Every caller uses this lock before reading/rotating credentials. An expired
    // refresh token can never be rotated by two simultaneous requests.
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [73002, 1]);
    const { rows } = await connection.query(
      `SELECT * FROM anaf_connections WHERE id=1 AND environment=$1`, [environment],
    );
    if (!rows[0]) throw new Error("Conectează mai întâi contul ANAF/SPV.");
    const token = new Date(rows[0].expiresAt).getTime() > Date.now() + 60_000
      ? decrypt(rows[0].accessToken)
      : rows[0].refreshToken
        ? await refreshAccessToken(decrypt(rows[0].refreshToken), connection)
        : null;
    if (!token) throw new Error("Sesiunea ANAF a expirat. Reconectează contul.");
    if (ownsTransaction) await connection.query("COMMIT");
    return token;
  } catch (error) {
    if (ownsTransaction) await connection.query("ROLLBACK");
    throw error;
  } finally { if (ownsTransaction) connection.release(); }
}
async function anafFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${config().apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: init.signal || AbortSignal.timeout(25_000),
  });
  if (response.status === 401)
    throw new Error("Autorizarea ANAF a expirat. Reconectează SPV.");
  return response;
}

function x(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function money(n: number) {
  if (!Number.isFinite(Number(n))) throw new Error("Valoare monetară nefinita în XML.");
  return roundMoney(Number(n)).toFixed(2);
}
function country(companyOrClient: { countryCode?: string }) {
  return String(companyOrClient.countryCode || "RO").trim().toUpperCase();
}
function cleanFiscalId(value: string) {
  return String(value || "").replace(/^RO/i, "").replace(/\s/g, "");
}
const ROMANIA_COUNTIES: Record<string, string> = {
  alba: "AB", arad: "AR", arges: "AG", bacau: "BC", bihor: "BH",
  "bistrita-nasaud": "BN", bistrita: "BN", botosani: "BT", brasov: "BV",
  braila: "BR", bucuresti: "B", buzau: "BZ", "caras-severin": "CS",
  calarasi: "CL", cluj: "CJ", constanta: "CT", covasna: "CV",
  dambovita: "DB", dolj: "DJ", galati: "GL", giurgiu: "GR", gorj: "GJ",
  harghita: "HR", hunedoara: "HD", ialomita: "IL", iasi: "IS", ilfov: "IF",
  maramures: "MM", mehedinti: "MH", mures: "MS", neamt: "NT", olt: "OT",
  prahova: "PH", "satu-mare": "SM", salaj: "SJ", sibiu: "SB", suceava: "SV",
  teleorman: "TR", timis: "TM", tulcea: "TL", vaslui: "VS", valcea: "VL", vrancea: "VN",
};
function plain(value: string) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function subdivision(value: string, countryCode: string) {
  const raw = String(value || "").trim();
  if (countryCode !== "RO") return raw;
  const withoutPrefix = raw.toUpperCase().replace(/^RO-/, "");
  if (/^(AB|AR|AG|BC|BH|BN|BT|BV|BR|B|BZ|CS|CL|CJ|CT|CV|DB|DJ|GL|GR|GJ|HR|HD|IL|IS|IF|MM|MH|MS|NT|OT|PH|SM|SJ|SB|SV|TR|TM|TL|VS|VL|VN)$/.test(withoutPrefix))
    return `RO-${withoutPrefix}`;
  const key = plain(raw).replace(/\s+/g, "-");
  return ROMANIA_COUNTIES[key] ? `RO-${ROMANIA_COUNTIES[key]}` : raw;
}
function xmlCity(value: string, subdivisionCode: string) {
  const raw = String(value || "").trim();
  if (subdivisionCode !== "RO-B") return raw;
  const sector = /^sector\s*([1-6])$/i.exec(raw)?.[1];
  return sector ? `SECTOR${sector}` : raw;
}
function optionalElement(name: string, value: unknown) {
  return String(value || "").trim() ? `<cbc:${name}>${x(value)}</cbc:${name}>` : "";
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validateEFactura(full: {
  invoice: Invoice;
  items: InvoiceItem[];
  client?: Client;
  company: Company;
  originalInvoice?: Invoice;
}) {
  const errors: string[] = [...financialValidationErrors(full)];
  const { invoice, items, client, company } = full;
  if ((invoice.currency || "RON") !== "RON") errors.push("Transmiterea automată în valută nu este disponibilă. Factura necesită revizuire contabilă și XML cu TVA în moneda de contabilizare; nu va fi transmisă incomplet.");
  if (!["STANDARD", "STORNO"].includes(invoice.invoiceType)) errors.push("Tip de factură neacceptat.");
  if (!validDate(invoice.issueDate)) errors.push("Data emiterii nu este validă.");
  if (invoice.dueDate && !validDate(invoice.dueDate)) errors.push("Data scadenței nu este validă.");
  if (invoice.taxPointDate && !validDate(invoice.taxPointDate)) errors.push("Data exigibilității TVA nu este validă.");
  if (invoice.dueDate && invoice.dueDate < invoice.issueDate) errors.push("Scadența nu poate preceda emiterea.");
  if (!company.name) errors.push("Completează denumirea firmei emitente.");
  if (!company.cif) errors.push("Completează CIF-ul firmei emitente.");
  if (country(company) !== "RO" || !/^\d{2,10}$/.test(cleanFiscalId(company.cif))) errors.push("Emitentul trebuie să aibă sediul în România și un CIF numeric valid.");
  if (!company.address || !company.city || !company.county)
    errors.push("Completează adresa, localitatea și județul emitentului.");
  const companySubdivision = subdivision(company.county, country(company));
  if (country(company) === "RO" && !/^RO-(AB|AR|AG|BC|BH|BN|BT|BV|BR|B|BZ|CS|CL|CJ|CT|CV|DB|DJ|GL|GR|GJ|HR|HD|IL|IS|IF|MM|MH|MS|NT|OT|PH|SM|SJ|SB|SV|TR|TM|TL|VS|VL|VN)$/.test(companySubdivision))
    errors.push("Județul emitentului nu poate fi transformat într-un cod ISO valid (ex.: Sălaj / SJ).");
  if (companySubdivision === "RO-B" && !/^SECTOR[1-6]$/.test(xmlCity(company.city, companySubdivision)))
    errors.push("Pentru București, localitatea emitentului trebuie să fie Sector 1–6.");
  if (!client) errors.push("Clientul facturii nu există.");
  else {
    if (!client.name) errors.push("Completează denumirea clientului.");
    if (client.clientType === "PJ" && !client.cif)
      errors.push("Completează CIF-ul clientului.");
    if (!["PJ", "PF"].includes(client.clientType)) errors.push("Tipul clientului trebuie să fie persoană juridică sau fizică.");
    if (client.clientType === "PJ" && country(client) === "RO" && !/^\d{2,10}$/.test(cleanFiscalId(client.cif))) errors.push("CIF-ul clientului din România trebuie să fie numeric.");
    if (client.clientType === "PF" && client.cnp && !/^\d{13}$/.test(client.cnp)) errors.push("Identificatorul persoanei fizice trebuie să conțină 13 cifre sau să rămână necompletat.");
    if (!/^[A-Z]{2}$/.test(country(client))) errors.push("Codul țării clientului nu este valid.");
    if (!client.address || !client.city || !client.judet)
      errors.push("Completează adresa, localitatea și județul clientului.");
    const clientSubdivision = subdivision(client.judet, country(client));
    if (country(client) === "RO" && !/^RO-(AB|AR|AG|BC|BH|BN|BT|BV|BR|B|BZ|CS|CL|CJ|CT|CV|DB|DJ|GL|GR|GJ|HR|HD|IL|IS|IF|MM|MH|MS|NT|OT|PH|SM|SJ|SB|SV|TR|TM|TL|VS|VL|VN)$/.test(clientSubdivision))
      errors.push("Județul clientului nu poate fi transformat într-un cod ISO valid.");
    if (clientSubdivision === "RO-B" && !/^SECTOR[1-6]$/.test(xmlCity(client.city, clientSubdivision)))
      errors.push("Pentru un client din București, localitatea trebuie să fie Sector 1–6.");
  }
  if (!invoice.series || !invoice.number)
    errors.push("Seria și numărul facturii sunt obligatorii.");
  if (!invoice.issueDate) errors.push("Data emiterii este obligatorie.");
  const credit = invoice.invoiceType === "STORNO" || invoice.invoiceTypeCode === "381";
  const prepaid = credit ? 0 : Number(invoice.paidAmount || 0);
  if (!Number.isFinite(prepaid) || prepaid < 0 || prepaid > Math.abs(Number(invoice.total))) errors.push("Suma achitată este invalidă.");
  if (Math.abs(Number(invoice.total)) - prepaid > 0.005 && !invoice.dueDate && !invoice.paymentTerms?.trim()) errors.push("[BR-CO-25] Completează scadența sau termenii de plată pentru soldul pozitiv.");
  if (items.some(i => i.vatCategoryCode === 'O') && items.some(i => i.vatCategoryCode !== 'O')) errors.push("Categoria O nu poate fi combinată cu alte categorii TVA.");
  const exemptionReasons = new Map<string, string>();
  for (const item of items) {
    const key = `${item.vatCategoryCode}|${Number(item.vatRate)}`;
    const reason = `${String(item.taxExemptionReasonCode || "").trim()}|${String(item.taxExemptionReason || "").trim()}`;
    if (exemptionReasons.has(key) && exemptionReasons.get(key) !== reason) errors.push("Pozițiile din aceeași categorie și cotă TVA trebuie să folosească același motiv de scutire.");
    exemptionReasons.set(key, reason);
  }
  if ((invoice.invoiceType === "STORNO" || invoice.invoiceTypeCode === "381") && !full.originalInvoice)
    errors.push("Factura storno nu are referința completă către factura inițială.");
  if (!items.length)
    errors.push("Factura trebuie să conțină cel puțin o poziție.");
  items.forEach((item, index) => {
    if (!item.description) errors.push(`Poziția ${index + 1}: denumire lipsă.`);
    if (!item.unitCode) errors.push(`Poziția ${index + 1}: cod unitate lipsă.`);
    if (!item.vatCategoryCode)
      errors.push(`Poziția ${index + 1}: categorie TVA lipsă.`);
    if (!["S", "Z", "E", "AE", "K", "G", "O"].includes(item.vatCategoryCode || "")) errors.push(`Poziția ${index + 1}: categorie TVA neacceptată.`);
    if (!Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0)
      errors.push(`Poziția ${index + 1}: cantitatea trebuie să fie pozitivă.`);
    if (!Number.isFinite(Number(item.unitPrice)))
      errors.push(`Poziția ${index + 1}: preț invalid.`);
    if (!Number.isFinite(Number(item.vatRate)) || Number(item.vatRate) < 0)
      errors.push(`Poziția ${index + 1}: cotă TVA invalidă.`);
    if (["E", "AE", "K", "G", "O"].includes(String(item.vatCategoryCode || "")) && !String(item.taxExemptionReasonCode || item.taxExemptionReason || "").trim())
      errors.push(`Poziția ${index + 1}: motivul sau codul scutirii de TVA este obligatoriu.`);
    if (!company.vatPayer && (Number(item.vatRate) !== 0 || item.vatCategoryCode !== "O"))
      errors.push(`Poziția ${index + 1}: firma este setată neplătitoare de TVA; folosește cota 0%, categoria O și motivul legal.`);
  });
  return errors;
}
export function generateEFacturaXml({
  invoice,
  items,
  client,
  company,
  originalInvoice,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  company: Company;
  originalInvoice?: Invoice;
}) {
  const errors = validateEFactura({ invoice, items, client, company, originalInvoice });
  if (errors.length) throw new Error(errors.join("\n"));
  const currency = invoice.currency || "RON";
  const outsideVat = items.some(i => i.vatCategoryCode === 'O');
  const isCreditNote = invoice.invoiceType === "STORNO" || invoice.invoiceTypeCode === "381";
  const taxGroups = new Map<
    string,
    { rate: number; category: string; taxable: number; tax: number; reasonCode: string; reason: string }
  >();
  items.forEach((item) => {
    const reasonCode = String(item.taxExemptionReasonCode || "").trim();
    const reason = String(item.taxExemptionReason || "").trim();
    const key = `${item.vatCategoryCode}|${item.vatRate}`;
    const group = taxGroups.get(key) || {
      rate: Number(item.vatRate),
      category: item.vatCategoryCode || "S",
      taxable: 0,
      tax: 0,
      reasonCode,
      reason,
    };
    group.taxable = roundMoney(group.taxable + Math.abs(Number(item.valoare)));
    group.tax = roundMoney(group.tax + Math.abs(Number(item.vatValue)));
    taxGroups.set(key, group);
  });
  const taxSubtotals = [...taxGroups.values()].map((group) =>
    `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="${x(currency)}">${money(group.taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="${x(currency)}">${money(group.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${x(group.category)}</cbc:ID>${group.category === "O" ? "" : `<cbc:Percent>${money(group.rate)}</cbc:Percent>`}${optionalElement("TaxExemptionReasonCode", group.reasonCode)}${optionalElement("TaxExemptionReason", group.reason)}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`,
  ).join("");
  const lines = items.map((item, index) => {
    const category = item.vatCategoryCode || "S";
    const unitCode = item.unitCode || "H87";
    const quantity = Math.abs(Number(item.qty));
    const lineAmount = Math.abs(Number(item.valoare));
    const lineName = isCreditNote ? "CreditNoteLine" : "InvoiceLine";
    const quantityName = isCreditNote ? "CreditedQuantity" : "InvoicedQuantity";
    // Quote the exact price of the entire invoiced quantity. This avoids
    // rounding a tiny unit price to zero or changing qty*price at high qty.
    return `<cac:${lineName}><cbc:ID>${index + 1}</cbc:ID><cbc:${quantityName} unitCode="${x(unitCode)}">${quantity}</cbc:${quantityName}><cbc:LineExtensionAmount currencyID="${x(currency)}">${money(lineAmount)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${x(item.description)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${x(category)}</cbc:ID>${category === "O" ? "" : `<cbc:Percent>${money(item.vatRate)}</cbc:Percent>`}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="${x(currency)}">${money(lineAmount)}</cbc:PriceAmount><cbc:BaseQuantity unitCode="${x(unitCode)}">${quantity}</cbc:BaseQuantity></cac:Price></cac:${lineName}>`;
  }).join("");
  const supplierCountry = country(company);
  const supplierSubdivision = subdivision(company.county, supplierCountry);
  const customerCountry = country(client);
  const customerSubdivision = subdivision(client.judet, customerCountry);
  const supplierFiscalId = cleanFiscalId(company.cif);
  const customerFiscalId = cleanFiscalId(client.clientType === "PF" ? (client.cnp || "0000000000000") : client.cif);
  const customerVatId = customerCountry === "RO" ? `RO${customerFiscalId}` : String(client.cif || "").trim().replace(/\s/g, "");
  const supplierTax = `<cac:PartyTaxScheme><cbc:CompanyID>${x((company.vatPayer && !outsideVat) ? `RO${supplierFiscalId}` : supplierFiscalId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>${(company.vatPayer && !outsideVat) ? "VAT" : "FC"}</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`;
  const customerTax = client.vatPayer && !outsideVat
    ? `<cac:PartyTaxScheme><cbc:CompanyID>${x(customerVatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
    : "";
  const supplierContact = company.phone || company.email
    ? `<cac:Contact>${optionalElement("Telephone", company.phone)}${optionalElement("ElectronicMail", company.email)}</cac:Contact>`
    : "";
  const customerContact = client.phone || client.email
    ? `<cac:Contact>${optionalElement("Telephone", client.phone)}${optionalElement("ElectronicMail", client.email)}</cac:Contact>`
    : "";
  const supplierParty = `<cac:AccountingSupplierParty><cac:Party><cac:PostalAddress><cbc:StreetName>${x(company.address)}</cbc:StreetName><cbc:CityName>${x(xmlCity(company.city, supplierSubdivision))}</cbc:CityName>${optionalElement("PostalZone", company.postalCode)}<cbc:CountrySubentity>${x(supplierSubdivision)}</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>${x(supplierCountry)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${supplierTax}<cac:PartyLegalEntity><cbc:RegistrationName>${x(company.name)}</cbc:RegistrationName><cbc:CompanyID>${x(supplierFiscalId)}</cbc:CompanyID></cac:PartyLegalEntity>${supplierContact}</cac:Party></cac:AccountingSupplierParty>`;
  const customerLegalId = customerFiscalId ? `<cbc:CompanyID>${x(customerFiscalId)}</cbc:CompanyID>` : "";
  const customerParty = `<cac:AccountingCustomerParty><cac:Party><cac:PostalAddress><cbc:StreetName>${x(client.address)}</cbc:StreetName><cbc:CityName>${x(xmlCity(client.city, customerSubdivision))}</cbc:CityName>${optionalElement("PostalZone", client.postalCode)}<cbc:CountrySubentity>${x(customerSubdivision)}</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>${x(customerCountry)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${customerTax}<cac:PartyLegalEntity><cbc:RegistrationName>${x(client.name)}</cbc:RegistrationName>${customerLegalId}</cac:PartyLegalEntity>${customerContact}</cac:Party></cac:AccountingCustomerParty>`;
  const typeElement = isCreditNote
    ? `<cbc:CreditNoteTypeCode>${x(invoice.invoiceTypeCode || "381")}</cbc:CreditNoteTypeCode>`
    : `<cbc:InvoiceTypeCode>${x(invoice.invoiceTypeCode || "380")}</cbc:InvoiceTypeCode>`;
  const billingReference = isCreditNote && originalInvoice
    ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${x(originalInvoice.series)}-${originalInvoice.number}</cbc:ID><cbc:IssueDate>${x(originalInvoice.issueDate)}</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>`
    : "";
  const paymentMeans = `<cac:PaymentMeans><cbc:PaymentMeansCode>${x(invoice.paymentMeansCode || "30")}</cbc:PaymentMeansCode>${isCreditNote && invoice.dueDate ? `<cbc:PaymentDueDate>${x(invoice.dueDate)}</cbc:PaymentDueDate>` : ""}${company.iban ? `<cac:PayeeFinancialAccount><cbc:ID>${x(company.iban)}</cbc:ID></cac:PayeeFinancialAccount>` : ""}</cac:PaymentMeans>`;
  const root = isCreditNote ? "CreditNote" : "Invoice";
  const namespace = isCreditNote ? "CreditNote-2" : "Invoice-2";
  const subtotal = Math.abs(Number(invoice.subtotal));
  const vatTotal = Math.abs(Number(invoice.vatTotal));
  const total = Math.abs(Number(invoice.total));
  const prepaid = isCreditNote ? 0 : Number(invoice.paidAmount || 0);
  return `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${namespace}" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID><cbc:ID>${x(invoice.series)}-${invoice.number}</cbc:ID><cbc:IssueDate>${x(invoice.issueDate)}</cbc:IssueDate>${!isCreditNote && invoice.dueDate ? `<cbc:DueDate>${x(invoice.dueDate)}</cbc:DueDate>` : ""}${typeElement}${optionalElement("Note", invoice.notes)}<cbc:TaxPointDate>${x(invoice.taxPointDate || invoice.issueDate)}</cbc:TaxPointDate><cbc:DocumentCurrencyCode>${x(currency)}</cbc:DocumentCurrencyCode>${optionalElement("BuyerReference", invoice.buyerReference)}${billingReference}${supplierParty}${customerParty}${paymentMeans}${invoice.paymentTerms ? `<cac:PaymentTerms><cbc:Note>${x(invoice.paymentTerms)}</cbc:Note></cac:PaymentTerms>` : ""}<cac:TaxTotal><cbc:TaxAmount currencyID="${x(currency)}">${money(vatTotal)}</cbc:TaxAmount>${taxSubtotals}</cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${x(currency)}">${money(subtotal)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="${x(currency)}">${money(subtotal)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${x(currency)}">${money(total)}</cbc:TaxInclusiveAmount>${prepaid > 0 ? `<cbc:PrepaidAmount currencyID="${x(currency)}">${money(prepaid)}</cbc:PrepaidAmount>` : ""}<cbc:PayableAmount currencyID="${x(currency)}">${money(total - prepaid)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</${root}>`;
}

function parseId(text: string, names: string[]) {
  for (const name of names) {
    const json = new RegExp(`"${name}"\\s*:\\s*"?([^",}]+)`, "i").exec(
      text,
    )?.[1];
    if (json) return json.trim();
    const attribute = new RegExp(
      `\\b${name}\\s*=\\s*["']([^"']+)["']`,
      "i",
    ).exec(text)?.[1];
    if (attribute) return attribute.trim();
    const xml = new RegExp(`<${name}[^>]*>([^<]+)`, "i").exec(text)?.[1];
    if (xml) return xml.trim();
  }
  return "";
}

class AnafSubmissionError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AnafSubmissionError";
  }
}

class AnafPreflightError extends AnafSubmissionError {}

// This public service only validates XML; it never issues or transmits an
// invoice. A missing/unknown response must never be treated as a valid document.
export async function validateXmlWithAnaf(xml: string, creditNote = false) {
  let response: Response;
  try {
    response = await fetch(`https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/${creditNote ? "FCN" : "FACT1"}`, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: xml, cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AnafPreflightError("Validatorul ANAF nu este disponibil. Factura nu a fost transmisă; validarea va fi reîncercată.", true);
  }
  if (!response.ok) throw new AnafPreflightError(`Validatorul ANAF a răspuns cu HTTP ${response.status}. Factura nu a fost transmisă.`, response.status === 429 || response.status >= 500 || response.status === 408);
  const payload = await response.json().catch(() => null) as { stare?: string; Messages?: Array<{ message?: string }> } | null;
  if (String(payload?.stare || "").toLowerCase() === "ok") return;
  if (String(payload?.stare || "").toLowerCase() === "nok") {
    const messages = payload?.Messages?.map(item => String(item.message || "").trim()).filter(Boolean).join("; ");
    throw new AnafPreflightError(`XML respins de validatorul ANAF. Factura nu a fost transmisă.${messages ? ` ${messages.slice(0, 3000)}` : " Descarcă XML-ul și verifică regulile CIUS-RO."}`, false);
  }
  throw new AnafPreflightError("Validatorul ANAF a returnat un răspuns necunoscut. Factura nu a fost transmisă; validarea va fi reîncercată.", true);
}

function isRetryableError(error: unknown) {
  if (error instanceof AnafSubmissionError) return error.retryable;
  if (error instanceof TypeError) return true; // fetch/network failure
  if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name))
    return true;
  return false;
}

async function recordInvoiceError(invoiceId: number, message: string, retryable = false) {
  const pool = await ready();
  const environment = config().environment;
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [
      73001,
      invoiceId,
    ]);
    const latest = (
      await connection.query(
        `SELECT id,status,message FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2 ORDER BY id DESC LIMIT 1`,
        [invoiceId, environment],
      )
    ).rows[0];
    if (latest && ['UPLOADING','PROCESSING','VALIDATED','UNCERTAIN'].includes(latest.status)) { await connection.query('COMMIT'); return; }
    if (!latest || latest.status !== "ERROR" || latest.message !== message || retryable) {
      const attempt = Number(
        (
          await connection.query(
            `SELECT COALESCE(MAX("attemptNumber"),0)+1 AS attempt FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2`,
            [invoiceId, environment],
          )
        ).rows[0].attempt,
      );
      await connection.query(
        `INSERT INTO efactura_submissions ("invoiceId",status,message,"xmlSnapshot",retryable,"attemptNumber","checkedAt",environment,"nextAttemptAt")
         VALUES ($1,'ERROR',$2,'',$5,$3,now(),$4,CASE WHEN $5=1 THEN now()+interval '15 minutes' ELSE NULL END)`,
        [invoiceId, message, attempt, environment, retryable ? 1 : 0],
      );
    }
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

export async function submitEFactura(
  invoiceId: number,
  xml: string,
  cif: string,
  approveEnvironment = false,
) {
  const pool = await ready();
  const environment = config().environment;
  const connection = await pool.connect();
  let submissionId = 0;
  let uploadAccessToken = '';
  let uploadPath = "upload";
  let uploadStandard = "UBL";
  let foreignBuyer = false;
  try {
    await connection.query("BEGIN");
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [
      73001,
      invoiceId,
    ]);
    const latest = (
      await connection.query(
        `SELECT id,"uploadId",status FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2 ORDER BY id DESC LIMIT 1`,
        [invoiceId, environment],
      )
    ).rows[0];
    if (
      latest &&
      ["UPLOADING", "PROCESSING", "VALIDATED", "UNCERTAIN"].includes(String(latest.status))
    ) {
      await connection.query("COMMIT");
      return {
        submissionId: Number(latest.id),
        uploadId: String(latest.uploadId || ""),
        status: String(latest.status),
        duplicatePrevented: true,
      };
    }
    // Re-read under the same lock used by corrections, so a concurrent edit
    // cannot leave an outdated XML snapshot queued for transmission.
    const current = await getInvoiceFull(invoiceId, connection);
    if (approveEnvironment) await connection.query(`UPDATE invoices SET "anafApprovedEnvironment"=$2 WHERE id=$1`, [invoiceId, environment]);
    const approval = (await connection.query(`SELECT "anafApprovedEnvironment" FROM invoices WHERE id=$1`, [invoiceId])).rows[0];
    if (approval?.anafApprovedEnvironment !== environment) throw new Error("Confirmă explicit trimiterea acestei facturi în mediul ANAF curent.");
    if (!current?.client || !['issued','partial','paid','storno','stornoed'].includes(current.invoice.status)) throw new Error("Factura nu mai este eligibilă pentru transmitere.");
    if (current.invoice.invoiceType === "STORNO") {
      const originalSubmission = (await connection.query(
        `SELECT status FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2 ORDER BY id DESC LIMIT 1`,
        [current.invoice.originalInvoiceId, environment],
      )).rows[0];
      if (originalSubmission?.status !== "VALIDATED") {
        throw new Error("Factura inițială trebuie validată în mediul ANAF curent înainte de transmiterea storno-ului.");
      }
    }
    xml = generateEFacturaXml({ ...current, client: current.client });
    cif = current.company.cif;
    uploadPath = current.client.clientType === "PF" ? "uploadb2c" : "upload";
    uploadStandard = current.invoice.invoiceType === "STORNO" ? "CN" : "UBL";
    foreignBuyer = country(current.client) !== "RO";
    await validateXmlWithAnaf(xml, uploadStandard === "CN");
    // Authentication failures before upload are not ambiguous transmissions.
    uploadAccessToken = await accessToken(connection);
    const attempt = Number(
      (
        await connection.query(
          `SELECT COALESCE(MAX("attemptNumber"),0)+1 AS attempt FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2`,
          [invoiceId, environment],
        )
      ).rows[0].attempt,
    );
    const { rows } = await connection.query(
      `INSERT INTO efactura_submissions ("invoiceId",status,"xmlSnapshot",retryable,"attemptNumber",environment)
       VALUES ($1,'UPLOADING',$2,0,$3,$4) RETURNING id`,
      [invoiceId, xml, attempt, environment],
    );
    submissionId = Number(rows[0].id);
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }

  let definitiveFailure = false;
  try {
    const response = await fetch(
      `${config().apiBase}/${uploadPath}?standard=${uploadStandard}&cif=${encodeURIComponent(cleanFiscalId(cif))}${foreignBuyer ? "&extern=DA" : ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8", Authorization: `Bearer ${uploadAccessToken}` },
        signal: AbortSignal.timeout(25_000),
        body: xml,
      },
    );
    const responseText = await response.text();
    const uploadId = parseId(responseText, [
      "index_incarcare",
      "id_incarcare",
      "uploadId",
    ]);
    if (!response.ok) {
      definitiveFailure = response.status >= 400 && response.status < 500 && response.status !== 408;
      throw new AnafSubmissionError(
        responseText.slice(0, 500) ||
          `ANAF a răspuns cu HTTP ${response.status}.`,
        response.status === 429 || response.status >= 500,
      );
    }
    if (!uploadId)
      throw new AnafSubmissionError(
        responseText.slice(0, 500) ||
          "ANAF nu a returnat identificatorul încărcării.",
        true,
      );
    await pool.query(
      `UPDATE efactura_submissions SET "uploadId"=$1,status='PROCESSING',message=$2,"submittedAt"=now(),retryable=0 WHERE id=$3`,
      [uploadId, responseText.slice(0, 1000), submissionId],
    );
    return {
      submissionId,
      uploadId,
      status: "PROCESSING" as EFacturaStatus,
      duplicatePrevented: false,
    };
  } catch (error) {
    await pool.query(
      `UPDATE efactura_submissions SET status=$4,message=$1,retryable=$2,"checkedAt"=now(),"nextAttemptAt"=CASE WHEN $2=1 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$3`,
      [
        error instanceof Error ? error.message : String(error),
        definitiveFailure && isRetryableError(error) ? 1 : 0,
        submissionId,
        definitiveFailure ? 'ERROR' : 'UNCERTAIN',
      ],
    );
    throw error;
  }
}

export async function sendInvoiceToAnaf(invoiceId: number, approveEnvironment = false) {
  const full = await getInvoiceFull(invoiceId);
  if (!full?.client)
    throw new Error("Factura nu există sau clientul nu este disponibil.");
  let xml: string;
  try {
    xml = generateEFacturaXml({ ...full, client: full.client });
    if (!full.company.cif) throw new Error("CIF emitent lipsă.");
  } catch (error) {
    await recordInvoiceError(
      invoiceId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
  try { return await submitEFactura(invoiceId, xml, full.company.cif, approveEnvironment); }
  catch (error) {
    if (error instanceof AnafPreflightError) await recordInvoiceError(invoiceId, error.message, error.retryable);
    throw error;
  }
}

export async function checkSubmission(id: number) {
  const pool = await ready();
  const environment = config().environment;
  const { rows } = await pool.query(
    `SELECT "uploadId" FROM efactura_submissions WHERE id=$1 AND environment=$2`,
    [id, environment],
  );
  const item = rows[0];
  if (!item?.uploadId) throw new Error("Transmiterea nu are ID ANAF.");
  const response = await anafFetch(
    `/stareMesaj?id_incarcare=${encodeURIComponent(item.uploadId)}`,
  );
  const responseText = await response.text();
  if (!response.ok)
    throw new AnafSubmissionError(
      responseText.slice(0, 500) ||
        `ANAF a răspuns cu HTTP ${response.status}.`,
      response.status === 429 || response.status >= 500,
    );
  const lower = parseId(responseText, ["stare"]).toLowerCase();
  const status: EFacturaStatus =
    lower === "nok" || lower === "xml cu erori nepreluat de sistem"
      ? "REJECTED"
      : lower === "ok"
        ? "VALIDATED"
        : "PROCESSING";
  const downloadId = parseId(responseText, ["id_descarcare", "downloadId"]);
  await pool.query(
    `UPDATE efactura_submissions SET status=$1,message=$2,"downloadId"=$3,"checkedAt"=now(),retryable=0 WHERE id=$4`,
    [status, responseText.slice(0, 2000), downloadId, id],
  );
  let archived = false;
  let archiveError = "";
  if (["VALIDATED", "REJECTED"].includes(status) && downloadId) {
    try { await downloadAnafMessage(downloadId); archived = true; }
    catch (error) { archiveError = error instanceof Error ? error.message : "Arhivarea răspunsului ANAF a eșuat."; }
  }
  return { status, message: responseText, downloadId, archived, archiveError };
}

export async function latestSubmission(invoiceId: number) {
  const environment = config().environment;
  const { rows } = await (
    await ready()
  ).query(
    `SELECT id,"uploadId",status,message,"downloadId","submittedAt","checkedAt",retryable,"attemptNumber",environment,"archiveSha256","archiveDownloadedAt","nextAttemptAt"
       FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2 ORDER BY id DESC LIMIT 1`,
    [invoiceId, environment],
  );
  return rows[0] || null;
}

export async function invoiceDownloadXml(invoiceId: number) {
  const { rows } = await (await ready()).query(`SELECT "xmlSnapshot" FROM efactura_submissions WHERE "invoiceId"=$1 AND environment=$2 AND (COALESCE("uploadId",'')<>'' OR status IN ('UPLOADING','UNCERTAIN')) ORDER BY id DESC LIMIT 1`, [invoiceId, config().environment]);
  if (rows[0]) {
    if (!rows[0].xmlSnapshot) throw new Error('Copia XML transmisă lipsește. Descarcă răspunsul ANAF.');
    return String(rows[0].xmlSnapshot);
  }
  const full = await getInvoiceFull(invoiceId);
  if (!full?.client) throw new Error('Factura nu există.');
  return generateEFacturaXml({ ...full, client: full.client });
}

async function saveAutomationState(
  status: string,
  counts: { checked: number; sent: number; failed: number },
  message = "",
  backlog?: Awaited<ReturnType<typeof getAnafBacklog>>,
) {
  const pool = await ready();
  const stateId = config().environment === "production" ? 2 : 1;
  await pool.query(
    `INSERT INTO efactura_automation_state (id,status,checked,sent,failed,message,"lastRunAt","lastSuccessAt",pending,blocked,overdue,"oldestIssueDate","earliestDueDate")
     VALUES ($6,$1,$2,$3,$4,$5,now(),CASE WHEN $1='SUCCESS' THEN now() ELSE NULL END,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET status=$1,checked=$2,sent=$3,failed=$4,message=$5,
       "lastRunAt"=now(),"lastSuccessAt"=CASE WHEN $1='SUCCESS' THEN now() ELSE efactura_automation_state."lastSuccessAt" END,
        pending=$7,blocked=$8,overdue=$9,"oldestIssueDate"=$10,"earliestDueDate"=$11,"updatedAt"=now()`,
    [status, counts.checked, counts.sent, counts.failed, message, stateId, backlog?.pending || 0, backlog?.blocked || 0, backlog?.overdue || 0, backlog?.oldestIssueDate || null, backlog?.earliestDueDate || null],
  );
}

export async function recordAutomationFailure(error: unknown) {
  await saveAutomationState(
    "ERROR",
    { checked: 0, sent: 0, failed: 1 },
    error instanceof Error ? error.message : String(error),
  );
}

export async function processAutomaticEFactura(limit = 20) {
  const startedAt = Date.now();
  const pool = await ready();
  await saveAutomationState("RUNNING", { checked: 0, sent: 0, failed: 0 });
  const publicConfig = getAnafPublicConfig();
  const environment = publicConfig.environment;
  const connection = (await pool.query(
    `SELECT "expiresAt",(COALESCE("refreshToken",'')<>'') AS "refreshAvailable" FROM anaf_connections WHERE id=1 AND environment=$1`,
    [environment],
  )).rows[0];
  const canAttempt = Boolean(connection && (new Date(connection.expiresAt).getTime() > Date.now() + 60_000 || connection.refreshAvailable));
  if (!publicConfig.configured || !canAttempt) {
    const backlog = await getAnafBacklog();
    const result = {
      skipped: true,
      reason: "Conexiunea ANAF/SPV necesită configurare sau reconectare; tokenul nu poate fi folosit sau reînnoit.",
      checked: 0,
      sent: 0,
      failed: 0,
    };
    await saveAutomationState(backlog.pending ? "BLOCKED" : "SKIPPED", result, result.reason, backlog);
    return { ...result, backlog };
  }

  let checked = 0;
  let sent = 0;
  let failed = 0;
  await pool.query(
    `UPDATE efactura_submissions
        SET status='UNCERTAIN', retryable=0,
            message='Rezultat necunoscut. Verifică în SPV înainte de orice retrimitere; nu se reîncearcă automat.', "checkedAt"=now()
      WHERE status='UPLOADING' AND environment=$1 AND "createdAt" < now() - interval '1 hour'`,
    [environment],
  );

  const processing = await pool.query(
    `SELECT id FROM efactura_submissions WHERE status='PROCESSING' AND environment=$2
      ORDER BY COALESCE("submittedAt","createdAt") ASC LIMIT $1`,
    [Math.max(1, Math.min(limit, 50)), environment],
  );
  for (const row of processing.rows) {
    if (Date.now() - startedAt > 100_000) break;
    try {
      await checkSubmission(Number(row.id));
      checked += 1;
    } catch {
      failed += 1;
    }
  }

  // Persist originals with MF's seal in our durable database. Failed downloads
  // remain visible and retry independently from the already accepted invoice.
  const archives = await pool.query(
    `SELECT "downloadId" FROM efactura_submissions WHERE environment=$2
      AND status IN ('VALIDATED','REJECTED') AND "downloadId"<>'' AND "archiveDownloadedAt" IS NULL
      ORDER BY COALESCE("submittedAt","createdAt") ASC LIMIT $1`,
    [Math.max(1, Math.min(limit, 50)), environment],
  );
  for (const row of archives.rows) {
    if (Date.now() - startedAt > 130_000) break;
    try { await downloadAnafMessage(String(row.downloadId)); } catch { failed++; }
  }

  const candidates = await pool.query(
    `SELECT i.id FROM invoices i
     LEFT JOIN LATERAL (
       SELECT status,retryable,"createdAt","checkedAt","nextAttemptAt" FROM efactura_submissions
        WHERE "invoiceId"=i.id AND environment=$2 ORDER BY id DESC LIMIT 1
     ) ef ON true
     WHERE i."autoEfactura"=1
       AND i."anafApprovedEnvironment"=$2
       AND (i."anafSendAfter" IS NULL OR i."anafSendAfter" <= now())
        AND ((i."invoiceType"='STANDARD' AND i.status IN ('issued','partial','paid','stornoed')) OR (i."invoiceType"='STORNO' AND i.status='storno'
          AND EXISTS (SELECT 1 FROM efactura_submissions original WHERE original."invoiceId"=i."originalInvoiceId" AND original.environment=$2 AND original.status='VALIDATED')))
       AND (ef.status IS NULL OR (ef.status='ERROR' AND ef.retryable=1
             AND (ef."nextAttemptAt" IS NULL OR ef."nextAttemptAt"<=now())))
      ORDER BY CASE WHEN i."invoiceType"='STANDARD' THEN 0 ELSE 1 END,i."issueDate" ASC, i.id ASC LIMIT $1`,
    [Math.max(1, Math.min(limit, 50)), environment],
  );
  for (const row of candidates.rows) {
    if (Date.now() - startedAt > 240_000) break;
    try {
      await sendInvoiceToAnaf(Number(row.id));
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  const backlog = await getAnafBacklog();
  const needsAttention = failed > 0 || backlog.pending > 0 || backlog.archivePending > 0;
  const result = { skipped: false, checked, sent, failed, backlog };
  await saveAutomationState(
    backlog.blocked || backlog.overdue ? "BLOCKED" : needsAttention ? "WARNING" : "SUCCESS",
    result,
    needsAttention ? `${backlog.pending} facturi fără validare ANAF, ${backlog.blocked} blocate, ${backlog.overdue} cu termen estimat de la emitere depășit, ${backlog.archivePending} răspunsuri de arhivat; ${failed} operațiuni eșuate. Estimarea nu include data-limită legală de emitere.` : "",
    backlog,
  );
  return result;
}
export async function syncAnafMessages(cif: string, days = 60) {
  const pool = await ready();
  const environment = config().environment;
  let count = 0;
  const safeDays = Math.min(60, Math.max(1, days));
  for (const [filter, direction] of [
    ["P", "RECEIVED"],
    ["T", "SENT"],
  ] as const) {
    const response = await anafFetch(
      `/listaMesajeFactura?zile=${safeDays}&cif=${encodeURIComponent(cif.replace(/^RO/i, ""))}&filtru=${filter}`,
    );
    const text = await response.text();
    if (!response.ok)
      throw new Error(
        text.slice(0, 500) || `ANAF a răspuns cu HTTP ${response.status}.`,
      );
    const payload = JSON.parse(text) as {
      mesaje?: Array<Record<string, unknown>>;
      eroare?: string;
    };
    if (payload.eroare && !/nu exista mesaje/i.test(payload.eroare))
      throw new Error(payload.eroare);
    for (const item of payload.mesaje || []) {
      const messageId = String(item.id || item.id_solicitare || "");
      if (!messageId) continue;
      await pool.query(
        `INSERT INTO efactura_messages (environment,"messageId",direction,cif,details,"documentDate","downloadId") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (environment,"messageId") DO UPDATE SET details=EXCLUDED.details,"downloadId"=EXCLUDED."downloadId"`,
        [
          environment,
          messageId,
          direction,
          String(item.cif || ""),
          String(item.detalii || item.tip || ""),
          String(item.data_creare || ""),
          String(item.id || messageId),
        ],
      );
      count++;
    }
  }
  return count;
}
export async function listAnafMessages() {
  const environment = config().environment;
  const { rows } = await (
    await ready()
  ).query(
    `SELECT id,environment,"messageId",direction,cif,details,"documentDate","downloadId","createdAt","archiveSha256","archiveDownloadedAt" FROM efactura_messages WHERE environment=$1 ORDER BY "createdAt" DESC LIMIT 500`,
    [environment],
  );
  return rows;
}

const ZIP_CRC_TABLE = Uint32Array.from(Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
}));

function validateAnafArchive(buffer: Buffer) {
  const invalid = (detail: string): never => { throw new Error(`Arhiva ANAF nu este validă: ${detail}`); };
  const maxFileSize = 30 * 1024 * 1024, maxTotalSize = 50 * 1024 * 1024;
  if (buffer.length < 22 || buffer.length > 25 * 1024 * 1024) invalid("dimensiune ZIP neacceptată.");
  if (buffer.readUInt32LE(0) !== 0x04034b50) invalid("antet ZIP absent.");
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50 && offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length) { end = offset; break; }
  }
  if (end < 0) invalid("director ZIP absent sau fișier trunchiat.");
  const count = buffer.readUInt16LE(end + 10), directorySize = buffer.readUInt32LE(end + 12), directoryStart = buffer.readUInt32LE(end + 16);
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) || buffer.readUInt16LE(end + 8) !== count || count < 2 || count > 100 || directoryStart + directorySize !== end) invalid("director ZIP inconsistent sau peste 100 de intrări.");
  const metadata = new Map<string, { size: number; originalSize: number; compression: number; crc: number; dataStart: number }>();
  const names = new Set<string>();
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = directoryStart, totalSize = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) invalid("intrare de director coruptă.");
    const flags = buffer.readUInt16LE(cursor + 8), compression = buffer.readUInt16LE(cursor + 10), crc = buffer.readUInt32LE(cursor + 16);
    const size = buffer.readUInt32LE(cursor + 20), originalSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42), unixType = (buffer.readUInt32LE(cursor + 38) >>> 16) & 0xf000;
    if (cursor + 46 + nameLength + extraLength + commentLength > end || !nameLength || flags & 1 || ![0, 8].includes(compression) || buffer.readUInt16LE(cursor + 34) || unixType === 0xa000 || size === 0xffffffff || originalSize === 0xffffffff || localOffset === 0xffffffff) invalid("intrare criptată, ZIP64 sau format neacceptat.");
    const name = strFromU8(buffer.subarray(cursor + 46, cursor + 46 + nameLength));
    const parts = name.replace(/\\/g, "/").split("/");
    if (name.length > 500 || /[\u0000-\u001f:]/.test(name) || name.startsWith("/") || name.startsWith("\\") || parts.some((part, partIndex) => [".", "..", "__proto__", "constructor", "prototype"].includes(part) || (!part && partIndex < parts.length - 1)) || names.has(name.toLowerCase())) invalid("cale nesigură sau nume duplicat în ZIP.");
    names.add(name.toLowerCase());
    totalSize += originalSize;
    if (originalSize > maxFileSize || totalSize > maxTotalSize || (compression === 0 && size !== originalSize)) invalid("limita decomprimată este de 30 MB/fișier și 50 MB/arhivă.");
    if (localOffset + 30 > directoryStart || buffer.readUInt32LE(localOffset) !== 0x04034b50 || buffer.readUInt16LE(localOffset + 6) !== flags || buffer.readUInt16LE(localOffset + 8) !== compression || buffer.readUInt16LE(localOffset + 26) !== nameLength) invalid("antet local ZIP inconsistent.");
    const dataStart = localOffset + 30 + nameLength + buffer.readUInt16LE(localOffset + 28);
    if (dataStart > directoryStart || dataStart + size > directoryStart || !buffer.subarray(localOffset + 30, localOffset + 30 + nameLength).equals(buffer.subarray(cursor + 46, cursor + 46 + nameLength))) invalid("conținut ZIP trunchiat sau nume local inconsistent.");
    let dataEnd = dataStart + size;
    if (flags & 8) {
      if (dataEnd + 12 > directoryStart) invalid("descriptor ZIP trunchiat.");
      const descriptor = buffer.readUInt32LE(dataEnd) === 0x08074b50 ? dataEnd + 4 : dataEnd;
      if (descriptor + 12 > directoryStart || buffer.readUInt32LE(descriptor) !== crc || buffer.readUInt32LE(descriptor + 4) !== size || buffer.readUInt32LE(descriptor + 8) !== originalSize) invalid("descriptor ZIP inconsistent.");
      dataEnd = descriptor + 12;
    } else if (buffer.readUInt32LE(localOffset + 14) !== crc || buffer.readUInt32LE(localOffset + 18) !== size || buffer.readUInt32LE(localOffset + 22) !== originalSize) invalid("dimensiuni sau checksum ZIP inconsistente.");
    ranges.push({ start: localOffset, end: dataEnd });
    metadata.set(name, { size, originalSize, compression, crc, dataStart });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end) invalid("lungimea directorului ZIP este inconsistentă.");
  ranges.sort((left, right) => left.start - right.start);
  if (ranges.some((range, index) => index > 0 && range.start < ranges[index - 1].end)) invalid("intrări ZIP suprapuse.");
  const files: Record<string, Uint8Array> = {};
  try {
    // Check fflate's interpretation without allocating advertised output. The
    // bounded inflater below also stops dishonest originalSize/deflate bombs.
    unzipSync(buffer, { filter(file) {
      const expected = metadata.get(file.name);
      if (!expected || expected.originalSize !== file.originalSize || expected.size !== file.size || expected.compression !== file.compression || file.originalSize > maxFileSize) invalid("metadate de decomprimare inconsistente.");
      return false;
    } });
    for (const [name, file] of metadata) {
      const compressed = buffer.subarray(file.dataStart, file.dataStart + file.size);
      files[name] = file.compression === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: file.originalSize + 1 });
    }
  } catch { invalid("conținutul nu poate fi decomprimat în siguranță."); }
  let responseXml = false, signatureXml = false;
  for (const [name, contents] of Object.entries(files)) {
    const expected = metadata.get(name)!;
    let crc = 0xffffffff;
    for (const byte of contents) crc = ZIP_CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
    if (contents.length !== expected.originalSize || ((crc ^ 0xffffffff) >>> 0) !== expected.crc) invalid("conținut sau checksum CRC32 corupt.");
    if (!name.toLowerCase().endsWith(".xml")) continue;
    const xml = strFromU8(contents);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) invalid("fișier XML malformat sau cu declarații de entități.");
    // Presence and structure only. This does not verify the certificate or the
    // cryptographic validity of the Ministry of Finance's XML signature.
    const signature = /<(?:[\w.-]+:)?Signature\b/.test(xml) && xml.includes("http://www.w3.org/2000/09/xmldsig#") && /<(?:[\w.-]+:)?SignedInfo\b/.test(xml) && /<(?:[\w.-]+:)?SignatureValue\b/.test(xml);
    if (signature) signatureXml = true;
    else if (!/semnatura|signature/i.test(name)) responseXml = true;
  }
  if (!responseXml || !signatureXml) invalid("lipsește XML-ul original/răspuns sau XML-ul semnăturii MF.");
}

export async function downloadAnafMessage(downloadId: string) {
  if (!/^\d{1,30}$/.test(downloadId)) throw new Error("Identificatorul descărcării ANAF nu este valid.");
  const pool = await ready();
  const environment = config().environment;
  const cached = await pool.query(
    `SELECT "archiveZip","archiveSha256" FROM efactura_submissions WHERE environment=$1 AND "downloadId"=$2 AND "archiveZip" IS NOT NULL
     UNION ALL SELECT "archiveZip","archiveSha256" FROM efactura_messages WHERE environment=$1 AND "downloadId"=$2 AND "archiveZip" IS NOT NULL LIMIT 1`,
    [environment, downloadId],
  );
  if (cached.rows[0]) {
    const buffer = Buffer.from(cached.rows[0].archiveZip);
    if (createHash("sha256").update(buffer).digest("hex") !== cached.rows[0].archiveSha256) throw new Error("Arhiva ANAF nu trece verificarea de integritate. Restaurează copia de siguranță.");
    validateAnafArchive(buffer);
    return { buffer, contentType: "application/zip", archived: true };
  }
  const response = await anafFetch(
    `/descarcare?id=${encodeURIComponent(downloadId)}`,
  );
  if (!response.ok) throw new Error(await response.text());
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 25 * 1024 * 1024) throw new Error("Arhiva ANAF depășește limita de 25 MB; descarc-o și arhiveaz-o manual.");
  const buffer = Buffer.from(await response.arrayBuffer());
  validateAnafArchive(buffer);
  const hash = createHash("sha256").update(buffer).digest("hex");
  await pool.query(`UPDATE efactura_submissions SET "archiveZip"=$1,"archiveSha256"=$2,"archiveDownloadedAt"=now() WHERE environment=$3 AND "downloadId"=$4 AND "archiveZip" IS NULL`, [buffer, hash, environment, downloadId]);
  await pool.query(`UPDATE efactura_messages SET "archiveZip"=$1,"archiveSha256"=$2,"archiveDownloadedAt"=now() WHERE environment=$3 AND "downloadId"=$4 AND "archiveZip" IS NULL`, [buffer, hash, environment, downloadId]);
  return {
    buffer,
    contentType: "application/zip",
    archived: true,
  };
}
