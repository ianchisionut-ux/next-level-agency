import { ready } from "./db";
import { createRefIncomeForPayment } from "./ref";
import type { PoolClient } from "pg";
import { bucharestDate } from "./date";
import { createHash } from "node:crypto";
import { addMoney, assertInvoiceArithmetic, calculateInvoiceTotals, convertMoney, roundMoney, subtractMoney } from "./money";

export type User = {
  id: number;
  name: string;
  ci: string;
  cnp: string;
  role: string;
  active: number;
  createdAt: string;
};

export type Company = {
  id: number;
  name: string;
  regCom: string;
  cif: string;
  address: string;
  iban: string;
  iban2: string;
  iban3: string;
  bank: string;
  phone: string;
  email: string;
  vatIncasare: number;
  vatPayer: number;
  countryCode: string;
  county: string;
  city: string;
  postalCode: string;
};

export type Client = {
  id: number;
  name: string;
  clientType: "PF" | "PJ";
  regCom: string;
  cif: string;
  cnp: string;
  address: string;
  judet: string;
  city: string;
  phone: string;
  email: string;
  vatPayer: number;
  countryCode: string;
  postalCode: string;
  ciSeries: string;
  ciNumber: string;
  sourceConnectionId: string | null;
  sourceNib: string;
  flagged: number;
  createdAt: string;
};

export type ClientInput = Omit<
  Client,
  "id" | "createdAt" | "flagged" | "sourceConnectionId" | "sourceNib"
> & {
  sourceConnectionId?: string | null;
  sourceNib?: string;
};

export type Product = {
  id: number;
  name: string;
  um: string;
  price: number;
  cost: number;
  vatRate: number;
  unitCode: string;
  vatCategoryCode: string;
  taxExemptionReasonCode: string;
  taxExemptionReason: string;
};

export type InvoiceItemInput = {
  productId?: number | null;
  description: string;
  um: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
  unitCode?: string;
  vatCategoryCode?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
};

export type InvoiceItem = InvoiceItemInput & {
  id: number;
  invoiceId: number;
  productId: number | null;
  valoare: number;
  vatValue: number;
};

export type Invoice = {
  id: number;
  series: string;
  number: number;
  clientId: number;
  userId: number | null;
  issueDate: string;
  dueDate: string | null;
  status: "issued" | "paid" | "partial" | "canceled" | "storno" | "stornoed";
  invoiceType: "STANDARD" | "STORNO";
  originalInvoiceId: number | null;
  stornoReason: string;
  invoiceTypeCode: string;
  paymentMeansCode: string;
  paymentTerms: string;
  taxPointDate: string;
  buyerReference: string;
  sellerSnapshot: Company | Record<string, never>;
  clientSnapshot: Client | Record<string, never>;
  paidAmount: number;
  subtotal: number;
  vatTotal: number;
  total: number;
  discountPercent: number;
  currency: string;
  exchangeRate: number;
  notes: string;
  delegateName: string;
  delegateCI: string;
  delegateCNP: string;
  vehiclePlate: string;
  deliveryDate: string;
  deliveryTime: string;
  autoEfactura: number;
  integrationSource: string | null;
  externalId: string | null;
  issuanceKey?: string | null;
  issuanceHash?: string | null;
  createdAt: string;
};

function round2(n: number) {
  return roundMoney(n);
}

async function recordInvoiceEvent(connection: PoolClient, eventType: string, invoiceId: number, details: Record<string, unknown>) {
  await connection.query(
    `INSERT INTO accounting_audit_events ("eventType", "invoiceId", details) VALUES ($1,$2,$3::jsonb)`,
    [eventType, invoiceId, JSON.stringify(details)],
  );
}

function financialOperationKey(value?: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || !/^[A-Za-z0-9:_-]{16,160}$/.test(value)) throw new Error("Identificatorul unic al operațiunii este invalid.");
  return value;
}

async function replayFinancialOperation(connection: PoolClient, table: "payments" | "receipts", invoiceId: number, key: string | null, hash: string): Promise<number | undefined> {
  if (!key) return undefined;
  await connection.query(`SELECT pg_advisory_xact_lock($1,hashtext($2))`, [73003, `${table}:${key}`]);
  const existing = (await connection.query(`SELECT id,"invoiceId","operationHash" FROM ${table} WHERE "operationKey"=$1`, [key])).rows[0];
  if (!existing) return undefined;
  if (Number(existing.invoiceId) !== invoiceId || existing.operationHash !== hash) throw new Error("Identificatorul operațiunii a fost deja folosit pentru alte date. Verifică operațiunea existentă.");
  return Number(existing.id);
}

function isIsoDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// ---------- Company ----------
export async function getCompany(): Promise<Company> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM company WHERE id = 1`);
  return rows[0] as Company;
}

export async function updateCompany(data: Omit<Company, "id">) {
  const pool = await ready();
  await pool.query(
    `UPDATE company SET name=$1, "regCom"=$2, cif=$3, address=$4, iban=$5, "iban2"=$6, "iban3"=$7, bank=$8, phone=$9, email=$10, "vatIncasare"=$11,
     "vatPayer"=$12, "countryCode"=$13, county=$14, city=$15, "postalCode"=$16 WHERE id=1`,
    [
      data.name,
      data.regCom,
      data.cif,
      data.address,
      data.iban,
      data.iban2,
      data.iban3,
      data.bank,
      data.phone,
      data.email,
      data.vatIncasare,
      data.vatPayer ? 1 : 0,
      data.countryCode || "RO",
      data.county ?? "",
      data.city ?? "",
      data.postalCode ?? "",
    ],
  );
}

// ---------- Users ----------
export async function listUsers(includeInactive = false): Promise<User[]> {
  const pool = await ready();
  const { rows } = await pool.query(
    includeInactive
      ? `SELECT * FROM users ORDER BY active DESC, name`
      : `SELECT * FROM users WHERE active=1 ORDER BY name`,
  );
  return rows as User[];
}

export async function getUser(id: number): Promise<User | undefined> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1`, [id]);
  return rows[0] as User | undefined;
}

export async function createUser(data: {
  name: string;
  ci: string;
  cnp: string;
  role: string;
}): Promise<number> {
  const pool = await ready();
  const { rows } = await pool.query(
    `INSERT INTO users (name, ci, cnp, role, active) VALUES ($1,$2,$3,$4,1) RETURNING id`,
    [data.name, data.ci, data.cnp, data.role],
  );
  return rows[0].id as number;
}

export async function updateUser(
  id: number,
  data: { name: string; ci: string; cnp: string; role: string; active: number },
) {
  const pool = await ready();
  await pool.query(
    `UPDATE users SET name=$1, ci=$2, cnp=$3, role=$4, active=$5 WHERE id=$6`,
    [data.name, data.ci, data.cnp, data.role, data.active, id],
  );
}

export async function deleteUser(id: number) {
  const pool = await ready();
  await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
}

// ---------- Clients ----------
export async function listClients(): Promise<Client[]> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM clients ORDER BY name`);
  return rows as Client[];
}

export async function getClient(id: number): Promise<Client | undefined> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM clients WHERE id=$1`, [id]);
  return rows[0] as Client | undefined;
}

