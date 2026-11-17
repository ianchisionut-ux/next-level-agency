const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Pure-module sandbox. Accidentally introducing any I/O dependency fails here.
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/accounting/money.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: api, require(id) { throw new Error(`No dependency allowed: ${id}`); } });
const { roundMoney, calculateInvoiceTotals, financialValidationErrors, assertInvoiceArithmetic,
  addMoney, subtractMoney, prorateMoney, convertMoney } = api;

const item = (price, rate = 21, qty = 1, category = rate ? "S" : "O") => ({
  description: "Isolated mathematical fixture", qty, unitPrice: price, vatRate: rate, vatCategoryCode: category,
});
const cents = n => BigInt(Math.round(n * 100));
// Independent integer oracle: nearest integer, with exactly-half ties away from zero.
const oracle = (numerator, denominator) => (numerator < 0n ? -1n : 1n) *
  ((2n * (numerator < 0n ? -numerator : numerator) + denominator) / (2n * denominator));

for (const [input, expected] of [
  [1.005, 1.01], [-1.005, -1.01], [1.125, 1.13], [-1.125, -1.13],
  [2.675, 2.68], [-2.675, -2.68], [0.005, 0.01], [-0.005, -0.01],
  [0.0049, 0], [-0.0049, 0], ["1.230000000", 1.23], ["1.005e2", 100.5],
  ["1005e-3", 1.01], ["999999999999.99", 999999999999.99],
]) assert.equal(roundMoney(input), expected, `Decimal rounding ${input}`);
assert.equal(Object.is(roundMoney(-0.0001), -0), false);
assert.equal(addMoney(0.1, 0.2, 0.3), 0.6);
assert.equal(subtractMoney(1.13, 1.12), 0.01);
assert.equal(prorateMoney(121, 100, 121), 100);
assert.equal(prorateMoney(-60.5, 100, 121), -50);
assert.equal(convertMoney(100, 5), 500);
assert.equal(convertMoney("1.005", "5"), 5.03);
assert.throws(() => prorateMoney(1, 1, 0), /zero/);
assert.throws(() => convertMoney(100, -5), /limitele/);
for (const invalid of [NaN, Infinity, -Infinity, "", "NaN", "1e100000", "1,01", null, {}, true]) {
  assert.throws(() => roundMoney(invalid), undefined, `Reject ${String(invalid)}`);
}
assert.throws(() => roundMoney("1000000000000"), /limita/);

const tiny = calculateInvoiceTotals(Array.from({ length: 1000 }, () => item(0.02)));
assert.equal(tiny.subtotal, 20);
assert.equal(tiny.vatTotal, 4.2);
assert.equal(tiny.total, 24.2);
assert.equal(tiny.computed.filter(line => line.vatValue === 0.01).length, 420);
assert.equal(tiny.computed.filter(line => line.vatValue === 0).length, 580);
assert.ok(tiny.computed.slice(0, 420).every(line => line.vatValue === 0.01), "Stable first-index tie break");
const tinyCredit = calculateInvoiceTotals(Array.from({ length: 1000 }, () => item(-0.02)));
tiny.computed.forEach((line, index) => assert.equal(line.vatValue + tinyCredit.computed[index].vatValue, 0));

const mixed = calculateInvoiceTotals([item(10, 21), item(10, 11), item(10, 0, 1, "Z")], 10);
assert.equal(mixed.subtotal, 27);
assert.equal(mixed.vatTotal, 2.88);
assert.equal(mixed.total, 29.88);
const free = calculateInvoiceTotals([item(10)], 100);
assert.equal(free.total, 0); // Repository policy separately rejects zero-value issuance.

for (const bad of [
  [], Array.from({ length: 1001 }, () => item(1)), [item(1, 21, 0)], [item(1, 21, -1)],
  [item(1, 21, Infinity)], [item(1e308, 21, 1e308)], [item(1, 101)], [item(1, -1)],
  [item(1, 21, 1, "BAD")], [item(1, 0, 1, "S")], [item(1, 21, 1, "O")],
  [item(1, 21, "0.0000001")], [item("0.0000000001")], [item(1), item(-1)],
]) assert.throws(() => calculateInvoiceTotals(bad));
assert.throws(() => calculateInvoiceTotals([item(1)], 100.01));
assert.throws(() => calculateInvoiceTotals([item(1)], -0.01));
assert.throws(() => calculateInvoiceTotals([item(1)], NaN));

