const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// Every dependency is explicit. No application database, environment file,
// HTTP client, live invoice or ANAF endpoint can be reached from this suite.
function load(file, mocks = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireMock = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === "node:crypto") return require(id);
    throw new Error(`Unmocked dependency: ${id}`);
  };
  new Function("require", "module", "exports", "process", "fetch", compiled)(
    requireMock, module, module.exports, { env: { ANAF_ENVIRONMENT: "test" } },
    () => { throw new Error("Network is forbidden."); },
  );
  return module.exports;
}

const money = load("lib/accounting/money.ts");
let readyCalls = 0;
let writes = 0;
const forbiddenPool = {
  async connect() { throw new Error("Unexpected connection: invalid input reached a database."); },
  async query() { writes++; throw new Error("Unexpected database query."); },
};
const repo = load("lib/accounting/repo.ts", {
  "./db": { ready: async () => { readyCalls++; return forbiddenPool; } },
  "./date": { bucharestDate: () => "2026-11-17" },
  "./ref": { createRefIncomeForPayment() { throw new Error("Unexpected payment."); } },
  "./money": money,
});
const fixture = {
  series: "NXT", clientId: 1, issueDate: "2026-11-01", dueDate: "2026-11-30",
  issuanceKey: "80c604ab-d42f-421c-9b9c-cb2b4482d594",
  items: [{ description: "Isolated fixture", um: "buc", qty: 1, unitPrice: 100, vatRate: 21, vatCategoryCode: "S" }],
};

async function testIssuanceGuards() {
  const item = changes => [{ ...fixture.items[0], ...changes }];
  const invalid = [
    [{ invoiceType: "STORNO" }, /storno/],
    [{ invoiceType: "UNKNOWN" }, /storno/],
    [{ initialStatus: "" }, /interne/],
    [{ initialStatus: "paid" }, /interne/],
    [{ notes: "Invalid\u0001text" }, /invalid/],
    [{ originalInvoiceId: 9 }, /interne/],
    [{ sellerSnapshot: {} }, /interne/],
    [{ clientSnapshot: {} }, /interne/],
    [{ currency: "EUR", exchangeRate: 5 }, /numai în RON/],
    [{ currency: "RON", exchangeRate: 5 }, /trebuie să fie 1/],
    [{ exchangeRate: Infinity }, /pozitiv/],
    [{ exchangeRate: NaN }, /pozitiv/],
    [{ exchangeRate: 0 }, /pozitiv/],
    [{ exchangeRate: 1000000 }, /mai mic/],
    [{ issueDate: "2026-02-30" }, /emiterii/],
    [{ issueDate: "2026-11-18" }, /viitor/],
    [{ issueDate: "2026-11-18", paidOnSpot: true }, /viitor/],
    [{ dueDate: "2026-11-00" }, /scadenței/],
    [{ dueDate: "2026-10-31" }, /anterioară/],
    [{ taxPointDate: "2026-02-29" }, /exigibilității/],
    [{ dueDate: "", paymentTerms: " " }, /termenii de plată/],
    [{ issuanceKey: "" }, /Identificatorul unic/],
    [{ issuanceKey: "../../bad" }, /Identificatorul unic/],
    [{ series: "CH1" }, /rezervată/],
    [{ discountPercent: 100 }, /pozitiv/],
    [{ discountPercent: Infinity }, /Discountul/],
    [{ items: [] }, /poziție/],
    [{ items: Array.from({ length: 1001 }, () => fixture.items[0]) }, /poziție/],
    [{ items: item({ qty: Infinity, unitPrice: 1e308 }) }, /cantitatea/],
    [{ items: item({ qty: 1e308, unitPrice: 1e308 }) }, /precizia|limite/],
    [{ items: item({ unitPrice: 1e308 }) }, /precizia|limite/],
    [{ items: item({ qty: 0 }) }, /cantitatea/],
    [{ items: item({ qty: 0.0000001 }) }, /maximum 6/],
    [{ items: item({ unitPrice: -0.01 }) }, /negativ/],
    [{ items: item({ unitPrice: 0.0000000001 }) }, /maximum 9/],
    [{ items: item({ vatRate: NaN }) }, /cota TVA/],
    [{ items: item({ vatRate: 0 }) }, /cotă pozitivă/],
    [{ items: item({ vatCategoryCode: "BAD" }) }, /categoria TVA/],
    [{ items: item({ unitCode: "INVALID" }) }, /codul unității/],
    [{ items: item({ description: "Invalid\u0001item" }) }, /denumirea/],
    [{ items: item({ vatRate: 0, vatCategoryCode: "O", taxExemptionReason: "" }) }, /scutirii/],
    [{ items: [...fixture.items, { ...fixture.items[0], vatRate: 0, vatCategoryCode: "O", taxExemptionReason: "Outside VAT" }] }, /combinată/],
    [{ items: [{ ...fixture.items[0], vatRate: 0, vatCategoryCode: "E", taxExemptionReason: "A" }, { ...fixture.items[0], vatRate: 0, vatCategoryCode: "E", taxExemptionReason: "B" }] }, /același motiv/],
  ];
  for (const [changes, expected] of invalid) {
    await assert.rejects(() => repo.createInvoice({ ...fixture, ...changes }), expected, JSON.stringify(changes));
  }
  assert.equal(writes, 0, "Invalid issuance must not write any financial record");
  const before = readyCalls;
  await assert.rejects(() => repo.deleteInvoice(1), /nu se șterg/);
  await assert.rejects(() => repo.setInvoiceStatus(1, "paid"), /jurnal de audit/);
  assert.equal(readyCalls, before, "Protected records cannot enter a delete/update transaction");
}