export async function createClient(data: ClientInput): Promise<number> {
  const pool = await ready();
  const { rows } = await pool.query(
    `INSERT INTO clients (name, "clientType", "regCom", cif, cnp, address, judet, city, phone, email, "ciSeries", "ciNumber", "vatPayer", "countryCode", "postalCode", "sourceConnectionId", "sourceNib")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
    [
      data.name,
      data.clientType || "PJ",
      data.regCom ?? "",
      data.cif ?? "",
      data.cnp ?? "",
      data.address ?? "",
      data.judet ?? "",
      data.city ?? "",
      data.phone ?? "",
      data.email ?? "",
      data.ciSeries ?? "",
      data.ciNumber ?? "",
      data.vatPayer ? 1 : 0,
      data.countryCode || "RO",
      data.postalCode ?? "",
      data.sourceConnectionId ?? null,
      data.sourceNib ?? "",
    ],
  );
  return rows[0].id as number;
}

export async function updateClient(id: number, data: ClientInput) {
  const pool = await ready();
  await pool.query(
    `UPDATE clients SET name=$1, "clientType"=$2, "regCom"=$3, cif=$4, cnp=$5, address=$6, judet=$7, city=$8, phone=$9, email=$10, "ciSeries"=$11, "ciNumber"=$12,
     "vatPayer"=$13, "countryCode"=$14, "postalCode"=$15 WHERE id=$16`,
    [
      data.name,
      data.clientType || "PJ",
      data.regCom ?? "",
      data.cif ?? "",
      data.cnp ?? "",
      data.address ?? "",
      data.judet ?? "",
      data.city ?? "",
      data.phone ?? "",
      data.email ?? "",
      data.ciSeries ?? "",
      data.ciNumber ?? "",
      data.vatPayer ? 1 : 0,
      data.countryCode || "RO",
      data.postalCode ?? "",
      id,
    ],
  );
}

export async function upsertIntegrationClient(
  source: string,
  externalId: string,
  data: ClientInput,
): Promise<number> {
  const sourceConnectionId = `${source}:${externalId}`;
  const pool = await ready();
  const { rows } = await pool.query(
    `INSERT INTO clients (name, "clientType", "regCom", cif, cnp, address, judet, city, phone, email, "ciSeries", "ciNumber", "vatPayer", "countryCode", "postalCode", "sourceConnectionId", "sourceNib")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'')
     ON CONFLICT ("sourceConnectionId") WHERE "sourceConnectionId" IS NOT NULL
     DO UPDATE SET name=EXCLUDED.name, "clientType"=EXCLUDED."clientType", "regCom"=EXCLUDED."regCom",
       cif=EXCLUDED.cif, cnp=EXCLUDED.cnp, address=EXCLUDED.address, judet=EXCLUDED.judet,
       city=EXCLUDED.city, phone=EXCLUDED.phone, email=EXCLUDED.email, "ciSeries"=EXCLUDED."ciSeries",
       "ciNumber"=EXCLUDED."ciNumber", "vatPayer"=EXCLUDED."vatPayer",
       "countryCode"=EXCLUDED."countryCode", "postalCode"=EXCLUDED."postalCode"
     RETURNING id`,
    [
      data.name, data.clientType || "PF", data.regCom ?? "", data.cif ?? "", data.cnp ?? "",
      data.address ?? "", data.judet ?? "", data.city ?? "", data.phone ?? "", data.email ?? "",
      data.ciSeries ?? "", data.ciNumber ?? "", data.vatPayer ? 1 : 0,
      data.countryCode || "RO", data.postalCode ?? "", sourceConnectionId,
    ],
  );
  return Number(rows[0].id);
}

export async function syncClientFromConnection(data: {
  connectionId: string;
  nib: string;
  name: string;
  identifier: string;
  address: string;
  judet: string;
  city: string;
  phone: string;
  ciSeries: string;
  ciNumber: string;
}): Promise<number> {
  const pool = await ready();
  const digits = data.identifier.replace(/\D/g, "");
  const clientType: "PF" | "PJ" = digits.length === 13 ? "PF" : "PJ";
  const cnp = clientType === "PF" ? digits : "";
  const cif = clientType === "PJ" ? data.identifier.trim() : "";
  const existing = await pool.query(
    `SELECT id FROM clients WHERE "sourceConnectionId"=$1 OR ($2<>'' AND cnp=$2) OR ($3<>'' AND cif=$3) ORDER BY ("sourceConnectionId"=$1) DESC LIMIT 1`,
    [data.connectionId, cnp, cif],
  );
  if (existing.rows[0]) {
    const id = Number(existing.rows[0].id);
    await pool.query(
      `UPDATE clients SET name=COALESCE(NULLIF($1,''),name), "clientType"=$2,
       cif=CASE WHEN $2='PJ' THEN COALESCE(NULLIF($3,''),cif) ELSE cif END,
       cnp=CASE WHEN $2='PF' THEN COALESCE(NULLIF($4,''),cnp) ELSE cnp END,
       address=COALESCE(NULLIF($5,''),address), judet=COALESCE(NULLIF($6,''),judet),
       city=COALESCE(NULLIF($7,''),city), phone=COALESCE(NULLIF($8,''),phone),
       "ciSeries"=COALESCE(NULLIF($9,''),"ciSeries"), "ciNumber"=COALESCE(NULLIF($10,''),"ciNumber"),
       "sourceConnectionId"=$11, "sourceNib"=$12 WHERE id=$13`,
      [
        data.name,
        clientType,
        cif,
        cnp,
        data.address,
        data.judet,
        data.city,
        data.phone,
        data.ciSeries,
        data.ciNumber,
        data.connectionId,
        data.nib,
        id,
      ],
    );
    return id;
  }
  return createClient({
    name: data.name || `Beneficiar ${data.nib}`,
    clientType,
    regCom: "",
    cif,
    cnp,
    address: data.address,
    judet: data.judet,
    city: data.city,
    phone: data.phone,
    email: "",
    ciSeries: data.ciSeries,
    ciNumber: data.ciNumber,
    vatPayer: 0,
    countryCode: "RO",
    postalCode: "",
    sourceConnectionId: data.connectionId,
    sourceNib: data.nib,
  });
}

export async function syncClientFromOffer(data: {
  offerId: string;
  name: string;
  identifier: string;
  address: string;
  phone: string;
  email: string;
}): Promise<number> {
  const pool = await ready();
  const digits = data.identifier.replace(/\D/g, "");
  const companyName = /\b(SRL|S\.R\.L\.?|SA|S\.A\.?|PFA|II|IF)\b/i.test(
    data.name,
  );
  const clientType: "PF" | "PJ" =
    digits.length === 13
      ? "PF"
      : digits.length > 0 || companyName
        ? "PJ"
        : "PF";
  const cnp = clientType === "PF" ? digits : "";
  const cif = clientType === "PJ" ? data.identifier.trim() : "";
  const phone = data.phone.trim();
  const email = data.email.trim().toLowerCase();
  const existing = await pool.query(
    `SELECT id FROM clients
     WHERE ($1<>'' AND cnp=$1) OR ($2<>'' AND cif=$2)
        OR ($3<>'' AND lower(email)=$3) OR ($4<>'' AND phone=$4)
        OR lower(name)=lower($5)
     ORDER BY (($1<>'' AND cnp=$1) OR ($2<>'' AND cif=$2)) DESC, id ASC LIMIT 1`,
    [cnp, cif, email, phone, data.name.trim()],
  );
  if (existing.rows[0]) {
    const id = Number(existing.rows[0].id);
    await pool.query(
      `UPDATE clients SET name=COALESCE(NULLIF($1,''),name), "clientType"=$2,
       cif=CASE WHEN $2='PJ' THEN COALESCE(NULLIF($3,''),cif) ELSE cif END,
       cnp=CASE WHEN $2='PF' THEN COALESCE(NULLIF($4,''),cnp) ELSE cnp END,
       address=COALESCE(NULLIF($5,''),address), phone=COALESCE(NULLIF($6,''),phone),
       email=COALESCE(NULLIF($7,''),email) WHERE id=$8`,
      [data.name, clientType, cif, cnp, data.address, phone, email, id],
    );
    return id;
  }
  return createClient({
    name: data.name || `Beneficiar ofertă ${data.offerId.slice(0, 6)}`,
    clientType,
    regCom: "",
    cif,
    cnp,
    address: data.address,
    judet: "",
    city: "",
    phone,
    email,
    ciSeries: "",
    ciNumber: "",
    vatPayer: 0,
    countryCode: "RO",
    postalCode: "",
  });
}

export async function setClientFlagged(id: number, flagged: boolean) {
  const pool = await ready();
  await pool.query(`UPDATE clients SET flagged=$1 WHERE id=$2`, [
    flagged ? 1 : 0,
    id,
  ]);
}

export async function deleteClient(id: number) {
  const pool = await ready();
  await pool.query(`DELETE FROM clients WHERE id=$1`, [id]);
}

// ---------- Products ----------
export async function listProducts(): Promise<Product[]> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM products ORDER BY name`);
  return rows as Product[];
}

