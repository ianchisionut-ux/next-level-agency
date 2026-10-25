const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function loadTypeScript(file, mocks, globals = {}) {
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  const mockRequire = (id) => {
    for (const [suffix, value] of Object.entries(mocks)) {
      if (id.endsWith(suffix)) return value;
    }
    return require(id);
  };
  new Function(
    "require",
    "module",
    "exports",
    "process",
    "Buffer",
    "AbortSignal",
    "fetch",
    compiled,
  )(
    mockRequire,
    loaded,
    loaded.exports,
    process,
    Buffer,
    globals.AbortSignal || AbortSignal,
    globals.fetch || fetch,
  );
  return loaded.exports;
}

async function testAnafLookup() {
  let request;
  const api = loadTypeScript(
    "lib/accounting/anaf-company.ts",
    { "/date": { bucharestDate: () => "2026-10-25" } },
    {
      AbortSignal: { timeout: (milliseconds) => ({ milliseconds }) },
      fetch: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          async json() {
            return {
              found: [
                { date_generale: { cui: 999999, denumire: "Greșit" } },
                {
                  date_generale: {
                    cui: 123456,
                    denumire: "  Firma Corectă SRL ",
                    nrRegCom: "J31/1/2020",
                  },
                  adresa_sediu_social: {
                    sdenumire_Strada: "Str. Test",
                    snumar_Strada: "1",
                    sdenumire_Localitate: "Zalău",
                    sdenumire_Judet: "Sălaj",
                  },
                  inregistrare_scop_Tva: { scpTVA: true },
                },
              ],
            };
          },
        };
      },
    },
  );

  assert.equal(api.normalizeCui(" RO 00123456 "), "123456");
  assert.throws(() => api.normalizeCui("RO-ABC"), /CUI valid/);
  const company = await api.lookupAnafCompany("RO00123456");
  assert.equal(company.name, "Firma Corectă SRL");
  assert.equal(company.cif, "123456");
  assert.equal(company.vatPayer, 1);
  assert.equal(request.url, "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva");
  assert.deepEqual(JSON.parse(request.options.body), [
    { cui: 123456, data: "2026-10-25" },
  ]);
  assert.equal(request.options.signal.milliseconds, 12_000);
}

async function testRefundAndReceiptGuards() {
  let state;
  const refs = [];
  const connection = {
    async query(sql, args = []) {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
      if (sql.includes("SELECT * FROM invoices WHERE id=$1 FOR UPDATE")) {
        return { rows: [state.invoice] };
      }
      if (sql.includes('SELECT "issueDate" FROM invoices')) {
        return { rows: [{ issueDate: "2026-10-20" }] };
      }
      if (sql.includes("COALESCE(SUM(amount),0)") && sql.includes("FROM payments")) {
        return { rows: [{ amount: state.paid }] };
      }
      if (sql.includes("COALESCE(SUM(amount),0)") && sql.includes("FROM receipts")) {
        return { rows: [{ amount: state.receipted || 0 }] };
      }
      if (sql.includes("INSERT INTO payments")) {
        state.insertedPayment = args;
        return { rows: [{ id: 77 }] };
      }
      if (sql.includes("SELECT * FROM clients")) {
        return { rows: [{ id: 4, name: "Client SRL" }] };
      }
      if (sql.includes('UPDATE invoices SET "paidAmount"')) {
        state.updatedInvoice = args;
        return { rows: [] };
      }
      if (sql.includes("INSERT INTO counters")) {
        return { rows: [{ lastNumber: 1 }] };
      }
      if (sql.includes("INSERT INTO receipts")) {
        state.insertedReceipt = args;
        return { rows: [{ id: 10 }] };
      }
      throw new Error(`Unexpected SQL in isolated test: ${sql}`);
    },
    release() {},
  };
  const pool = {
    connect: async () => connection,
    query: connection.query.bind(connection),
  };
  const repo = loadTypeScript("lib/accounting/repo.ts", {
    "/db": { ready: async () => pool },
    "/date": { bucharestDate: () => "2026-10-25" },
    "/ref": {
      createRefIncomeForPayment: async (entry) => refs.push(entry),
    },
  });

  state = {
    paid: 100,
    invoice: {
      id: 1,
      clientId: 4,
      status: "stornoed",
      invoiceType: "STANDARD",
      currency: "RON",
      total: 121,
      subtotal: 100,
      series: "NXT",
      number: 5,
      clientSnapshot: {},
    },
  };
  await repo.addPayment(1, 40, "2026-10-21", "bank", "", true);
  assert.equal(state.insertedPayment[1], -40);
  assert.deepEqual(state.updatedInvoice, [60, "stornoed", 1]);
  assert.equal(refs[0].amount, -40);

  state.paid = 60;
  await assert.rejects(
    () => repo.addPayment(1, 60.01, "2026-10-21", "bank", "", true),
    /depășește restul/,
  );
  await assert.rejects(
    () => repo.addPayment(1, 10, "2026-10-19", "bank", "", true),
    /ulterioară sau egală/,
  );
  await assert.rejects(
    () => repo.addPayment(1, 10, "2026-10-21", "crypto", "", true),
    /Metoda de plată/,
  );

  state = {
    paid: 100,
    receipted: 0,
    invoice: {
      id: 2,
      clientId: 4,
      status: "partial",
      invoiceType: "STANDARD",
      currency: "RON",
      total: 121,
      clientSnapshot: {},
    },
  };
  await assert.rejects(
    () => repo.createReceipt(2, "2026-10-21", 0.001),
    /cel puțin 0,01 RON/,
  );
  assert.equal(state.insertedReceipt, undefined);
}

(async () => {
  await testAnafLookup();
  await testRefundAndReceiptGuards();
  console.log(
    "Invoicing core tests passed: ANAF lookup, refunds, payment validation and receipt rounding. No network or real DB access.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
