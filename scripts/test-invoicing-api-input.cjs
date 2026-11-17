const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/accounting/invoice-input.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api, require() { throw new Error('Public JSON validation must have no I/O dependency.'); } });
const fixture = () => ({
  issuanceKey: '123e4567-e89b-42d3-a456-426614174000', series: 'FIX', clientId: 1, issueDate: '2026-11-17',
  dueDate: '2026-12-01', items: [{ description: 'Isolated fixture', qty: 1, unitPrice: 1.125, vatRate: 21 }],
});
const mapped = api.publicInvoiceInput({ ...fixture(), sendToAnafNow: true, anafEnvironment: 'test', total: 999 });
assert.equal(mapped.total, undefined); assert.equal(mapped.sendToAnafNow, undefined);
assert.equal(mapped.items[0].unitCode, 'H87'); assert.equal(mapped.items[0].unitPrice, 1.125);
for (const field of ['invoiceType', 'initialStatus', 'sellerSnapshot', 'clientSnapshot', 'originalInvoiceId', 'stornoReason', 'integrationSource', 'externalId', 'autoEfactura']) {
  assert.throws(() => api.publicInvoiceInput({ ...fixture(), [field]: 'injected' }), /interne/);
}
for (const field of ['clientId', 'discountPercent', 'exchangeRate']) for (const value of [true, '1', {}, Infinity, NaN]) {
  assert.throws(() => api.publicInvoiceInput({ ...fixture(), [field]: value }));
}
for (const field of ['qty', 'unitPrice', 'vatRate']) for (const value of [true, '1', {}, Infinity, NaN, null]) {
  const input = fixture(); input.items[0][field] = value;
  assert.throws(() => api.publicInvoiceInput(input));
}
for (const bad of [null, false, [], 'invoice', { ...fixture(), items: [] }, { ...fixture(), paidOnSpot: 'false' }, { ...fixture(), invoiceTypeCode: '381' }]) {
  assert.throws(() => api.publicInvoiceInput(bad));
}
assert.equal(api.publicOperationKey({ operationKey: fixture().issuanceKey }), fixture().issuanceKey);
for (const key of ['', 'short', '../unsafe/id', true, undefined, 'x'.repeat(161)]) assert.throws(() => api.publicOperationKey({ operationKey: key }));
console.log('Public accounting JSON guards passed: internal field injection, numeric/string confusion, invalid items and required operation idempotency keys. No I/O.');