export async function createProduct(
  data: Omit<Product, "id">,
): Promise<number> {
  const pool = await ready();
  const { rows } = await pool.query(
    `INSERT INTO products (name, um, price, cost, "vatRate", "unitCode", "vatCategoryCode", "taxExemptionReasonCode", "taxExemptionReason") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      data.name,
      data.um,
      data.price,
      data.cost,
      data.vatRate,
      data.unitCode || "H87",
      data.vatCategoryCode || "S",
      data.taxExemptionReasonCode || "",
      data.taxExemptionReason || "",
    ],
  );
  return rows[0].id as number;
}

export async function updateProduct(id: number, data: Omit<Product, "id">) {
  const pool = await ready();
  await pool.query(
    `UPDATE products SET name=$1, um=$2, price=$3, cost=$4, "vatRate"=$5, "unitCode"=$6, "vatCategoryCode"=$7, "taxExemptionReasonCode"=$8, "taxExemptionReason"=$9 WHERE id=$10`,
    [
      data.name,
      data.um,
      data.price,
      data.cost,
      data.vatRate,
      data.unitCode || "H87",
      data.vatCategoryCode || "S",
      data.taxExemptionReasonCode || "",
      data.taxExemptionReason || "",
      id,
    ],
  );
}

export async function deleteProduct(id: number) {
  const pool = await ready();
  await pool.query(`DELETE FROM products WHERE id=$1`, [id]);
}

// ---------- Counters / numbering ----------
export async function peekNextNumber(series: string): Promise<number> {
  const pool = await ready();
  const normalized = series.trim().toUpperCase() || "FAC";
  const documents = normalized === "CH1" ? "receipts" : "invoices";
  const { rows } = await pool.query(
    `SELECT GREATEST(COALESCE((SELECT "lastNumber" FROM counters WHERE series=$1),0), COALESCE((SELECT MAX(number) FROM ${documents} WHERE series=$1),0)) AS "lastNumber"`,
    [normalized],
  );
  return Number(rows[0]?.lastNumber ?? 0) + 1;
}

async function takeNextNumber(
  series: string,
  client?: PoolClient,
): Promise<number> {
  const pool = client || (await ready());
  const documents = series === "CH1" ? "receipts" : "invoices";
  // Atomic upsert-and-increment so two concurrent requests never collide.
  const { rows } = await pool.query(
    `INSERT INTO counters (series, "lastNumber") VALUES ($1, COALESCE((SELECT MAX(number) FROM ${documents} WHERE series=$1),0) + 1)
     ON CONFLICT (series) DO UPDATE SET "lastNumber" = GREATEST(counters."lastNumber", COALESCE((SELECT MAX(number) FROM ${documents} WHERE series=$1),0)) + 1
     RETURNING "lastNumber"`,
    [series],
  );
  return Number(rows[0].lastNumber);
}

async function takeInvoiceNumber(
  series: string,
  requested?: number,
  client?: PoolClient,
): Promise<number> {
  if (requested === undefined) return takeNextNumber(series, client);
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new Error("Numărul facturii trebuie să fie un număr întreg pozitiv.");
  }
  const pool = client || (await ready());
  await pool.query(`INSERT INTO counters (series, "lastNumber") VALUES ($1,0) ON CONFLICT (series) DO NOTHING`, [series]);
  const allocated = await pool.query(`SELECT GREATEST("lastNumber", COALESCE((SELECT MAX(number) FROM invoices WHERE series=$1),0)) AS "lastNumber" FROM counters WHERE series=$1 FOR UPDATE`, [series]);
  if (requested <= Number(allocated.rows[0]?.lastNumber || 0)) {
    throw new Error("Numărul a fost deja alocat sau este anterior ultimului număr al seriei. Numerele consumate nu se reutilizează.");
  }
  const duplicate = await pool.query(
    `SELECT id FROM invoices WHERE series=$1 AND number=$2 LIMIT 1`,
    [series, requested],
  );
  if (duplicate.rows[0])
    throw new Error(`Factura ${series} ${requested} există deja.`);
  await pool.query(
    `INSERT INTO counters (series, "lastNumber") VALUES ($1,$2)
     ON CONFLICT (series) DO UPDATE SET "lastNumber"=GREATEST(counters."lastNumber", EXCLUDED."lastNumber")`,
    [series, requested],
  );
  return requested;
}

// ---------- Invoices ----------
function computeTotals(items: InvoiceItemInput[], discountPercent = 0) {
  return calculateInvoiceTotals(items, discountPercent);
}

type CreateInvoiceInput = {
  series: string;
  number?: number;
  clientId: number;
  userId?: number | null;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  delegateName?: string;
  delegateCI?: string;
  delegateCNP?: string;
  vehiclePlate?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  discountPercent?: number;
  currency?: string;
  exchangeRate?: number;
  items: InvoiceItemInput[];
  invoiceType?: "STANDARD" | "STORNO";
  originalInvoiceId?: number | null;
  stornoReason?: string;
  initialStatus?: Invoice["status"];
  invoiceTypeCode?: string;
  paymentMeansCode?: string;
  paymentTerms?: string;
  taxPointDate?: string;
  buyerReference?: string;
  sellerSnapshot?: Company;
  clientSnapshot?: Client;
  paidOnSpot?: boolean;
  cashier?: string;
  integrationSource?: string;
  externalId?: string;
  issuanceKey?: string;
};

export async function createInvoice(input: CreateInvoiceInput): Promise<number> {
  if (input.invoiceType && input.invoiceType !== "STANDARD") throw new Error("Factura storno se emite doar prin fluxul dedicat.");
  if (input.originalInvoiceId != null || input.sellerSnapshot != null || input.clientSnapshot != null || input.stornoReason || (input.initialStatus != null && input.initialStatus !== "issued")) {
    throw new Error("Câmpurile interne ale documentului nu pot fi furnizate la emitere.");
  }
  return createInvoiceInTransaction(input);
}

async function createInvoiceInTransaction(
  input: CreateInvoiceInput,
  transactionClient?: PoolClient,
  reversal?: { items: InvoiceItem[]; subtotal: number; vatTotal: number; total: number },
): Promise<number> {
  const pool = await ready();
  const series = typeof input.series === "string" ? input.series.trim().toUpperCase() : "";
  for (const field of ["notes", "delegateName", "delegateCI", "delegateCNP", "vehiclePlate", "deliveryDate", "deliveryTime", "paymentTerms", "buyerReference", "cashier", "integrationSource", "externalId", "issuanceKey"] as const) {
    if (input[field] != null && (typeof input[field] !== "string" || input[field].length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input[field]))) throw new Error(`Câmpul ${field} este invalid.`);
  }
  if (input.userId != null && (!Number.isInteger(input.userId) || input.userId <= 0)) throw new Error("Emitentul selectat este invalid.");
  if (input.paidOnSpot != null && typeof input.paidOnSpot !== "boolean") throw new Error("Opțiunea încasării pe loc este invalidă.");
  if (!series) throw new Error("Completează seria facturii.");
  if (series === "CH1") throw new Error("Seria CH1 este rezervată chitanțelor.");
  if (!/^[A-Z0-9._/-]{1,20}$/.test(series))
    throw new Error("Seria poate conține maximum 20 de caractere: litere, cifre, punct, cratimă, / sau _.");
  if (!Number.isInteger(Number(input.clientId)) || Number(input.clientId) <= 0)
    throw new Error("Selectează un client valid.");
  if (!isIsoDate(input.issueDate)) throw new Error("Data emiterii nu este validă.");
  if (input.issueDate > bucharestDate()) throw new Error("Data emiterii nu poate fi în viitor.");
  if (input.dueDate && !isIsoDate(input.dueDate))
    throw new Error("Data scadenței nu este validă.");
  if (input.dueDate && input.dueDate < input.issueDate)
    throw new Error("Data scadenței nu poate fi anterioară datei emiterii.");
  if (input.taxPointDate && !isIsoDate(input.taxPointDate))
    throw new Error("Data exigibilității TVA nu este validă.");
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 1000)
    throw new Error("Factura trebuie să conțină cel puțin o poziție.");
  const discountPercent = input.discountPercent ?? 0;
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)
    throw new Error("Discountul trebuie să fie între 0% și 100%.");
  const invoiceType = input.invoiceType ?? "STANDARD";
  if (!["STANDARD", "STORNO"].includes(invoiceType)) throw new Error("Tip de document invalid.");
  if (input.initialStatus != null && input.initialStatus !== (invoiceType === "STORNO" ? "storno" : "issued")) throw new Error("Statusul inițial al documentului este invalid.");
  if (invoiceType === "STORNO" && (!reversal || !transactionClient || !input.originalInvoiceId)) throw new Error("Factura storno necesită documentul original blocat în tranzacție.");
  if (input.invoiceTypeCode && input.invoiceTypeCode !== (invoiceType === "STORNO" ? "381" : "380")) throw new Error("Codul tipului de factură nu corespunde documentului.");
  if (input.currency != null && typeof input.currency !== "string") throw new Error("Moneda facturii nu este validă.");
  const currency = String(input.currency || "RON").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Moneda facturii nu este validă.");
  if (currency !== "RON" && !reversal) throw new Error("Emiterile noi sunt disponibile momentan numai în RON. Documentele istorice în valută se păstrează nemodificate.");
  const exchangeRate = Number(input.exchangeRate ?? 1);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate >= 1_000_000)
    throw new Error("Cursul de schimb trebuie să fie pozitiv și mai mic de 1.000.000.");
  convertMoney(0, exchangeRate); // Shared decimal precision bound (maximum 9 places).
  if (currency === "RON" && exchangeRate !== 1) throw new Error("Cursul unei facturi în RON trebuie să fie 1.");
  const integrationSource = input.integrationSource?.trim().toLowerCase() || null;
  const externalId = input.externalId?.trim() || null;
  if ((integrationSource && !externalId) || (!integrationSource && externalId))
    throw new Error("Sursa integrării și identificatorul extern trebuie furnizate împreună.");
  if (integrationSource && !/^[a-z0-9_-]{2,40}$/.test(integrationSource))
    throw new Error("Sursa integrării nu este validă.");
  if (externalId && (externalId.length > 160 || /[\u0000-\u001f]/.test(externalId)))
    throw new Error("Identificatorul extern nu este valid.");
  const issuanceKey = typeof input.issuanceKey === "string" ? input.issuanceKey.trim() : "";
  if (!reversal && !integrationSource && !/^[A-Za-z0-9:_-]{16,160}$/.test(issuanceKey)) throw new Error("Identificatorul unic al emiterii lipsește sau este invalid. Reîncarcă formularul.");
  if (input.paymentMeansCode != null && !["10", "30", "42", "48", "ZZZ"].includes(input.paymentMeansCode)) throw new Error("Modalitatea de plată este invalidă.");
  if (!input.dueDate && !String(input.paymentTerms || "").trim() && !input.paidOnSpot) throw new Error("Completează scadența sau termenii de plată înainte de emitere.");
  const categories = new Set<string>();
  const exemptionReasons = new Map<string, string>();
  input.items.forEach((item, index) => {
    const line = index + 1;
    if (!item || typeof item !== "object" || typeof item.description !== "string" || !item.description.trim() || item.description.length > 2000 || /[\u0000-\u001f]/.test(item.description))
      throw new Error(`Poziția ${line}: completează denumirea.`);
    if (typeof item.um !== "string" || item.um.length > 30) throw new Error(`Poziția ${line}: unitatea de măsură este invalidă.`);
    if (item.unitCode != null && (typeof item.unitCode !== "string" || !/^[A-Z0-9]{1,3}$/.test(item.unitCode.trim().toUpperCase()))) throw new Error(`Poziția ${line}: codul unității este invalid.`);
    for (const field of ["taxExemptionReasonCode", "taxExemptionReason"] as const) {
      if (item[field] != null && (typeof item[field] !== "string" || item[field].length > 1000 || /[\u0000-\u001f]/.test(item[field]))) throw new Error(`Poziția ${line}: motivul scutirii este invalid.`);
    }
    if (item.productId != null && (!Number.isInteger(item.productId) || item.productId <= 0)) throw new Error(`Poziția ${line}: produs invalid.`);
    if (!Number.isFinite(item.qty) || item.qty <= 0)
      throw new Error(`Poziția ${line}: cantitatea trebuie să fie pozitivă.`);
    if (!Number.isFinite(item.unitPrice))
      throw new Error(`Poziția ${line}: prețul nu este valid.`);
    if (invoiceType === "STANDARD" && item.unitPrice < 0)
      throw new Error(`Poziția ${line}: prețul unei facturi normale nu poate fi negativ.`);
    if (!Number.isFinite(item.vatRate) || item.vatRate < 0 || item.vatRate > 100)
      throw new Error(`Poziția ${line}: cota TVA nu este validă.`);
    const category = String(item.vatCategoryCode || (item.vatRate === 0 ? "Z" : "S")).toUpperCase();
    categories.add(category);
    if (!["S", "Z", "E", "AE", "K", "G", "O"].includes(category))
      throw new Error(`Poziția ${line}: categoria TVA nu este validă.`);
    if (category === "S" && item.vatRate <= 0)
      throw new Error(`Poziția ${line}: categoria TVA S necesită o cotă pozitivă.`);
    if (category !== "S" && item.vatRate !== 0)
      throw new Error(`Poziția ${line}: o categorie TVA diferită de S trebuie să aibă cota 0%.`);
    if (["E", "AE", "K", "G", "O"].includes(category) && !String(item.taxExemptionReasonCode || item.taxExemptionReason || "").trim())
      throw new Error(`Poziția ${line}: completează motivul sau codul scutirii de TVA.`);
    const fiscalKey = `${category}|${item.vatRate}`;
    const reason = `${String(item.taxExemptionReasonCode || "").trim()}|${String(item.taxExemptionReason || "").trim()}`;
    if (exemptionReasons.has(fiscalKey) && exemptionReasons.get(fiscalKey) !== reason) throw new Error("Pozițiile din aceeași categorie și cotă TVA trebuie să folosească același motiv de scutire.");
    exemptionReasons.set(fiscalKey, reason);
  });
  if (categories.has("O") && categories.size > 1) throw new Error("Categoria O nu poate fi combinată cu alte categorii TVA.");
  const totals = reversal
    ? {
        computed: input.items.map((item, index) => ({ ...item, valoare: -Number(reversal.items[index].valoare), vatValue: -Number(reversal.items[index].vatValue) })),
        subtotal: -Number(reversal.subtotal), vatTotal: -Number(reversal.vatTotal), total: -Number(reversal.total),
      }
    : computeTotals(input.items, discountPercent);
  const { computed, subtotal, vatTotal, total } = totals;
  if (![subtotal, vatTotal, total].every(value => Number.isFinite(value) && Math.abs(value) <= 999999999999.99)) throw new Error("Valorile calculate ale facturii depășesc limitele acceptate.");
  if (invoiceType === "STANDARD" && total <= 0)
    throw new Error("Totalul unei facturi normale trebuie să fie pozitiv.");
  if (input.paidOnSpot && invoiceType !== "STANDARD") {
    throw new Error(
      "Chitanța automată este disponibilă doar pentru facturi normale.",
    );
  }
  if (input.paidOnSpot && currency !== "RON") {
    throw new Error(
      "Chitanța automată poate fi emisă doar pentru facturi în RON.",
    );
  }
  if (input.paidOnSpot && total <= 0) {
    throw new Error(
      "Totalul facturii trebuie să fie pozitiv pentru încasarea pe loc.",
    );
  }

  const connection = transactionClient || await pool.connect();
  const ownsTransaction = !transactionClient;
  try {
    if (ownsTransaction) await connection.query("BEGIN");
    const semanticHash = createHash("sha256").update(JSON.stringify({
      series, number: input.number ?? null, clientId: Number(input.clientId), userId: input.userId ?? null,
      issueDate: input.issueDate, dueDate: input.dueDate || null, notes: input.notes || "",
      delegateName: input.delegateName || "", delegateCI: input.delegateCI || "", delegateCNP: input.delegateCNP || "",
      vehiclePlate: input.vehiclePlate || "", deliveryDate: input.deliveryDate || "", deliveryTime: input.deliveryTime || "",
      discountPercent, currency, exchangeRate, paymentTerms: input.paymentTerms || "", paymentMeansCode: input.paymentMeansCode || "30",
      taxPointDate: input.taxPointDate || input.issueDate, buyerReference: input.buyerReference || "", paidOnSpot: input.paidOnSpot === true, cashier: input.cashier || "",
      items: input.items.map(item => ({ productId: item.productId ?? null, description: String(item.description).trim(), um: String(item.um || "buc").trim(), qty: item.qty, unitPrice: item.unitPrice, vatRate: item.vatRate, unitCode: String(item.unitCode || "H87").trim().toUpperCase(), vatCategoryCode: String(item.vatCategoryCode || (item.vatRate === 0 ? "Z" : "S")).trim().toUpperCase(), taxExemptionReasonCode: item.taxExemptionReasonCode || "", taxExemptionReason: item.taxExemptionReason || "" })),
    })).digest("hex");
    if (!reversal) {
      const reference = integrationSource ? `integration:${integrationSource}:${externalId}` : `issuance:${issuanceKey}`;
      await connection.query(`SELECT pg_advisory_xact_lock($1,hashtext($2))`, [73002, reference]);
      const existing = integrationSource
        ? await connection.query(`SELECT id,"issuanceHash" FROM invoices WHERE "integrationSource"=$1 AND "externalId"=$2`, [integrationSource, externalId])
        : await connection.query(`SELECT id,"issuanceHash" FROM invoices WHERE "issuanceKey"=$1`, [issuanceKey]);
      if (existing.rows[0]) {
        if (existing.rows[0].issuanceHash && existing.rows[0].issuanceHash !== semanticHash) throw new Error("Identificatorul emiterii a fost deja folosit pentru alte date. Verifică documentul existent.");
        if (ownsTransaction) await connection.query("COMMIT");
        return Number(existing.rows[0].id);
      }
    }
    const number = await takeInvoiceNumber(series, input.number, connection);
    const clientResult = await connection.query(
      `SELECT * FROM clients WHERE id=$1`,
      [input.clientId],
    );
    const companyResult = await connection.query(
      `SELECT * FROM company WHERE id=1`,
    );
    if (!clientResult.rows[0]) throw new Error("Clientul selectat nu există.");
    const seller = (input.sellerSnapshot || companyResult.rows[0] || {}) as Company;
    const buyer = (input.clientSnapshot || clientResult.rows[0] || {}) as Client;
    if ([seller, buyer].some(party => Object.values(party).some(value => typeof value === "string" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)))) throw new Error("Datele de identificare conțin caractere nepermise în documentele fiscale.");
    if (!seller.name || !seller.cif || !seller.address || !seller.city || !seller.county)
      throw new Error("Completează denumirea, CIF-ul și adresa completă în secțiunea Firma înainte de emitere.");
    if (!buyer.name || !buyer.address || !buyer.city || !buyer.judet)
      throw new Error("Completează denumirea și adresa completă a clientului înainte de emitere.");
    if (buyer.clientType === "PJ" && !buyer.cif)
      throw new Error("Completează CIF-ul clientului persoană juridică înainte de emitere.");
    if (!seller.vatPayer && computed.some((item) => Number(item.vatRate) !== 0 || String(item.vatCategoryCode || "") !== "O"))
      throw new Error("Firma este setată neplătitoare de TVA. Toate pozițiile trebuie să aibă cota 0%, categoria O și motivul legal completat.");

    const { rows } = await connection.query(
      `INSERT INTO invoices
        (series, number, "clientId", "userId", "issueDate", "dueDate", status, "paidAmount", subtotal, "vatTotal", total, "discountPercent", currency, "exchangeRate", notes, "delegateName", "delegateCI", "delegateCNP", "vehiclePlate", "deliveryDate", "deliveryTime", "integrationSource", "externalId")
       VALUES ($1,$2,$3,$4,$5,$6,'issued',0,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id`,
      [
        series,
        number,
        input.clientId,
        input.userId ?? null,
        input.issueDate,
        input.dueDate ?? null,
        subtotal,
        vatTotal,
        total,
        discountPercent,
        currency,
        exchangeRate,
        input.notes ?? "",
        input.delegateName ?? "",
        input.delegateCI ?? "",
        input.delegateCNP ?? "",
        input.vehiclePlate ?? "",
        input.deliveryDate ?? "",
        input.deliveryTime ?? "",
        integrationSource,
        externalId,
      ],
    );

    const invoiceId = rows[0].id as number;
    await connection.query(`UPDATE invoices SET "issuanceKey"=$2,"issuanceHash"=$3 WHERE id=$1`, [invoiceId, issuanceKey || null, semanticHash]);
    await connection.query(`UPDATE invoices SET "anafSendAfter"=(((now() AT TIME ZONE 'Europe/Bucharest')::date + 1)::timestamp + interval '6 hours') AT TIME ZONE 'UTC', "anafApprovedEnvironment"=$2 WHERE id=$1`, [invoiceId, process.env.ANAF_ENVIRONMENT === 'production' ? 'production' : 'test']);
    await connection.query(
      `UPDATE invoices SET "invoiceType"=$1, "originalInvoiceId"=$2, "stornoReason"=$3, status=$4,
       "invoiceTypeCode"=$5, "paymentMeansCode"=$6, "paymentTerms"=$7, "taxPointDate"=$8, "buyerReference"=$9,
       "sellerSnapshot"=$10::jsonb, "clientSnapshot"=$11::jsonb, "autoEfactura"=$12 WHERE id=$13`,
      [
        invoiceType,
        input.originalInvoiceId ?? null,
        input.stornoReason ?? "",
        input.initialStatus ?? "issued",
        input.invoiceTypeCode ||
          (input.invoiceType === "STORNO" ? "381" : "380"),
        input.paidOnSpot ? "10" : input.paymentMeansCode || "30",
        input.paymentTerms ?? "",
        input.taxPointDate || input.issueDate,
        input.buyerReference ?? "",
        JSON.stringify(input.sellerSnapshot || companyResult.rows[0] || {}),
        JSON.stringify(input.clientSnapshot || clientResult.rows[0]),
        1,
        invoiceId,
      ],
    );

    for (const item of computed) {
      await connection.query(
        `INSERT INTO invoice_items ("invoiceId", "productId", description, um, qty, "unitPrice", "vatRate", valoare, "vatValue", "unitCode", "vatCategoryCode", "taxExemptionReasonCode", "taxExemptionReason")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          invoiceId,
          item.productId ?? null,
          item.description.trim(),
          item.um.trim() || "buc",
          item.qty,
          item.unitPrice,
          item.vatRate,
          item.valoare,
          item.vatValue,
          String(item.unitCode || "H87").trim().toUpperCase(),
          String(item.vatCategoryCode || (item.vatRate === 0 ? "Z" : "S")).trim().toUpperCase(),
          String(item.taxExemptionReasonCode || "").trim(),
          String(item.taxExemptionReason || "").trim(),
        ],
      );
    }

    if (input.paidOnSpot) {
      const { rows: paymentRows } = await connection.query(
        `INSERT INTO payments ("invoiceId", amount, date, method, notes) VALUES ($1,$2,$3,'numerar',$4) RETURNING id`,
        [invoiceId, total, input.issueDate, "Achitată integral la emitere."],
      );
      await createRefIncomeForPayment(
        {
          paymentId: Number(paymentRows[0].id),
          invoiceId,
          date: input.issueDate,
          amount: total,
          invoiceTotal: total,
          invoiceSubtotal: subtotal,
          series,
          number,
          clientName: String(clientResult.rows[0].name || "Client"),
          currency,
          exchangeRate,
        },
        connection,
      );
      const receiptNumber = await takeNextNumber("CH1", connection);
      await connection.query(
        `INSERT INTO receipts (series, number, "invoiceId", "issueDate", amount, cashier) VALUES ('CH1',$1,$2,$3,$4,$5)`,
        [
          receiptNumber,
          invoiceId,
          input.issueDate,
          total,
          input.cashier ?? input.delegateName ?? "",
        ],
      );
      await connection.query(
        `UPDATE invoices SET "paidAmount"=$1, status='paid' WHERE id=$2`,
        [total, invoiceId],
      );
    }

    await recordInvoiceEvent(connection, invoiceType === "STORNO" ? "STORNO_ISSUED" : "INVOICE_ISSUED", invoiceId, { series, number, currency, subtotal, vatTotal, total, originalInvoiceId: input.originalInvoiceId ?? null });
    if (ownsTransaction) await connection.query("COMMIT");
    return invoiceId;
  } catch (error) {
    if (ownsTransaction) await connection.query("ROLLBACK");
    throw error;
  } finally {
    if (ownsTransaction) connection.release();
  }
}

