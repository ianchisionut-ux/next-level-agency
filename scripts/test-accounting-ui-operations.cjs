const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../components/accounting/pending-operation.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const records = new Map();
let sequence = 0;
const storage = {
  getItem: key => records.get(key) ?? null,
  setItem: (key, value) => records.set(key, value),
  removeItem: key => records.delete(key),
};
function load() {
  const context = { exports: {}, sessionStorage: storage, crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}` } };
  vm.runInNewContext(code, context, { filename: "pending-operation.js" });
  return context.exports;
}
let api = load();
const key = "invoice.123.payment";
const original = { amount: 100.01, date: "2026-11-17", method: "numerar" };
const first = api.pendingOperation(key, original);
assert.equal(sequence, 1);
assert.equal(api.readPendingOperation(key).operationKey, first.operationKey);
assert.deepEqual(JSON.parse(records.get(key)).payload, original);
// A lost response and page reload retain the operation identity and payload.
api = load();
assert.equal(api.readPendingOperation(key).operationKey, first.operationKey);
const retry = api.pendingOperation(key, original);
assert.equal(retry.operationKey, first.operationKey);
assert.equal(sequence, 1);
// Correcting a rejected request keeps the key; backend hashes prevent a
// changed retry from creating a second operation if the first committed.
const corrected = { ...original, amount: 99.99 };
const amended = api.pendingOperation(key, corrected);
assert.equal(amended.operationKey, first.operationKey);
assert.deepEqual(JSON.parse(records.get(key)).payload, corrected);
assert.equal(sequence, 1);
// Different invoices/actions never share a key.
const receipt = api.pendingOperation("invoice.123.receipt", { amount: 99.99 });
assert.notEqual(receipt.operationKey, first.operationKey);
api.completePendingOperation(key);
assert.equal(api.readPendingOperation(key), null);
assert.notEqual(api.pendingOperation(key, original).operationKey, first.operationKey);
records.set("corrupt", '{"operationKey":"invalid","payload":{}}');
assert.throws(() => api.pendingOperation("corrupt", original));
assert.equal(JSON.parse(records.get("corrupt")).operationKey, "invalid");
// If persistence fails, no usable request is returned to a caller to send.
storage.setItem = () => { throw new Error("storage unavailable"); };
assert.throws(() => api.pendingOperation("new", original), /storage unavailable/);
console.log("Accounting UI operation identity passed: persisted retry/reload, editable rejected payload with stable key, action isolation, completion rotation, corrupt/unavailable storage. No DB or HTTP access.");
