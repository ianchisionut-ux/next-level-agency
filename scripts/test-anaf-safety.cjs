const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createHash } = require('node:crypto');
const { zipSync, strToU8 } = require('fflate');

// All SQL and HTTP below are isolated fakes. No credentials, database, or
// network are used; an unexpected request fails the test immediately.
function compile(file, context) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, ...context });
  return exports;
}
const money = compile('lib/accounting/money.ts', { require(id) { throw new Error(`Unexpected dependency ${id}`); } });
const fixture = (id = 1) => ({
  invoice: { id, series: 'SAFE', number: id, invoiceType: 'STANDARD', invoiceTypeCode: '380', status: 'issued', currency: 'RON', issueDate: '2026-11-17', dueDate: '2026-12-01', subtotal: 0.5, vatTotal: 0, total: 0.5, paidAmount: 0 },
  company: { name: 'Isolated fixture', cif: '12345678', address: 'Fixture 1', city: 'Zalau', county: 'Salaj', vatPayer: 0, countryCode: 'RO' },
  client: { name: 'Fixture client', clientType: 'PF', cnp: '', cif: '', address: 'Fixture 2', city: 'Zalau', judet: 'Salaj', countryCode: 'RO', vatPayer: 0 },
  items: [{ description: 'Fixture service', qty: 1000000, unitPrice: 0.0000005, valoare: 0.5, vatValue: 0, vatRate: 0, vatCategoryCode: 'O', unitCode: 'H87', taxExemptionReason: 'Neînregistrat în scopuri de TVA conform art. 316.' }],
});
function sandbox(options = {}) {
  const queries = [], requests = [], records = new Map();
  let leased = 0, maximumLeased = 0;
  const execute = async (sql, args = []) => {
    queries.push({ sql, args });
    if (options.query) { const result = await options.query(sql, args); if (result !== undefined) return result; }
    if (sql.includes('SELECT id,"uploadId",status')) return { rows: records.has(args[0]) ? [records.get(args[0])] : [] };
    if (sql.includes('SELECT "anafApprovedEnvironment"')) return { rows: [{ anafApprovedEnvironment: 'production' }] };
    if (sql.includes('SELECT * FROM anaf_connections')) return { rows: [{ accessToken: 'FAKE', expiresAt: '2099-01-01', refreshToken: '' }] };
    if (sql.includes('SELECT "expiresAt",(COALESCE')) return { rows: [{ expiresAt: '2099-01-01', refreshAvailable: false }] };
    if (sql.includes('COALESCE(MAX')) return { rows: [{ attempt: 1 }] };
    if (sql.includes('INSERT INTO efactura_submissions') && sql.includes("'UPLOADING'")) {
      records.set(args[0], { id: args[0], status: 'UPLOADING', uploadId: '' }); return { rows: [{ id: args[0] }] };
    }
    if (sql.includes('COUNT(*) AS count FROM anaf_connections')) return { rows: [{ count: 1 }] };
    return { rows: [] };
  };
  const pool = {
    async query(sql, args) { assert.ok(leased < 5, 'A sixth pool checkout would deadlock'); return execute(sql, args); },
    async connect() {
      assert.ok(leased < 5, 'A sixth connection would deadlock'); leased++; maximumLeased = Math.max(maximumLeased, leased);
      return { query: execute, release() { leased--; } };
    },
  };
  const api = compile('lib/accounting/efactura.ts', {
    process: { env: { ANAF_ENVIRONMENT: 'production', ANAF_CLIENT_ID: 'FAKE', ANAF_CLIENT_SECRET: 'FAKE' } },
    Buffer, AbortSignal, URLSearchParams, console,
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      if (options.fetch) return options.fetch(String(url), init);
      if (String(url).includes('/validare/')) return new Response(JSON.stringify({ stare: 'ok' }), { status: 200 });
      if (String(url).includes('/upload')) return new Response('<header index_incarcare="123"/>', { status: 200 });
      throw new Error(`Unexpected HTTP request: ${url}`);
    },
    require(id) {
      if (id.endsWith('/db')) return { ready: async () => pool };
      if (id.endsWith('/crypto')) return { encrypt: String, decrypt: String };
      if (id.endsWith('/money')) return money;
      if (id.endsWith('/date')) return { bucharestDate: () => '2026-11-17' };
      if (id.endsWith('/repo')) return { getInvoiceFull: async (invoiceId, connection) => {
        if (options.assertTransaction) assert.ok(connection, 'Transaction reads must share the held connection');
        return options.full ? options.full(invoiceId) : fixture(invoiceId);
      } };
      if (['node:crypto', 'node:zlib', 'fflate', 'fast-xml-parser'].includes(id)) return require(id);
      throw new Error(`Unexpected dependency ${id}`);
    },
  });
  return { api, queries, requests, records, maximumLeased: () => maximumLeased };
}