export async function getInvoiceByIntegrationReference(source: string, externalId: string) {
  const pool = await ready();
  const { rows } = await pool.query(
    `SELECT id FROM invoices WHERE "integrationSource"=$1 AND "externalId"=$2 LIMIT 1`,
    [source.trim().toLowerCase(), externalId.trim()],
  );
  return rows[0] ? getInvoiceFull(Number(rows[0].id)) : undefined;
}

export async function createStornoInvoice(input: {
  originalInvoiceId: number;
  series?: string;
  issueDate: string;
  reason: string;
}): Promise<number> {
  if (!Number.isInteger(input.originalInvoiceId) || input.originalInvoiceId <= 0) throw new Error("Factura originală este invalidă.");
  if (input.series != null && typeof input.series !== "string") throw new Error("Seria storno este invalidă.");
  if (typeof input.reason !== "string" || !input.reason.trim() || input.reason.length > 10000)
    throw new Error("Completează motivul stornării.");
  const pool = await ready();
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [73001, input.originalInvoiceId]);
    const invoice = (await connection.query(
      `SELECT * FROM invoices WHERE id=$1 FOR UPDATE`,
      [input.originalInvoiceId],
    )).rows[0] as Invoice | undefined;
    if (!invoice) throw new Error("Factura selectată nu există.");
    if (!isIsoDate(input.issueDate) || input.issueDate < invoice.issueDate) throw new Error("Data stornării nu poate fi anterioară facturii inițiale.");
    if (input.issueDate > bucharestDate()) throw new Error("Data stornării nu poate fi în viitor.");
    const duplicate = await connection.query(
      `SELECT id,series,"issueDate","stornoReason" FROM invoices WHERE "originalInvoiceId"=$1 AND "invoiceType"='STORNO' LIMIT 1`,
      [input.originalInvoiceId],
    );
    if (duplicate.rows[0]) {
      const previous = duplicate.rows[0];
      if (previous.series === String(input.series || "STO").trim().toUpperCase() && previous.issueDate === input.issueDate && previous.stornoReason === input.reason.trim()) {
        await connection.query("COMMIT");
        return Number(previous.id);
      }
      throw new Error("Factura selectată are deja o factură storno cu alte date. Verifică documentul existent.");
    }
    if (
      invoice.invoiceType === "STORNO" ||
      ["storno", "stornoed", "canceled"].includes(invoice.status)
    ) {
      throw new Error("Factura selectată nu poate fi stornată.");
    }

    const [itemResult, clientResult, companyResult] = await Promise.all([
      connection.query(`SELECT * FROM invoice_items WHERE "invoiceId"=$1 ORDER BY id`, [invoice.id]),
      connection.query(`SELECT * FROM clients WHERE id=$1`, [invoice.clientId]),
      connection.query(`SELECT * FROM company WHERE id=1`),
    ]);
    const items = itemResult.rows as InvoiceItem[];
    const liveClient = clientResult.rows[0] as Client | undefined;
    const liveCompany = companyResult.rows[0] as Company | undefined;
    const clientSnapshot = Object.keys(invoice.clientSnapshot || {}).length
      ? invoice.clientSnapshot as Client
      : liveClient;
    const sellerSnapshot = Object.keys(invoice.sellerSnapshot || {}).length
      ? invoice.sellerSnapshot as Company
      : liveCompany;
    if (!clientSnapshot || !sellerSnapshot || items.length === 0) {
      throw new Error("Factura originală nu are toate datele necesare stornării.");
    }
    assertInvoiceArithmetic({ invoice, items });

    const reference = `${invoice.series} ${String(invoice.number).padStart(4, "0")}`;
    const id = await createInvoiceInTransaction({
      series: (input.series || "STO").toUpperCase(),
      clientId: invoice.clientId,
      userId: invoice.userId,
      issueDate: input.issueDate,
      dueDate: input.issueDate,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      notes: `Storno pentru factura ${reference}. Motiv: ${input.reason}`,
      delegateName: invoice.delegateName,
      delegateCI: invoice.delegateCI,
      delegateCNP: invoice.delegateCNP,
      discountPercent: invoice.discountPercent,
      invoiceType: "STORNO",
      originalInvoiceId: invoice.id,
      stornoReason: input.reason.trim(),
      invoiceTypeCode: "381",
      paymentMeansCode: invoice.paymentMeansCode,
      paymentTerms: invoice.paymentTerms,
      taxPointDate: input.issueDate,
      buyerReference: invoice.buyerReference,
      sellerSnapshot,
      clientSnapshot,
      initialStatus: "storno",
      items: items.map((item) => ({
        productId: item.productId,
        description: `STORNO - ${item.description}`,
        um: item.um,
        qty: Math.abs(item.qty),
        unitPrice: -Math.abs(item.unitPrice),
        vatRate: item.vatRate,
        unitCode: item.unitCode,
        vatCategoryCode: item.vatCategoryCode,
        taxExemptionReasonCode: item.taxExemptionReasonCode,
        taxExemptionReason: item.taxExemptionReason,
      })),
    }, connection, { items, subtotal: Number(invoice.subtotal), vatTotal: Number(invoice.vatTotal), total: Number(invoice.total) });
    await connection.query(`UPDATE invoices SET status='stornoed' WHERE id=$1`, [invoice.id]);
    await recordInvoiceEvent(connection, "INVOICE_STORNOED", invoice.id, { stornoId: id, originalTotal: Number(invoice.total), reversedTotal: -Number(invoice.total) });
    await connection.query("COMMIT");
    return id;
  } catch (error) {
    await connection.query("ROLLBACK");
    if (
      (error as { code?: string }).code === "23505" &&
      (error as { constraint?: string }).constraint === "invoices_one_storno_per_original"
    ) {
      throw new Error("Factura selectată are deja o factură storno.");
    }
    throw error;
  } finally {
    connection.release();
  }
}
export async function listInvoices(limit?: number): Promise<
  (Invoice & {
    clientName: string;
    userName: string | null;
    eFacturaStatus: string | null;
    eFacturaMessage: string | null;
    eFacturaSubmissionId: number | null;
    eFacturaUploadId: string | null;
    eFacturaDownloadId: string | null;
    eFacturaSubmittedAt: string | null;
    eFacturaCheckedAt: string | null;
    eFacturaAttemptNumber: number | null;
    eFacturaRetryable: number | null;
  })[]
