const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require(id) { if (dependencies[id]) return dependencies[id]; throw new Error(`Unexpected dependency ${id}`); } });
  return exports;
}
const money = load('lib/accounting/money.ts', {});
let expenses = [], sales = [], vatRows = [], classifications = [];
const queries = [];
const company = { name: 'Isolated mathematical fixture', cif: '12345678', address: 'Fixture 1', bank: 'Fixture bank', iban: 'RO00FIXTURE', vatPayer: 1, vatIncasare: 0 };
const settings = { declarantLastName: 'Fixture', declarantFirstName: 'Fixture', declarantFunction: 'Administrator', caen: '7311', fiscalPeriodType: 'L', profileConfirmedAt: '2026-11-17', proRata: 100 };
const pool = { async query(sql) {
  queries.push(sql);
  if (!sql.trim().startsWith('SELECT')) throw new Error('Mutation forbidden in mathematical tests');
  if (sql.includes('FROM company WHERE id=1')) return { rows: [company] };
  if (sql.includes('GROUP BY ii."vatRate"')) return { rows: vatRows };
  if (sql.includes('GROUP BY 1,2,3')) return { rows: [] };
  if (sql.includes('SELECT i.id,')) return { rows: sales };
  if (sql.includes("WHERE type='EXPENSE'")) return { rows: expenses };
  if (sql.includes('as "collectedVat"')) return { rows: [{ collectedVat: 0 }] };
  if (sql.includes('COUNT(*)::int as total')) return { rows: [{ total: 0, validated: 0, errors: 0 }] };
  if (sql.includes('FROM tax_declaration_settings')) return { rows: [settings] };
  if (sql.includes('FROM tax_declaration_classifications')) return { rows: classifications };
  if (sql.includes('FROM tax_declaration_periods')) return { rows: [] };
  throw new Error(`Unexpected query ${sql}`);
} };
const api = load('lib/accounting/declarations.ts', {
  './db': { ready: async () => pool }, './money': money,
  './anaf-official-forms': { getOfficialAnafForms: () => [] },
});
const expense = (id, net, vat, deductibilityPercent = 100) => ({ id, partnerName: 'Fixture partner', partnerCif: '12345678', partnerCountryCode: 'RO', documentType: 'FACTURA', documentNumber: `TEST-${id}`, grossAmount: money.addMoney(net, vat), netAmount: net, vatAmount: vat, deductibilityPercent, fiscalCategory: 'DEDUCTIBLE_EXPENSE', vatRate: 21 });

(async () => {
  expenses = [expense(1, 100, 20.15, 50)];
  let report = await api.getDeclarationPeriod(2026, 11);
  assert.equal(report.d394.purchases[0].deductibleVat, 10.08, '20.15 × 50% must round exactly once to 10.08');
  assert.equal(report.d300.inputVat, 10.08);
  expenses = Array.from({ length: 100 }, (_, index) => expense(index + 1, 0.49, 0.1));
  report = await api.getDeclarationPeriod(2026, 11);
  assert.equal(report.d300.inputVat, 10);
  const d300 = await api.generateOfficialD300Xml(2026, 11);
  assert.match(d300, /R22_1="49"/);
  assert.match(d300, /R22_2="10"/);
  assert.match(d300, /R28_2="10"/);
  assert.ok(!/R22_1="0"/.test(d300));

  expenses = [];
  const sale = (id, taxableBase) => ({ id, partnerName: 'Fixture EU partner', partnerCif: 'DE123456789', countryCode: 'DE', taxableBase, vat: 0, gross: taxableBase });
  sales = [sale(1, 0.6), sale(2, 0.6)];
  classifications = [{ sourceKey: 'INVOICE:1', operationCode: 'L' }, { sourceKey: 'INVOICE:2', operationCode: 'L' }];
  let d390 = await api.generateOfficialD390Xml(2026, 11);
  assert.match(d390, /nrOPI="1"/);
  assert.match(d390, /total_baza="1"/);
  assert.match(d390, /baza="1"/);
  sales = [sale(1, 0.3), sale(2, 0.3)];
  report = await api.getDeclarationPeriod(2026, 11);
  assert.equal(report.d390.ready, true, 'Positive group must not be blocked by document-level whole-leu rounding');
  d390 = await api.generateOfficialD390Xml(2026, 11);
  assert.match(d390, /total_baza="1"/);
  sales = [sale(1, 0.3)];
  report = await api.getDeclarationPeriod(2026, 11);
  assert.equal(report.d390.ready, false, 'Zero whole-leu group remains blocked');
  await assert.rejects(() => api.generateOfficialD390Xml(2026, 11), /blocat/);

  sales = []; classifications = [];
  vatRows = [{ vatRate: 21, documentCount: 1, taxableBase: -2.5, vat: -0.5 }];
  const creditD300 = await api.generateOfficialD300Xml(2026, 11);
  assert.match(creditD300, /R9_1="-3"/);
  assert.match(creditD300, /R9_2="-1"/);
  assert.ok(queries.some(sql => sql.includes('ROUND(COALESCE(SUM(ii.valoare * i."exchangeRate"),0),2)')));
  assert.ok(queries.some(sql => sql.includes('ROUND(i.subtotal*i."exchangeRate",2)')));
  console.log('Declaration math tests passed: exact deductibility, cents aggregation before whole-RON output, grouped D390, signed credits and SQL decimal FX rounding. No network or real DB access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
