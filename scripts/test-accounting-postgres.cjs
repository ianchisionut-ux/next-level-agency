const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');

// Real PostgreSQL engine in memory. No environment credentials or network are
// available to these modules. The pool adapter preserves transaction ownership.
async function isolatedDatabase() {
  const engine = new PGlite();
  const statements = [];
  let tail = Promise.resolve();
  const lock = async () => {
    const previous = tail;
    let unlock;
    tail = new Promise(resolve => { unlock = resolve; });
    await previous;
    return unlock;
  };
  async function execute(sql, args = []) {
    statements.push(sql);
    const result = args.length ? await engine.query(sql, args) : (await engine.exec(sql)).at(-1) || { rows: [], fields: [] };
    for (const field of result.fields || []) {
      if (field.dataTypeID === 1700) for (const row of result.rows) if (row[field.name] !== null) row[field.name] = Number(row[field.name]);
    }
    return result;
  }
  const pool = {
    async query(sql, args) { const release = await lock(); try { return await execute(sql, args); } finally { release(); } },
    async connect() { const release = await lock(); return { query: execute, release }; },
  };
  const cache = new Map();
  const globals = {};
  function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const source = fs.readFileSync(absolute, 'utf8') + (file.endsWith('db.ts') ? '\nexport { ensureSchemaVersion as testUpgrade };\n' : '');
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    const safeRequire = id => {
      if (id === 'pg') return { Pool: function () { return pool; }, types: { getTypeParser() { return String; } } };
      if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), `${id}.ts`));
      if (id.startsWith('@/')) return load(path.resolve(`${id.slice(2)}.ts`));
      if (['node:crypto', 'node:fs/promises', 'node:path'].includes(id)) return require(id);
      throw new Error(`Unexpected dependency in isolated PostgreSQL test: ${id}`);
    };
    vm.runInNewContext(code, {
      module, exports: module.exports, require: safeRequire, global: globals,
      process: { env: { DATABASE_URL: 'postgresql://isolated.invalid/test', ANAF_ENVIRONMENT: 'test' }, cwd: () => process.cwd() },
      Buffer, console, setTimeout, clearTimeout,
      fetch() { throw new Error('Network is forbidden in the accounting integration test.'); },
    }, { filename: file });
    return module.exports;
  }
  return { engine, pool, statements, load };
}