> {
  const pool = await ready();
  const environment =
    process.env.ANAF_ENVIRONMENT === "production" ? "production" : "test";
  const safeLimit = Number.isInteger(limit) && Number(limit) > 0 ? Number(limit) : null;
  const { rows } = await pool.query(
    `SELECT i.*, c.name as "clientName", u.name as "userName",
       ef.status as "eFacturaStatus", ef.message as "eFacturaMessage",
       ef.id as "eFacturaSubmissionId", ef."uploadId" as "eFacturaUploadId",
       ef."downloadId" as "eFacturaDownloadId", ef."submittedAt" as "eFacturaSubmittedAt",
       ef."checkedAt" as "eFacturaCheckedAt", ef."attemptNumber" as "eFacturaAttemptNumber",
       ef.retryable as "eFacturaRetryable"
     FROM invoices i
     JOIN clients c ON c.id = i."clientId"
     LEFT JOIN users u ON u.id = i."userId"
     LEFT JOIN LATERAL (
        SELECT id, status, message, "uploadId", "downloadId", "submittedAt", "checkedAt", "attemptNumber", retryable
        FROM efactura_submissions
       WHERE "invoiceId"=i.id AND environment=$1 ORDER BY id DESC LIMIT 1
     ) ef ON true
     ORDER BY i."issueDate" DESC, i.id DESC
     ${safeLimit ? "LIMIT $2" : ""}`,
    safeLimit ? [environment, safeLimit] : [environment],
  );
  return rows as (Invoice & {
    clientName: string;
    userName: string | null;
    eFacturaStatus: string | null;
    eFacturaMessage: string | null;
    eFacturaSubmissionId: number | null;
    eFacturaUploadId: string | null;
    eFacturaDownloadId: string | null;
    eFacturaSubmittedAt: string | null;
    eFacturaCheckedAt: string | null;
    eFacturaAttemptNumber: number | null;
    eFacturaRetryable: number | null;
  })[];
}