(async () => {
  const { api } = sandbox();
  assert.equal(api.anafTransmissionDeadline('2026-04-09'), '2026-04-20');
  assert.equal(api.anafTransmissionDeadline('2026-12-24'), '2027-01-04');
  assert.equal(api.anafTransmissionDeadline('2026-01-05'), '2026-01-14');
  assert.throws(() => api.anafTransmissionDeadline('2026-02-30'), /validă/);
  const xml = api.generateEFacturaXml(fixture());
  assert.ok(xml.includes('<cbc:CompanyID>0000000000000</cbc:CompanyID>'));
  assert.ok(xml.includes('<cbc:PriceAmount currencyID="RON">0.50</cbc:PriceAmount><cbc:BaseQuantity unitCode="H87">1000000</cbc:BaseQuantity>'));
  const corrupt = fixture(); corrupt.invoice.total = 1;
  assert.throws(() => api.generateEFacturaXml(corrupt), /total|Total/);
  const fx = fixture(); fx.invoice.currency = 'EUR';
  assert.throws(() => api.generateEFacturaXml(fx), /valută/);
  const badDate = fixture(); badDate.invoice.issueDate = '2026-02-30';
  assert.throws(() => api.generateEFacturaXml(badDate), /Data emiterii/);

  let entered = 0, releaseGate;
  const gate = new Promise(resolve => { releaseGate = resolve; });
  const concurrent = sandbox({ assertTransaction: true, fetch: async url => {
    if (url.includes('/validare/')) { if (++entered === 5) releaseGate(); await gate; return new Response('{"stare":"ok"}'); }
    assert.ok(url.includes('/uploadb2c?standard=UBL&cif=12345678'));
    return new Response('<header index_incarcare="123"/>');
  } });
  const results = await Promise.all([1, 2, 3, 4, 5].map(id => concurrent.api.submitEFactura(id, 'ignored', 'ignored')));
  assert.equal(concurrent.maximumLeased(), 5);
  assert.ok(results.every(result => result.status === 'PROCESSING'));
  assert.equal(concurrent.requests.length, 10);

  const credit = fixture(10);
  credit.originalInvoice = fixture(1).invoice;
  Object.assign(credit.invoice, { invoiceType: 'STORNO', invoiceTypeCode: '381', originalInvoiceId: 1, status: 'storno', subtotal: -0.5, total: -0.5 });
  Object.assign(credit.items[0], { unitPrice: -0.0000005, valoare: -0.5 });
  const creditSend = sandbox({ full: () => credit, query(sql) {
    if (sql.includes('SELECT status FROM efactura_submissions')) return { rows: [{ status: 'VALIDATED' }] };
  } });
  await creditSend.api.submitEFactura(10, '', '');
  assert.ok(creditSend.requests[0].url.endsWith('/validare/FCN'));
  assert.ok(creditSend.requests[1].url.includes('/uploadb2c?standard=CN&'));
  const blockedCredit = sandbox({ full: () => credit });
  await assert.rejects(() => blockedCredit.api.submitEFactura(10, '', ''), /inițială trebuie validată/);
  assert.equal(blockedCredit.requests.length, 0);

  const rejected = sandbox({ fetch: async () => new Response('{"stare":"nok","Messages":[{"message":"CIUS fixture rejected"}]}') });
  await assert.rejects(() => rejected.api.sendInvoiceToAnaf(1), /CIUS fixture rejected/);
  assert.equal(rejected.requests.length, 1);
  assert.ok(!rejected.queries.some(q => q.sql.includes("VALUES ($1,'UPLOADING'")));
  assert.equal(rejected.queries.find(q => q.sql.includes("VALUES ($1,'ERROR'")).args[4], 0);

  const unavailable = sandbox({ fetch: async () => { throw new TypeError('Offline fixture'); } });
  await assert.rejects(() => unavailable.api.sendInvoiceToAnaf(1), /nu a fost transmisă/);
  assert.equal(unavailable.queries.find(q => q.sql.includes("VALUES ($1,'ERROR'")).args[4], 1);

  const uncertain = sandbox({ fetch: async url => {
    if (url.includes('/validare/')) return new Response('{"stare":"ok"}');
    throw new TypeError('Upload response lost');
  } });
  await assert.rejects(() => uncertain.api.submitEFactura(1, '', ''), /Upload response lost/);
  const uncertainWrite = uncertain.queries.find(q => q.sql.includes('status=$4,message=$1'));
  assert.equal(uncertainWrite.args[3], 'UNCERTAIN');
  assert.equal(uncertainWrite.args[1], 0);

  const blocked = sandbox({ query(sql) {
    if (sql.includes('SELECT i.id,i.series')) return { rows: [{ id: 1, series: 'SAFE', number: 1, issueDate: '2026-11-01', status: 'UNCERTAIN', retryable: 0 }] };
  } });
  const state = await blocked.api.processAutomaticEFactura();
  assert.equal(state.backlog.blocked, 1);
  const finalState = blocked.queries.filter(q => q.sql.includes('INSERT INTO efactura_automation_state')).at(-1);
  assert.equal(finalState.args[0], 'BLOCKED');
  const candidateQuery = blocked.queries.find(q => q.sql.includes('SELECT i.id FROM invoices i'));
  assert.ok(candidateQuery.sql.includes('"checkedAt","nextAttemptAt"'));
  assert.ok(candidateQuery.sql.includes("'stornoed'"));

  const originalXml = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>ISOLATED</ID></Invoice>';
  const signatureXml = '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:SignedInfo/><ds:SignatureValue>ISOLATED-NOT-A-REAL-SIGNATURE</ds:SignatureValue></ds:Signature>';
  const archive = Buffer.from(zipSync({ 'invoice.xml': strToU8(originalXml), 'semnatura.xml': strToU8(signatureXml) }, { level: 0 }));
  const hash = createHash('sha256').update(archive).digest('hex');
  const cached = sandbox({ query(sql) { if (sql.includes('UNION ALL SELECT "archiveZip"')) return { rows: [{ archiveZip: archive, archiveSha256: hash }] }; } });
  assert.deepEqual((await cached.api.downloadAnafMessage('123')).buffer, archive);
  assert.equal(cached.requests.length, 0);
  const archiveDownload = sandbox({ fetch: async url => {
    assert.ok(url.includes('/descarcare?id=123'));
    return new Response(archive, { headers: { 'Content-Type': 'application/zip' } });
  } });
  assert.deepEqual((await archiveDownload.api.downloadAnafMessage('123')).buffer, archive);
  const archiveWrites = archiveDownload.queries.filter(q => q.sql.startsWith('UPDATE efactura_'));
  assert.equal(archiveWrites.length, 2);
  assert.ok(archiveWrites.every(q => q.args[1] === hash && Buffer.isBuffer(q.args[0])));
  const damaged = sandbox({ query(sql) { if (sql.includes('UNION ALL SELECT "archiveZip"')) return { rows: [{ archiveZip: archive, archiveSha256: 'damaged' }] }; } });
  await assert.rejects(() => damaged.api.downloadAnafMessage('123'), /integritate/);

  async function rejectArchive(bytes, message) {
    const isolated = sandbox({ fetch: async () => new Response(bytes) });
    await assert.rejects(() => isolated.api.downloadAnafMessage('123'), message || /Arhiva ANAF nu este validă/);
    assert.equal(isolated.queries.filter(q => q.sql.startsWith('UPDATE efactura_')).length, 0, 'Invalid ZIP must never be persisted');
  }
  await rejectArchive(Buffer.from('PK\x03\x04'));
  await rejectArchive(archive.subarray(0, archive.length - 8));
  const corruptedData = Buffer.from(archive);
  const firstData = 30 + corruptedData.readUInt16LE(26) + corruptedData.readUInt16LE(28);
  corruptedData[firstData] ^= 1;
  await rejectArchive(corruptedData, /CRC32/);
  await rejectArchive(Buffer.from(zipSync({ 'invoice.xml': strToU8(originalXml), 'response.xml': strToU8('<response/>') })), /semnăturii/);
  await rejectArchive(Buffer.from(zipSync({ '../invoice.xml': strToU8(originalXml), 'semnatura.xml': strToU8(signatureXml) })), /cale nesigură/);
  await rejectArchive(Buffer.from(zipSync(Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`${index}.xml`, strToU8('<fixture/>')])))), /100 de intrări/);
  const oversizedMetadata = Buffer.from(archive);
  const central = oversizedMetadata.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  oversizedMetadata.writeUInt32LE(31 * 1024 * 1024, central + 24);
  await rejectArchive(oversizedMetadata, /30 MB/);
  const dishonestDeflate = Buffer.from(zipSync({ 'invoice.xml': strToU8('<Invoice>' + 'X'.repeat(1024 * 1024) + '</Invoice>'), 'semnatura.xml': strToU8(signatureXml) }));
  const dishonestCentral = dishonestDeflate.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  dishonestDeflate.writeUInt32LE(1, dishonestCentral + 24);
  dishonestDeflate.writeUInt32LE(1, 22);
  await rejectArchive(dishonestDeflate, /decomprimat în siguranță/);
  await rejectArchive(Buffer.from(zipSync({ 'invoice.xml': strToU8('<Invoice>'), 'semnatura.xml': strToU8(signatureXml) })), /XML malformat/);

  const status = sandbox({ query(sql) {
    if (sql.includes('SELECT "expiresAt","connectedAt"')) return { rows: [{ expiresAt: '2020-01-01', refreshAvailable: true }] };
  } });
  const connection = await status.api.getAnafConnectionStatus();
  assert.equal(connection.connected, false);
  assert.equal(connection.canAttempt, true);
  assert.equal(connection.tokenStatus, 'EXPIRED_REFRESHABLE');
  assert.equal(status.requests.length, 0);
  assert.ok(status.queries.every(q => !/^\s*(UPDATE|INSERT|DELETE)/.test(q.sql)));
  console.log('ANAF safety tests passed: exact XML guards, deadlines, five concurrent senders, preflight rejection/outage, uncertain uploads, blocked backlog, archives and read-only token status. No network or real database access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