async function main() {
  const db = await isolatedDatabase();
  try {
    const schema = db.load('lib/accounting/db.ts');
    await schema.ready();
    const query = db.pool.query;
    assert.equal((await query('SELECT version FROM accounting_schema_meta')).rows[0].version, 13);
    const beforeFastRead = db.statements.length;
    await schema.testUpgrade(db.pool);
    assert.equal(db.statements.length - beforeFastRead, 1, 'Warm schema check must not execute DDL or backfill');
    const fields = await query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_name='invoices' AND column_name='total'`);
    assert.equal(fields.rows[0].data_type, 'numeric');
    await query(`UPDATE company SET name='Isolated seller',cif='55476878',address='Test 1',city='Zalau',county='Salaj',"vatPayer"=1 WHERE id=1`);
    const buyer = (await query(`INSERT INTO clients (name,address,city,judet,cif,"clientType") VALUES ('Isolated buyer','Test 2','Zalau','Salaj','31321779','PJ') RETURNING id`)).rows[0].id;
    const repo = db.load('lib/accounting/repo.ts');
    const money = db.load('lib/accounting/money.ts');
    const input = key => ({
      issuanceKey: key.padEnd(24, '0'), series: 'FIX', clientId: buyer,
      issueDate: '2026-11-01', dueDate: '2026-11-30',
      items: [{ description: 'Isolated arithmetic fixture', um: 'buc', qty: 1, unitPrice: 1.125, vatRate: 21, vatCategoryCode: 'S' }],
    });
    const original = input('same-issuance');
    const ids = await Promise.all(Array.from({ length: 8 }, () => repo.createInvoice(original)));
    assert.ok(ids.every(id => id === ids[0]), 'Concurrent retry returns the same committed invoice');
    const id = ids[0];
    assert.equal((await query('SELECT COUNT(*)::int AS n FROM invoices')).rows[0].n, 1);
    const full = await repo.getInvoiceFull(id);
    assert.equal(full.invoice.subtotal, 1.13);
    assert.equal(full.invoice.vatTotal, 0.24);
    assert.equal(full.invoice.total, 1.37);
    money.assertInvoiceArithmetic(full);
    await assert.rejects(() => repo.createInvoice({ ...original, notes: 'changed after commit' }), /alte date/);
    await assert.rejects(() => repo.createInvoice({ ...input('invalid-currency'), currency: 'EUR', exchangeRate: 5 }), /RON/);
    await assert.rejects(() => repo.createInvoice({ ...input('invalid-zero'), discountPercent: 100 }), /pozitiv/);
    await assert.rejects(() => repo.createInvoice({ ...input('invalid-due'), dueDate: '2026-10-31' }), /anterioară/);
    await assert.rejects(() => repo.createInvoice({ ...input('invalid-overflow'), items: [{ ...original.items[0], qty: 1e308, unitPrice: 1e308 }] }));
    await assert.rejects(() => repo.deleteInvoice(id), /storno|șterse|sterse/i);
    const paymentKey = 'payment-isolated-retry-0001';
    await Promise.all(Array.from({ length: 8 }, () => repo.addPayment(id, 0.5, '2026-11-02', 'bank', 'Isolated partial', false, paymentKey)));
    assert.equal((await repo.getInvoiceFull(id)).invoice.paidAmount, 0.5);
    assert.equal((await query('SELECT COUNT(*)::int AS n FROM payments WHERE "invoiceId"=$1', [id])).rows[0].n, 1);
    await assert.rejects(() => repo.addPayment(id, 0.6, '2026-11-02', 'bank', 'Isolated partial', false, paymentKey), /alte date|diferit|folosit/);
    await assert.rejects(() => repo.addPayment(id, 0.88, '2026-11-03', 'bank', ''), /depășește/);
    await repo.addPayment(id, 0.87, '2026-11-03', 'bank', 'Isolated remainder');
    assert.equal((await repo.getInvoiceFull(id)).invoice.status, 'paid');
    const ref = (await query(`SELECT SUM("grossAmount") AS gross,SUM("netAmount") AS net,SUM("vatAmount") AS vat FROM ref_transactions WHERE "invoiceId"=$1`, [id])).rows[0];
    assert.equal(ref.gross, 1.37); assert.equal(ref.net, 1.13); assert.equal(ref.vat, 0.24);
    const creditInput = { originalInvoiceId: id, issueDate: '2026-11-04', reason: 'Isolated reversal' };
    const creditId = await repo.createStornoInvoice(creditInput);
    assert.equal(await repo.createStornoInvoice(creditInput), creditId, 'Storno retry is idempotent');
    const credit = await repo.getInvoiceFull(creditId);
    assert.equal(credit.invoice.total, -1.37);
    assert.equal(credit.items[0].valoare, -1.13);
    assert.equal(credit.items[0].vatValue, -0.24);
    money.assertInvoiceArithmetic(credit);
    const reversedSales = await repo.getSalesByProduct({ from: '2026-11-01', to: '2026-11-05' });
    const reversedProfit = await repo.getProfitByProduct({ from: '2026-11-01', to: '2026-11-05' });
    assert.equal(reversedSales.length, 1); assert.equal(reversedSales[0].qty, 0);
    assert.equal(reversedSales[0].total, 0); assert.equal(reversedSales[0].vat, 0);
    assert.equal(reversedProfit.length, 1); assert.equal(reversedProfit[0].qty, 0);
    assert.equal(reversedProfit[0].revenue, 0); assert.equal(reversedProfit[0].cost, 0); assert.equal(reversedProfit[0].profit, 0);
    const refundKey = 'refund-isolated-retry-0001';
    await Promise.all(Array.from({ length: 8 }, () => repo.addPayment(id, 1.37, '2026-11-05', 'bank', 'Isolated refund', true, refundKey)));
    assert.equal((await repo.getInvoiceFull(id)).invoice.paidAmount, 0);
    const refunded = (await query(`SELECT SUM("grossAmount") AS gross,SUM("netAmount") AS net,SUM("vatAmount") AS vat FROM ref_transactions WHERE "invoiceId"=$1`, [id])).rows[0];
    assert.deepEqual(refunded, { gross: 0, net: 0, vat: 0 });
    await assert.rejects(() => query(`UPDATE invoices SET total=999 WHERE id=$1`, [id]), /invoices_financial_invariants/);
    await assert.rejects(() => query(`INSERT INTO payments ("invoiceId",amount,date,method) VALUES ($1,'NaN','2026-11-05','bank')`, [id]), /payments_financial_bounds/);
    await assert.rejects(() => query(`INSERT INTO payments ("invoiceId",amount,date,method) VALUES ($1,0.001,'2026-11-05','bank')`, [id]), /payments_financial_bounds/);
    // A failed FK insert must also roll back the allocated document number.
    const counter = (await query(`SELECT "lastNumber" FROM counters WHERE series='FIX'`)).rows[0].lastNumber;
    await assert.rejects(() => repo.createInvoice({ ...input('invalid-product'), items: [{ ...original.items[0], productId: 999999 }] }), /foreign key/);
    assert.equal((await query(`SELECT "lastNumber" FROM counters WHERE series='FIX'`)).rows[0].lastNumber, counter);
    const cashId = await repo.createInvoice({ ...input('paid-on-spot'), paidOnSpot: true });
    assert.equal((await repo.getInvoiceFull(cashId)).invoice.paidAmount, 1.37);
    assert.equal((await query('SELECT COUNT(*)::int AS n FROM receipts WHERE "invoiceId"=$1', [cashId])).rows[0].n, 1);
    await assert.rejects(() => repo.createReceipt(cashId, '2026-11-02', 1.37), /depășește|integral|chitanț/);
    const receiptInvoice = await repo.createInvoice({ ...input('receipt-isolated-retry'), items: [{ ...original.items[0], unitPrice: 100 }] });
    await repo.addPayment(receiptInvoice, 50, '2026-11-02', 'numerar', 'Cash');
    const receiptKey = 'receipt-isolated-retry-0001';
    const receipts = await Promise.all(Array.from({ length: 8 }, () => repo.createReceipt(receiptInvoice, '2026-11-02', 25, 'Fixture', receiptKey)));
    assert.ok(receipts.every(receipt => receipt === receipts[0]));
    assert.equal((await query('SELECT COUNT(*)::int AS n FROM receipts WHERE "invoiceId"=$1', [receiptInvoice])).rows[0].n, 1);
    // Replaying the additive v12 upgrade preserves all amounts and REF entries.
    const snapshot = JSON.stringify((await query('SELECT id,subtotal,"vatTotal",total FROM invoices ORDER BY id')).rows);
    const refCount = (await query('SELECT COUNT(*)::int AS n FROM ref_transactions')).rows[0].n;
    // Recreate populated legacy v12 floating-point storage, then exercise the
    // actual conversion rather than merely replaying already-NUMERIC DDL.
    await query(`ALTER TABLE invoices DROP CONSTRAINT invoices_financial_invariants;
      ALTER TABLE invoices ALTER COLUMN subtotal TYPE DOUBLE PRECISION USING subtotal::double precision,
      ALTER COLUMN "vatTotal" TYPE DOUBLE PRECISION USING "vatTotal"::double precision,
      ALTER COLUMN total TYPE DOUBLE PRECISION USING total::double precision;`);
    await query('UPDATE accounting_schema_meta SET version=12');
    const upgradeStart = db.statements.length;
    await schema.testUpgrade(db.pool);
    assert.equal(JSON.stringify((await query('SELECT id,subtotal,"vatTotal",total FROM invoices ORDER BY id')).rows), snapshot);
    assert.equal((await query('SELECT COUNT(*)::int AS n FROM ref_transactions')).rows[0].n, refCount);
    assert.equal((await query(`SELECT data_type FROM information_schema.columns WHERE table_name='invoices' AND column_name='total'`)).rows[0].data_type, 'numeric');
    assert.ok(!db.statements.slice(upgradeStart).some(sql => /INSERT INTO ref_transactions/.test(sql)), 'Upgrade never replays historical REF backfill');
    // A failure after migration SQL must leave the schema version unchanged,
    // release its connection, and preserve every issued value for a safe retry.
    await query('UPDATE accounting_schema_meta SET version=12');
    const connect = db.pool.connect;
    db.pool.connect = async () => {
      const connection = await connect();
      return { release: connection.release, query(sql, args) {
        if (sql.includes('INSERT INTO accounting_schema_meta (id,version)')) throw new Error('Isolated migration failure');
        return connection.query(sql, args);
      } };
    };
    await assert.rejects(() => schema.testUpgrade(db.pool), /Isolated migration failure/);
    db.pool.connect = connect;
    assert.equal((await query('SELECT version FROM accounting_schema_meta')).rows[0].version, 12);
    assert.equal(JSON.stringify((await query('SELECT id,subtotal,"vatTotal",total FROM invoices ORDER BY id')).rows), snapshot);
    await schema.testUpgrade(db.pool);
    assert.equal((await query('SELECT version FROM accounting_schema_meta')).rows[0].version, 13);
    assert.ok((await query('SELECT COUNT(*)::int AS n FROM accounting_audit_events')).rows[0].n >= 7);
    const health = await db.load('lib/accounting/health.ts').getAccountingHealth();
    assert.equal(health.ok, true);
    assert.equal(health.schema.numericColumns, 16);
    assert.equal(health.schema.checkConstraints, 4);
    assert.equal(health.schema.uniqueValidIndexes, 3);
    assert.equal(health.financial.invoicesWithErrors, 0);
    // The diagnostic must detect a corrupt historical header without writing
    // documents or hiding the discrepancy behind the v13 version marker.
    await query('ALTER TABLE invoices DROP CONSTRAINT invoices_financial_invariants');
    await query('UPDATE invoices SET total=total+0.01 WHERE id=$1', [cashId]);
    const unhealthy = await db.load('lib/accounting/health.ts').getAccountingHealth();
    assert.equal(unhealthy.ok, false);
    assert.equal(unhealthy.financial.headerTotalsMismatches, 1);
    assert.equal(unhealthy.schema.checkConstraints, 3);
    console.log('Isolated PostgreSQL integration passed: schema migration, eight concurrent issuance retries, exact totals, payments/REF/refunds, storno, cash receipt, SQL constraints, transactional rollback and immutable history. No live database or ANAF requests.');
  } finally { await db.engine.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