export async function getInvoice(id: number): Promise<Invoice | undefined> {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM invoices WHERE id=$1`, [id]);
  return rows[0] as Invoice | undefined;
}

export async function getInvoiceItems(
  invoiceId: number,
): Promise<InvoiceItem[]> {
  const pool = await ready();
  const { rows } = await pool.query(
    `SELECT * FROM invoice_items WHERE "invoiceId"=$1`,
    [invoiceId],
  );
  return rows as InvoiceItem[];
}

export async function getInvoiceFull(id: number, transactionClient?: PoolClient) {
  const executor = transactionClient || await ready();
  const invoice = (await executor.query(`SELECT * FROM invoices WHERE id=$1`, [id])).rows[0] as Invoice | undefined;
  if (!invoice) return undefined;
  const [itemResult, clientResult, companyResult, receiptResult, paymentResult, userResult, originalResult] =
    await Promise.all([
      executor.query(`SELECT * FROM invoice_items WHERE "invoiceId"=$1 ORDER BY id`, [id]),
      executor.query(`SELECT * FROM clients WHERE id=$1`, [invoice.clientId]),
      executor.query(`SELECT * FROM company WHERE id=1`),
      executor.query(`SELECT * FROM receipts WHERE "invoiceId"=$1 ORDER BY id`, [id]),
      executor.query(`SELECT * FROM payments WHERE "invoiceId"=$1 ORDER BY date,id`, [id]),
      invoice.userId ? executor.query(`SELECT * FROM users WHERE id=$1`, [invoice.userId]) : Promise.resolve({ rows: [] }),
      invoice.originalInvoiceId
        ? executor.query(`SELECT * FROM invoices WHERE id=$1`, [invoice.originalInvoiceId])
        : Promise.resolve({ rows: [] }),
    ]);
  const items = itemResult.rows as InvoiceItem[];
  const liveClient = clientResult.rows[0] as Client | undefined;
  const liveCompany = companyResult.rows[0] as Company;
  const receipts = receiptResult.rows as Awaited<ReturnType<typeof listReceiptsForInvoice>>;
  const payments = paymentResult.rows as Awaited<ReturnType<typeof listPaymentsForInvoice>>;
  const user = userResult.rows[0] as User | undefined;
  const originalInvoice = originalResult.rows[0] as Invoice | undefined;
  const client = Object.keys(invoice.clientSnapshot || {}).length
    ? (invoice.clientSnapshot as Client)
    : liveClient;
  const company = Object.keys(invoice.sellerSnapshot || {}).length
    ? (invoice.sellerSnapshot as Company)
    : liveCompany;
  return { invoice, items, client, company, receipts, payments, user, originalInvoice };
}

export async function setInvoiceStatus(id: number, status: Invoice["status"]) {
  void id; void status;
  throw new Error("Statusul unei facturi emise se modifică numai prin încasare sau storno, cu jurnal de audit.");
}

export async function correctUnsentInvoice(id: number, input: { clientId?: number; dueDate: string; paymentTerms: string; notes: string; items: { id: number; description: string; qty?: number; unitPrice?: number }[] }) {
  const connection = await (await ready()).connect();
  try {
    await connection.query("BEGIN");
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [73001, id]);
    const invoice = (await connection.query(`SELECT * FROM invoices WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!invoice || invoice.invoiceType !== "STANDARD" || !['issued','paid','partial'].includes(invoice.status)) throw new Error("Factura nu poate fi modificată.");
    const locked = (await connection.query(`SELECT id FROM efactura_submissions WHERE "invoiceId"=$1 AND NOT ((status='ERROR' AND COALESCE("uploadId",'')='') OR (environment='test' AND status='REJECTED')) LIMIT 1`, [id])).rows[0];
    if (locked) throw new Error("Factura a fost transmisă sau este în procesare. Editarea este blocată.");
    if (typeof input.dueDate !== 'string' || typeof input.paymentTerms !== 'string' || typeof input.notes !== 'string' || !Array.isArray(input.items)) throw new Error("Date de corecție invalide.");
    if (input.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || !Number.isFinite(Date.parse(input.dueDate)) || new Date(input.dueDate).toISOString().slice(0,10) !== input.dueDate)) throw new Error("Scadență invalidă.");
    if (input.dueDate && input.dueDate < invoice.issueDate) throw new Error("Scadența nu poate fi anterioară datei emiterii.");
    if (!input.dueDate && !input.paymentTerms.trim() && Number(invoice.total) - Number(invoice.paidAmount) > 0) throw new Error("Completează scadența sau termenii de plată pentru soldul pozitiv.");
    const existing = (await connection.query(`SELECT * FROM invoice_items WHERE "invoiceId"=$1 ORDER BY id`, [id])).rows;
    if (input.items.length !== existing.length || new Set(input.items.map(i => i.id)).size !== existing.length || input.items.some(i => !existing.some(e => e.id === i.id) || typeof i.description !== 'string' || !i.description.trim())) throw new Error("Pozițiile facturii sunt invalide.");
    const changedMoney = input.items.some(i => { const old = existing.find(e => e.id === i.id)!; return (i.qty !== undefined && Number(i.qty) !== Number(old.qty)) || (i.unitPrice !== undefined && Number(i.unitPrice) !== Number(old.unitPrice)); });
    const changedClient = input.clientId !== undefined && input.clientId !== invoice.clientId;
    const hasPayments = Number((await connection.query(`SELECT (SELECT COUNT(*) FROM payments WHERE "invoiceId"=$1)+(SELECT COUNT(*) FROM receipts WHERE "invoiceId"=$1) AS count`, [id])).rows[0].count) > 0;
    if ((changedMoney || changedClient) && (hasPayments || Number(invoice.paidAmount) !== 0)) throw new Error('Beneficiarul și valorile nu pot fi schimbate după încasare. Plățile și chitanțele existente sunt protejate.');
    if (changedClient) {
      const client = (await connection.query(`SELECT * FROM clients WHERE id=$1`, [input.clientId])).rows[0];
      if (!client?.name || !client.address || !client.city || !client.judet) throw new Error('Beneficiar inexistent sau adresă incompletă.');
      await connection.query(`UPDATE invoices SET "clientId"=$2,"clientSnapshot"=$3::jsonb WHERE id=$1`, [id, input.clientId, JSON.stringify(client)]);
    }
    if (changedMoney) {
      const values = existing.map(old => { const item = input.items.find(i => i.id === old.id)!; const qty = Number(item.qty ?? old.qty), unitPrice = Number(item.unitPrice ?? old.unitPrice); if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Cantitate sau preț invalid.'); return { ...old, qty, unitPrice }; });
      const totals = computeTotals(values, Number(invoice.discountPercent));
      if (totals.total <= 0) throw new Error("Totalul unei facturi normale trebuie să fie pozitiv.");
      for (let i=0;i<existing.length;i++) { const item=totals.computed[i]; await connection.query(`UPDATE invoice_items SET qty=$1,"unitPrice"=$2,valoare=$3,"vatValue"=$4 WHERE id=$5`, [item.qty,item.unitPrice,item.valoare,item.vatValue,existing[i].id]); }
      await connection.query(`UPDATE invoices SET subtotal=$2,"vatTotal"=$3,total=$4 WHERE id=$1`, [id,totals.subtotal,totals.vatTotal,totals.total]);
    }
    await connection.query(`UPDATE invoices SET "dueDate"=$1,"paymentTerms"=$2,notes=$3 WHERE id=$4`, [input.dueDate || null, input.paymentTerms, input.notes, id]);
    for (const item of input.items) await connection.query(`UPDATE invoice_items SET description=$1 WHERE id=$2 AND "invoiceId"=$3`, [item.description.trim(), item.id, id]);
    await recordInvoiceEvent(connection, "INVOICE_CORRECTED", id, { before: { clientId: invoice.clientId, dueDate: invoice.dueDate, subtotal: Number(invoice.subtotal), vatTotal: Number(invoice.vatTotal), total: Number(invoice.total), items: existing.map(item => ({ id: item.id, description: item.description, qty: Number(item.qty), unitPrice: Number(item.unitPrice), valoare: Number(item.valoare), vatValue: Number(item.vatValue) })) }, changes: input });
    // Preserve payments, receipts, amounts, fiscal classification and transmission history.
    await connection.query("COMMIT");
  } catch (error) { await connection.query("ROLLBACK"); throw error; }
  finally { connection.release(); }
}