async function testClientBoundReads() {
  const seller = { name: "Historical seller" };
  const buyer = { name: "Historical buyer" };
  const invoice = { id: 42, clientId: 7, userId: 3, originalInvoiceId: 8, sellerSnapshot: seller, clientSnapshot: buyer };
  const queries = [];
  const client = { async query(sql, args = []) {
    queries.push([sql, args]);
    if (sql === "SELECT * FROM invoices WHERE id=$1") return { rows: [args[0] === 42 ? invoice : { id: 8 }] };
    if (sql.includes("FROM invoice_items")) return { rows: [{ id: 4, invoiceId: 42 }] };
    if (sql.includes("FROM clients")) return { rows: [{ name: "Current buyer" }] };
    if (sql.includes("FROM company")) return { rows: [{ name: "Current seller" }] };
    if (sql.includes("FROM receipts") || sql.includes("FROM payments")) return { rows: [] };
    if (sql.includes("FROM users")) return { rows: [{ id: 3 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  } };
  const before = readyCalls;
  const full = await repo.getInvoiceFull(42, client);
  assert.equal(readyCalls, before, "A bound transaction never asks the pool for another connection");
  assert.equal(queries.length, 8);
  assert.equal(full.company, seller);
  assert.equal(full.client, buyer);
  assert.equal(full.originalInvoice.id, 8);
  assert.equal(full.user.id, 3);
}

async function testHistoricalPaymentAllocation() {
  const entries = [];
  const client = { async query(sql, args = []) {
    assert.ok(sql.includes("INSERT INTO ref_transactions"), "Automatic REF income must not read the current company VAT flag");
    entries.push(args);
    return { rows: [] };
  } };
  const ref = load("lib/accounting/ref.ts", {
    "@/lib/accounting/db": { ready: async () => { throw new Error("Transaction connection must be reused."); } },
    "./money": money,
  });
  let before = 0;
  for (const [index, amount] of [0.01, 0.01, 0.01, 120.97, -0.01, -120.99].entries()) {
    await ref.createRefIncomeForPayment({
      paymentId: index + 1, invoiceId: 1, date: "2026-11-17", amount,
      invoiceTotal: 121, invoiceSubtotal: 100, paidAmountBefore: before,
      currency: "RON", exchangeRate: 1, series: "NXT", number: 1, clientName: "Historic VAT fixture",
    }, client);
    before = money.addMoney(before, amount);
  }
  assert.equal(before, 0);
  for (const offset of [3, 4, 5, 6]) assert.equal(money.addMoney(...entries.map(row => row[offset])), 0, `Payments and refunds close REF field ${offset}`);
  entries.length = 0;
  await ref.createRefIncomeForPayment({ paymentId: 9, invoiceId: 1, date: "2026-11-17", amount: 121,
    invoiceTotal: 121, invoiceSubtotal: 100, paidAmountBefore: 0, currency: "EUR", exchangeRate: 5,
    series: "HIST", number: 1, clientName: "FX fixture" }, client);
  assert.deepEqual(entries[0].slice(3, 7), [605, 105, 500, 500]);
  for (const exchangeRate of [Infinity, NaN, 0, -1, 1000001]) {
    await assert.rejects(() => ref.createRefIncomeForPayment({ paymentId: 10, invoiceId: 1, date: "2026-11-17", amount: 1,
      invoiceTotal: 1, invoiceSubtotal: 1, currency: "EUR", exchangeRate, series: "FX", number: 2, clientName: "Invalid" }, client));
  }
  assert.equal(ref.calculateRefFiscalAmount({ type: "EXPENSE", category: "PARTIAL_EXPENSE", grossAmount: 121, vatAmount: 21, vatPayer: true, deductibilityPercent: 33.335 }), 33.34);
  assert.throws(() => ref.calculateRefFiscalAmount({ type: "EXPENSE", category: "PARTIAL_EXPENSE", grossAmount: 121, vatAmount: 21, vatPayer: true, deductibilityPercent: NaN }));
}

(async () => {
  await testIssuanceGuards();
  await testClientBoundReads();
  await testHistoricalPaymentAllocation();
  console.log("Repository tests passed: runtime financial guards, protected records, transaction-bound reads, historical VAT and FX/refund allocation. No network or real DB access.");
})().catch(error => { console.error(error); process.exitCode = 1; });