// Deterministic randomized arithmetic, independently derived from integer units.
let seed = 172913;
function random(max) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; }
let randomizedLines = 0;
for (let caseIndex = 0; caseIndex < 2000; caseIndex++) {
  const discountBasisPoints = random(10001);
  const fixture = [];
  const expectedBases = [];
  const rates = [];
  const expectedGroups = new Map();
  for (let index = 0, count = random(20) + 1; index < count; index++) {
    const q = random(10000) + 1;
    const p = random(500000) + 1;
    const rate = [0, 11, 21][random(3)];
    const base = oracle(BigInt(q) * BigInt(p) * BigInt(10000 - discountBasisPoints), 100000000n);
    fixture.push(item(p / 1000, rate, q / 1000));
    expectedBases.push(base); rates.push(rate);
    expectedGroups.set(rate, (expectedGroups.get(rate) || 0n) + base);
  }
  const calculated = calculateInvoiceTotals(fixture, discountBasisPoints / 100);
  const expectedSubtotal = expectedBases.reduce((sum, base) => sum + base, 0n);
  const expectedVat = [...expectedGroups].reduce((sum, [rate, base]) => sum + oracle(base * BigInt(rate), 100n), 0n);
  assert.equal(cents(calculated.subtotal), expectedSubtotal, `Random base ${caseIndex}`);
  assert.equal(cents(calculated.vatTotal), expectedVat, `Random tax ${caseIndex}`);
  assert.equal(cents(calculated.total), expectedSubtotal + expectedVat, `Random total ${caseIndex}`);
  calculated.computed.forEach((line, index) => assert.equal(cents(line.valoare), expectedBases[index]));
  const credit = calculateInvoiceTotals(fixture.map(line => ({ ...line, unitPrice: -line.unitPrice })), discountBasisPoints / 100);
  calculated.computed.forEach((line, index) => {
    assert.equal(line.valoare + credit.computed[index].valoare, 0, `Reverse line base ${caseIndex}/${index}`);
    assert.equal(line.vatValue + credit.computed[index].vatValue, 0, `Reverse line tax ${caseIndex}/${index}`);
  });
  for (const [rate, base] of expectedGroups) {
    const allocated = calculated.computed.reduce((sum, line, index) => sum + (rates[index] === rate ? cents(line.vatValue) : 0n), 0n);
    assert.equal(allocated, oracle(base * BigInt(rate), 100n));
  }
  randomizedLines += fixture.length;
}

const validFull = {
  invoice: { subtotal: "100.00", vatTotal: "21.00", total: "121.00", paidAmount: "21.00", invoiceType: "STANDARD" },
  items: [{ ...item(100), valoare: "100.00", vatValue: "21.00" }],
};
assert.equal(financialValidationErrors(validFull).length, 0);
assert.doesNotThrow(() => assertInvoiceArithmetic(validFull));
const validCredit = {
  invoice: { subtotal: -100, vatTotal: -21, total: -121, paidAmount: 0, invoiceType: "STORNO" },
  items: [{ ...item(-100), valoare: -100, vatValue: -21 }],
};
assert.equal(financialValidationErrors(validCredit).length, 0);
const invalidFull = { ...validFull, invoice: { ...validFull.invoice, subtotal: 1, vatTotal: 0, total: 1 } };
assert.ok(financialValidationErrors(invalidFull).some(error => error.includes("Subtotalul")));
assert.throws(() => assertInvoiceArithmetic(invalidFull));
assert.ok(financialValidationErrors({ ...validFull, invoice: { ...validFull.invoice, total: "121.001" } }).length > 0);
assert.ok(financialValidationErrors({ ...validFull, invoice: { ...validFull.invoice, paidAmount: 121.01 } }).length > 0);
assert.ok(financialValidationErrors({ ...validCredit, invoice: { ...validCredit.invoice, paidAmount: 1 } }).length > 0);
assert.ok(financialValidationErrors({ invoice: { subtotal: 20, vatTotal: 0, total: 20 }, items: Array.from({ length: 1000 }, () => ({ ...item(0.02), valoare: 0.02, vatValue: 0 })) }).some(error => error.includes("agregate")));

console.log(`Exact accounting arithmetic passed: decimal ties, signed storno reversal, aggregate VAT allocation, bounds, stored identities and ${2000} randomized invoices (${randomizedLines} lines), each with its credit reversal. No DB or HTTP access.`);