export async function deleteInvoice(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Identificator de factură invalid.");
  // Issuance is a financial event, even before ANAF upload. Never remove its
  // number, payments, receipts or transmitted evidence through cascading deletes.
  throw new Error("Facturile emise și documentele storno nu se șterg. Folosește storno pentru corecția unei facturi; încasările, chitanțele și istoricul rămân protejate.");
}

// ---------- Payments ----------
export async function addPayment(
  invoiceId: number,
  amount: number,
  date: string,
  method: string,
  notes?: string,
  refund = false,
  operationKey?: string,
) {
  const key = financialOperationKey(operationKey);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw new Error("Factura selectată este invalidă.");
  if (typeof refund !== "boolean") throw new Error("Tipul operațiunii de încasare este invalid.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Suma încasată trebuie să fie pozitivă.");
  amount = round2(amount);
  if (amount <= 0) throw new Error("Suma încasată trebuie să fie de cel puțin 0,01.");
  if (!isIsoDate(date)) throw new Error("Data încasării nu este validă.");
  if (typeof method !== "string" || !["numerar", "cash", "bank", "banca", "bancă", "card", "transfer"].includes(method.trim().toLowerCase())) throw new Error("Metoda de plată nu este validă.");
  method = method.trim().toLowerCase();
  if (notes != null && (typeof notes !== "string" || notes.length > 10000)) throw new Error("Observațiile încasării sunt invalide.");
  const operationHash = createHash("sha256").update(JSON.stringify({ invoiceId, amount, date, method, notes: notes || "", refund })).digest("hex");
  const pool = await ready();
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [73001, invoiceId]);
    const { rows: invoiceRows } = await connection.query(
      `SELECT * FROM invoices WHERE id=$1 FOR UPDATE`,
      [invoiceId],
    );
    const invoice = invoiceRows[0] as Invoice | undefined;
    if (!invoice) throw new Error("Factura selectată nu există.");
    const replay = await replayFinancialOperation(connection, "payments", invoiceId, key, operationHash);
    if (replay !== undefined) {
      await connection.query("COMMIT");
      return replay;
    }
    if (
      !invoice ||
      invoice.invoiceType === "STORNO" ||
      (refund
        ? invoice.status !== "stornoed"
        : ["storno", "stornoed", "canceled"].includes(invoice.status))
    ) {
      throw new Error("Factura selectată nu acceptă încasări.");
    }
    if (date < invoice.issueDate || date > bucharestDate()) throw new Error("Data încasării trebuie să fie între data emiterii și ziua curentă.");
    if (refund) {
      const storno = (
        await connection.query(
          `SELECT "issueDate" FROM invoices WHERE "originalInvoiceId"=$1 AND "invoiceType"='STORNO'`,
          [invoiceId],
        )
      ).rows[0];
      if (!storno || date < storno.issueDate) {
        throw new Error(
          "Restituirea necesită factura storno și o dată ulterioară sau egală cu aceasta.",
        );
      }
    }

    const alreadyPaid = round2(
      Number((await connection.query(
        `SELECT COALESCE(SUM(amount),0) AS amount FROM payments WHERE "invoiceId"=$1`,
        [invoiceId],
      )).rows[0].amount),
    );
    const outstanding = refund
      ? alreadyPaid
      : subtractMoney(Number(invoice.total), alreadyPaid);
    if (subtractMoney(Number(invoice.paidAmount), alreadyPaid) !== 0) throw new Error("Soldul facturii nu corespunde încasărilor înregistrate. Este necesară reconcilierea înainte de o plată nouă.");
    if (outstanding <= 0) throw new Error("Factura este deja achitată integral.");
    if (round2(amount) > outstanding)
      throw new Error(`Suma depășește restul de plată de ${outstanding.toFixed(2)} ${invoice.currency}.`);
    amount = round2(amount);
    if (amount <= 0)
      throw new Error("Suma încasată trebuie să fie de cel puțin 0,01.");
    if (refund) amount = -amount;

    const { rows: paymentRows } = await connection.query(
      `INSERT INTO payments ("invoiceId", amount, date, method, notes, "operationKey", "operationHash") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [invoiceId, amount, date, method, notes ?? "", key, operationHash],
    );
    const { rows: clientRows } = await connection.query(
      `SELECT * FROM clients WHERE id=$1`,
      [invoice.clientId],
    );
    const snapshotClient = Object.keys(invoice.clientSnapshot || {}).length
      ? (invoice.clientSnapshot as Client)
      : undefined;
    const client = snapshotClient || (clientRows[0] as Client | undefined);
    await createRefIncomeForPayment(
      {
        paymentId: Number(paymentRows[0].id),
        invoiceId,
        date,
        amount,
        invoiceTotal: Number(invoice.total),
        invoiceSubtotal: Number(invoice.subtotal),
        series: invoice.series,
        number: invoice.number,
        clientName: client?.name || "Client",
        currency: invoice.currency,
        exchangeRate: Number(invoice.exchangeRate),
        paidAmountBefore: alreadyPaid,
      },
      connection,
    );

    const paid = addMoney(alreadyPaid, amount);
    const status: Invoice["status"] = refund
      ? "stornoed"
      : paid <= 0
        ? "issued"
        : paid >= invoice.total
          ? "paid"
          : "partial";
    await connection.query(
      `UPDATE invoices SET "paidAmount"=$1, status=$2 WHERE id=$3`,
      [paid, status, invoiceId],
    );
    await recordInvoiceEvent(connection, refund ? "PAYMENT_REFUNDED" : "PAYMENT_RECEIVED", invoiceId, { paymentId: Number(paymentRows[0].id), operationKey: key, amount, currency: invoice.currency, exchangeRate: Number(invoice.exchangeRate), date, method, paidAmount: paid });
    await connection.query("COMMIT");
    return Number(paymentRows[0].id);
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
export async function listPaymentsForInvoice(invoiceId: number) {
  const pool = await ready();
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE "invoiceId"=$1 ORDER BY date`,
    [invoiceId],
  );
  return rows as {
    id: number;
    invoiceId: number;
    amount: number;
    date: string;
    method: string;
    notes: string;
  }[];
}

