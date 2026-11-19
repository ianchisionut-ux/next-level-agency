const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const ts = require('typescript');
const React = require('react');
const file = 'app/chestionar-site-prezentare/SimplePresentationForm.tsx';
const source = fs.readFileSync(file, 'utf8');
const baseline = cp.execFileSync('git', ['show', `88b1ee7:${file}`], { encoding: 'utf8' });
const parse = value => ts.createSourceFile(file, value, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
function contract(value) {
  const tree = parse(value), result = { choices: [] };
  const print = node => printer.printNode(ts.EmitHint.Unspecified, node, tree);
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ['initialState', 'canContinue'].includes(node.name.getText(tree))) result[node.name.getText(tree)] = print(node.initializer);
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'options' && ts.isArrayLiteralExpression(node.initializer.expression)) result.choices.push(print(node.initializer.expression));
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'JSON.stringify') result.payload = print(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(tree); return result;
}
assert.deepEqual(contract(source), contract(baseline), 'Defaults, all option values, required fields and outgoing payload must match the original');
assert.ok(!source.includes('<aside'), 'Old visual guide is removed');
assert.ok(source.includes('icons={stepIcons}'), 'The four-step flow uses its own matching pictograms');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function harness({ step = 0, data = {}, response = true } = {}) {
  const state = [step, { companyName: 'Afacere locală de test', activity: 'Servicii', contactName: 'Test local', contactPhone: '0700000000', contactEmail: '', pages: ['Acasă', 'Despre noi', 'Servicii', 'Contact'], languages: 'Doar în română', contactElements: ['Formular de contact'], ctaGoals: [], ...data }, 'idle'];
  let index = 0, refs = [], refIndex = 0, resolveRequest;
  const requests = [];
  const react = { ...React, useState(initial) { const position = index++; if (state[position] === undefined) state[position] = initial; return [state[position], value => { state[position] = typeof value === 'function' ? value(state[position]) : value; }]; }, useRef(value) { const position = refIndex++; return refs[position] ||= { current: value }; }, useEffect() {} };
  const exports = {};
  vm.runInNewContext(code, { exports, fetch(url, options) { requests.push({ url, ...options }); return new Promise(resolve => { resolveRequest = () => resolve({ ok: response }); }); }, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('AuditChoices')) return new Proxy({}, { get: (_, key) => props => React.createElement('div', { 'data-part': key }, props.children) });
    throw new Error(name);
  } });
  const render = () => { index = refIndex = 0; return exports.default(); };
  const find = (node, predicate) => node && typeof node === 'object' ? predicate(node) ? node : React.Children.toArray(node.props?.children).map(child => find(child, predicate)).find(Boolean) : undefined;
  return { state, requests, render, submit() { const tree = render(); return find(tree, node => node.type === 'button' && node.props.onClick?.name === 'submit').props.onClick(); }, finish() { resolveRequest(); } };
}
(async () => {
  for (let step = 0; step < 4; step++) {
    const test = harness({ step });
    const html = require('react-dom/server').renderToStaticMarkup(test.render());
    assert.ok(html.includes('audit-panel') && html.includes('audit-step-heading'));
    assert.ok(!html.includes('bg-slate-950'));
  }
  const test = harness({ step: 3 });
  const first = test.submit(), second = test.submit();
  assert.equal(test.requests.length, 1, 'Repeated clicks cannot submit concurrently');
  assert.equal(test.requests[0].url, '/api/audit');
  const payload = JSON.parse(test.requests[0].body);
  assert.equal(payload.questionnaireType, 'simple-presentation');
  assert.equal(payload.salesModel, 'Nu există tranzacții online');
  assert.equal(payload.accountNeeds, 'Nu, totul este public');
  assert.equal(payload.companyName, 'Afacere locală de test');
  test.finish(); await Promise.all([first, second]); assert.equal(test.state[2], 'success');
  const invalid = harness({ step: 3, data: { contactName: '', contactPhone: '', contactEmail: '' } });
  await invalid.submit(); assert.equal(invalid.requests.length, 0);
  const failed = harness({ step: 3, response: false });
  const sending = failed.submit(); failed.finish(); await sending;
  assert.equal(failed.state[2], 'error'); assert.equal(failed.state[1].companyName, 'Afacere locală de test');
  console.log('Simple presentation passed: original defaults/options/validation/payload preserved, four shared visual steps, local fake success/error/required fields and duplicate-submit guard. No network, email or database.');
})().catch(error => { console.error(error); process.exitCode = 1; });
