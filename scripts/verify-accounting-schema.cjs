// Explicit maintenance command. It upgrades schema through the same code as the
// app, then verifies existing financial rows. It never issues invoices/payments,
// creates clients, contacts ANAF, or prints environment variables or documents.
if (!process.argv.includes('--apply-schema')) {
  console.error('Use --apply-schema only for an explicitly authorized schema upgrade.');
  process.exit(2);
}
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const exportsObject = {};
const source = fs.readFileSync('lib/accounting/db.ts', 'utf8') + '\nexport { createPool as inspectionPool };';
const globals = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText, { exports: exportsObject, require, global: globals, process, console });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Missing database environment.');
  const pool = exportsObject.inspectionPool();
  globals.__facturarePool = pool;
  try {
    const beforeVersion = Number((await pool.query('SELECT version FROM accounting_schema_meta WHERE id=1')).rows[0]?.version || 0);
    if (beforeVersion < 10 || beforeVersion > 13) throw new Error('Unexpected existing schema version; review the migration before proceeding.');
    const queries = {
      invoices: 'SELECT id,series,number,"clientId","issueDate","dueDate",status,trim_scale("paidAmount"::text::numeric)::text AS "paidAmount",trim_scale(subtotal::text::numeric)::text AS subtotal,trim_scale("vatTotal"::text::numeric)::text AS "vatTotal",trim_scale(total::text::numeric)::text AS total,trim_scale("discountPercent"::text::numeric)::text AS "discountPercent",currency,trim_scale("exchangeRate"::text::numeric)::text AS "exchangeRate","invoiceType","originalInvoiceId","sellerSnapshot","clientSnapshot" FROM invoices ORDER BY id',
      items: 'SELECT id,"invoiceId",description,trim_scale(qty::text::numeric)::text AS qty,trim_scale("unitPrice"::text::numeric)::text AS "unitPrice",trim_scale("vatRate"::text::numeric)::text AS "vatRate",trim_scale(valoare::text::numeric)::text AS valoare,trim_scale("vatValue"::text::numeric)::text AS "vatValue" FROM invoice_items ORDER BY id',
      payments: 'SELECT id,"invoiceId",trim_scale(amount::text::numeric)::text AS amount,date,method,notes FROM payments ORDER BY id',
      receipts: 'SELECT id,series,number,"invoiceId","issueDate",trim_scale(amount::text::numeric)::text AS amount,cashier FROM receipts ORDER BY id',
      products: 'SELECT id,name,trim_scale(price::text::numeric)::text AS price,trim_scale(cost::text::numeric)::text AS cost,trim_scale("vatRate"::text::numeric)::text AS "vatRate" FROM products ORDER BY id',
      register: 'SELECT * FROM ref_transactions ORDER BY id',
    };
    async function snapshot() {
      const result = {};
      for (const [key, sql] of Object.entries(queries)) {
        const { rows } = await pool.query(sql);
        result[key] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
      }
      return result;
    }
    const before = await snapshot();
    await exportsObject.ready();
    const version = Number((await pool.query('SELECT version FROM accounting_schema_meta WHERE id=1')).rows[0].version);
    assert.equal(version, 13);
    const after = await snapshot();
    assert.deepEqual(after, before, 'Financial records changed during verification; investigate concurrent activity before concluding migration preservation.');
    const constraints = (await pool.query(`SELECT conname,convalidated FROM pg_constraint WHERE contype='c' AND conname IN ('invoices_financial_invariants','invoice_items_financial_bounds','payments_financial_bounds','receipts_financial_bounds')`)).rows;
    assert.equal(constraints.length, 4);
    const indexes = (await pool.query(`SELECT c.relname AS indexname,i.indisunique,i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('invoices_issuance_key','payments_operation_key','receipts_operation_key')`)).rows;
    assert.equal(indexes.length, 3);
    assert.ok(indexes.every(index => index.indisunique && index.indisvalid));
    const storage = (await pool.query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND ((table_name='products' AND column_name IN ('price','cost','vatRate')) OR (table_name='invoices' AND column_name IN ('paidAmount','subtotal','vatTotal','total','discountPercent','exchangeRate')) OR (table_name='invoice_items' AND column_name IN ('qty','unitPrice','vatRate','valoare','vatValue')) OR (table_name IN ('payments','receipts') AND column_name='amount'))`)).rows;
    assert.equal(storage.length, 16); assert.ok(storage.every(column => column.data_type === 'numeric'));
    const legacy = (await pool.query(`SELECT COUNT(*)::int AS count FROM invoices WHERE total <> subtotal+"vatTotal" OR "paidAmount"<0 OR "paidAmount">abs(total) OR total<>round(total,2)`)).rows[0].count;
    const money = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/accounting/money.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: money, require() { throw new Error('Financial audit cannot perform I/O.'); } });
    const invoices = (await pool.query('SELECT id,subtotal,"vatTotal",total,"paidAmount","invoiceType","invoiceTypeCode" FROM invoices')).rows;
    const items = (await pool.query('SELECT "invoiceId",qty,"unitPrice","vatRate",valoare,"vatValue","vatCategoryCode" FROM invoice_items')).rows;
    const financialErrors = invoices.filter(invoice => money.financialValidationErrors({ invoice, items: items.filter(item => item.invoiceId === invoice.id) }).length > 0).length;
    const report = { verifiedAt: new Date().toISOString(), schemaBefore: beforeVersion, schemaAfter: version, financialRowsUnchanged: true, snapshot: after, requiredConstraints: constraints.length, idempotencyIndexes: indexes.length, numericColumns: storage.length, legacyInvariantIssues: legacy, invoicesWithFinancialErrors: financialErrors, invoicesCreated: 0, anafRequests: 0 };
    console.log(JSON.stringify(report, null, 2));
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Schema verification failed.'); process.exitCode = 1; });