// ---------- Receipts ----------
export async function createReceipt(
  invoiceId: number,
  issueDate: string,
  amount: number,
  cashier?: string,
  operationKey?: string,
): Promise<number> {
  const key = financialOperationKey(operationKey);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw new Error("Factura selectată este invalidă.");
  if (!isIsoDate(issueDate)) throw new Error("Data chitanței nu este validă.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valoarea chitanței trebuie să fie pozitivă.");
  amount = round2(amount);
  if (amount <= 0) throw new Error("Valoarea chitanței trebuie să fie de cel puțin 0,01 RON.");
  if (cashier != null && (typeof cashier !== "string" || cashier.length > 10000)) throw new Error("Numele casierului este invalid.");
  const operationHash = createHash("sha256").update(JSON.stringify({ invoiceId, issueDate, amount, cashier: cashier || "" })).digest("hex");
  const pool = await ready();
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(`SELECT pg_advisory_xact_lock($1,$2)`, [73001, invoiceId]);
    const invoice = (await connection.query(
      `SELECT * FROM invoices WHERE id=$1 FOR UPDATE`,
      [invoiceId],
    )).rows[0] as Invoice | undefined;
    if (!invoice) throw new Error("Factura selectată nu există.");
    const replay = await replayFinancialOperation(connection, "receipts", invoiceId, key, operationHash);
    if (replay !== undefined) {
      await connection.query("COMMIT");
      return replay;
    }
    if (!invoice || invoice.invoiceType === "STORNO" || ["storno", "stornoed", "canceled"].includes(invoice.status))
      throw new Error("Pentru această factură nu se poate emite chitanță.");
    if (invoice.currency !== "RON")
      throw new Error("Chitanța poate fi emisă doar pentru o factură în RON.");
    if (issueDate < invoice.issueDate || issueDate > bucharestDate()) throw new Error("Data chitanței trebuie să fie între data emiterii facturii și ziua curentă.");
    const cashPaid = round2(Number((await connection.query(
      `SELECT COALESCE(SUM(amount),0) AS amount FROM payments WHERE "invoiceId"=$1 AND date<=$2 AND lower(method) IN ('numerar','cash')`,
      [invoiceId, issueDate],
    )).rows[0].amount));
    const receipted = round2(Number((await connection.query(
      `SELECT COALESCE(SUM(amount),0) AS amount FROM receipts WHERE "invoiceId"=$1`,
      [invoiceId],
    )).rows[0].amount));
    const available = subtractMoney(cashPaid, receipted);
    amount = round2(amount);
    if (amount <= 0)
      throw new Error(
        "Valoarea chitanței trebuie să fie de cel puțin 0,01 RON.",
      );
    if (available <= 0)
      throw new Error("Nu există o încasare în numerar fără chitanță pentru această factură.");
    if (amount > available)
      throw new Error(`Chitanța depășește suma încasată în numerar rămasă neacoperită: ${available.toFixed(2)} RON.`);
    const number = await takeNextNumber("CH1", connection);
    const { rows } = await connection.query(
      `INSERT INTO receipts (series, number, "invoiceId", "issueDate", amount, cashier, "operationKey", "operationHash") VALUES ('CH1',$1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [number, invoiceId, issueDate, amount, cashier ?? "", key, operationHash],
    );
    await recordInvoiceEvent(connection, "RECEIPT_ISSUED", invoiceId, { receiptId: Number(rows[0].id), operationKey: key, series: "CH1", number, issueDate, amount, currency: "RON" });
    await connection.query("COMMIT");
    return rows[0].id as number;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

export async function listReceiptsForInvoice(invoiceId: number) {
  const pool = await ready();
  const { rows } = await pool.query(
    `SELECT * FROM receipts WHERE "invoiceId"=$1 ORDER BY id`,
    [invoiceId],
  );
  return rows as {
    id: number;
    series: string;
    number: number;
    invoiceId: number;
    issueDate: string;
    amount: number;
    cashier: string;
  }[];
}

export async function getReceipt(id: number) {
  const pool = await ready();
  const { rows } = await pool.query(`SELECT * FROM receipts WHERE id=$1`, [id]);
  return rows[0] as
    | {
        id: number;
        series: string;
        number: number;
        invoiceId: number;
        issueDate: string;
        amount: number;
        cashier: string;
      }
    | undefined;
}

// ---------- Dashboard stats ----------
export async function getDashboardStats() {
  const pool = await ready();
  const thisMonth = bucharestDate().slice(0, 7);
  const environment =
    process.env.ANAF_ENVIRONMENT === "production" ? "production" : "test";
  const { rows } = await pool.query(
    `WITH latest_efactura AS (
       SELECT DISTINCT ON ("invoiceId") "invoiceId", status
       FROM efactura_submissions
       WHERE environment=$2
       ORDER BY "invoiceId", id DESC
     )
     SELECT
       COUNT(*)::int AS "totalInvoices",
       COALESCE(SUM((ROUND(total::numeric * "exchangeRate"::numeric,2) - ROUND("paidAmount"::numeric * "exchangeRate"::numeric,2))) FILTER (WHERE status IN ('issued','partial')),0) AS "totalOutstanding",
       COALESCE(SUM(ROUND("paidAmount"::numeric * "exchangeRate"::numeric,2)),0) AS "totalCollected",
       COALESCE(SUM(ROUND(total::numeric * "exchangeRate"::numeric,2)) FILTER (WHERE substring("issueDate",1,7)=$1),0) AS "monthRevenue",
       (SELECT COUNT(*)::int FROM clients) AS "totalClients",
       (SELECT COUNT(*)::int FROM latest_efactura WHERE status IN ('REJECTED','ERROR')) AS "anafProblems"
     FROM invoices`,
    [thisMonth, environment],
  );
  const row = rows[0];
  return {
    totalInvoices: Number(row.totalInvoices),
    totalOutstanding: round2(Number(row.totalOutstanding)),
    totalCollected: round2(Number(row.totalCollected)),
    monthRevenue: round2(Number(row.monthRevenue)),
    totalClients: Number(row.totalClients),
    anafProblems: Number(row.anafProblems),
  };
}

// ---------- Rapoarte avansate ----------
export type DateRange = { from?: string; to?: string };

function dateFilter(
  range: DateRange | undefined,
  col: string,
  startIndex: number,
) {
  if (range?.from && !isIsoDate(range.from)) throw new Error("Data de început a raportului este invalidă.");
  if (range?.to && !isIsoDate(range.to)) throw new Error("Data de sfârșit a raportului este invalidă.");
  if (range?.from && range?.to && range.from > range.to) throw new Error("Intervalul raportului este inversat.");
  const clauses: string[] = [];
  const params: string[] = [];
  let idx = startIndex;
  if (range?.from) {
    clauses.push(`${col} >= $${idx++}`);
    params.push(range.from);
  }
  if (range?.to) {
    clauses.push(`${col} <= $${idx++}`);
    params.push(range.to);
  }
  return {
    where: clauses.length ? "AND " + clauses.join(" AND ") : "",
    params,
  };
}

export async function getSalesByProduct(range?: DateRange) {
  const pool = await ready();
  const { where, params } = dateFilter(range, `i."issueDate"`, 1);
  const { rows } = await pool.query(
    `SELECT CASE WHEN i."invoiceType"='STORNO' AND it.description LIKE 'STORNO - %' THEN substring(it.description FROM 10) ELSE it.description END as name,
            SUM(CASE WHEN i."invoiceType"='STORNO' THEN -it.qty ELSE it.qty END) as qty,
            SUM(ROUND(it.valoare::numeric*i."exchangeRate"::numeric,2)) as total, SUM(ROUND(it."vatValue"::numeric*i."exchangeRate"::numeric,2)) as vat
     FROM invoice_items it
     JOIN invoices i ON i.id = it."invoiceId"
     WHERE i.status != 'canceled' ${where}
     GROUP BY 1
     ORDER BY total DESC`,
    params,
  );
  return rows.map((r) => ({
    name: r.name,
    qty: Number(r.qty),
    total: Number(r.total),
    vat: Number(r.vat),
  })) as {
    name: string;
    qty: number;
    total: number;
    vat: number;
  }[];
}

export async function getProfitByProduct(range?: DateRange) {
  const pool = await ready();
  const { where, params } = dateFilter(range, `i."issueDate"`, 1);
  const { rows } = await pool.query(
    `SELECT CASE WHEN i."invoiceType"='STORNO' AND it.description LIKE 'STORNO - %' THEN substring(it.description FROM 10) ELSE it.description END as name,
            SUM(CASE WHEN i."invoiceType"='STORNO' THEN -it.qty ELSE it.qty END) as qty,
            SUM(ROUND(it.valoare::numeric*i."exchangeRate"::numeric,2)) as revenue,
            SUM(ROUND((CASE WHEN i."invoiceType"='STORNO' THEN -it.qty ELSE it.qty END)::numeric * COALESCE(p.cost, 0)::numeric,2)) as cost,
            (SUM(ROUND(it.valoare::numeric*i."exchangeRate"::numeric,2)) - SUM(ROUND((CASE WHEN i."invoiceType"='STORNO' THEN -it.qty ELSE it.qty END)::numeric * COALESCE(p.cost, 0)::numeric,2))) as profit
     FROM invoice_items it
     JOIN invoices i ON i.id = it."invoiceId"
     LEFT JOIN products p ON p.id = it."productId"
     WHERE i.status != 'canceled' ${where}
     GROUP BY 1
     ORDER BY profit DESC`,
    params,
  );
  return rows.map((r) => ({
    name: r.name,
    qty: Number(r.qty),
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    profit: Number(r.profit),
  })) as {
    name: string;
    qty: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}

export async function getSalesByAgent(range?: DateRange) {
  const pool = await ready();
  const { where, params } = dateFilter(range, `i."issueDate"`, 1);
  const { rows } = await pool.query(
    `SELECT COALESCE(u.name, 'Fara utilizator') as name, COUNT(i.id) as "invoiceCount",
            SUM(ROUND(i.total::numeric*i."exchangeRate"::numeric,2)) as total, SUM(ROUND(i."paidAmount"::numeric*i."exchangeRate"::numeric,2)) as collected
     FROM invoices i
     LEFT JOIN users u ON u.id = i."userId"
     WHERE i.status != 'canceled' ${where}
     GROUP BY i."userId", u.name
     ORDER BY total DESC`,
    params,
  );
  return rows.map((r) => ({
    name: r.name,
    invoiceCount: Number(r.invoiceCount),
    total: Number(r.total),
    collected: Number(r.collected),
  })) as {
    name: string;
    invoiceCount: number;
    total: number;
    collected: number;
  }[];
}

export async function getOverdueInvoices() {
  const pool = await ready();
  const today = bucharestDate();
  const { rows } = await pool.query(
    `SELECT i.*, c.name as "clientName" FROM invoices i
     JOIN clients c ON c.id = i."clientId"
     WHERE i.status IN ('issued','partial') AND i."dueDate" IS NOT NULL AND i."dueDate" != '' AND i."dueDate" < $1
     ORDER BY i."dueDate" ASC`,
    [today],
  );
  return rows as (Invoice & { clientName: string })[];
}

export async function getOutstandingByClient() {
  const pool = await ready();
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.flagged, SUM((ROUND(i.total::numeric*i."exchangeRate"::numeric,2) - ROUND(i."paidAmount"::numeric*i."exchangeRate"::numeric,2))) as outstanding, COUNT(i.id) as "invoiceCount"
     FROM invoices i
     JOIN clients c ON c.id = i."clientId"
     WHERE i.status IN ('issued','partial')
     GROUP BY c.id
     HAVING SUM((ROUND(i.total::numeric*i."exchangeRate"::numeric,2) - ROUND(i."paidAmount"::numeric*i."exchangeRate"::numeric,2))) > 0
     ORDER BY outstanding DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    flagged: r.flagged,
    outstanding: Number(r.outstanding),
    invoiceCount: Number(r.invoiceCount),
  })) as {
    id: number;
    name: string;
    flagged: number;
    outstanding: number;
    invoiceCount: number;
  }[];
}
