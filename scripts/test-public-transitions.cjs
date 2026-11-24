const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('lib/public-transitions.ts', 'utf8');
const {outputText, diagnostics} = ts.transpileModule(source, {
  reportDiagnostics: true,
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
});
assert.equal(diagnostics.length, 0);
function load(globals) {
  const listeners = new Set();
  let transitions = 0;
  const api = {};
  const react = {
    startTransition(update) { transitions++; update(); },
    useSyncExternalStore(subscribe, snapshot, serverSnapshot) {
      assert.equal(serverSnapshot(), false, 'SSR never starts cosmetic animation');
      const cleanup = subscribe(() => {});
      assert.equal(listeners.size, 3);
      cleanup();
      assert.equal(listeners.size, 0, 'All preference listeners are released');
      return snapshot();
    },
  };
  const target = name => ({addEventListener() {listeners.add(name);}, removeEventListener() {listeners.delete(name);}});
  vm.runInNewContext(outputText, {exports:api, require:() => react, ...globals(target)});
  return {api, transitions:() => transitions};
}
const ssr = load(() => ({}));
assert.equal(ssr.api.publicMotionAllowed(), false);
let calls = 0;
ssr.api.startPublicTransition(() => calls++);
assert.equal(calls, 1);
assert.equal(ssr.transitions(), 0);
for (let bits = 0; bits < 8; bits++) {
  const reduced = Boolean(bits & 1), saveData = Boolean(bits & 2), hidden = Boolean(bits & 4);
  const runtime = load(target => ({
    window:{matchMedia:() => ({matches:reduced, ...target('media')})},
    navigator:{connection:{saveData, ...target('connection')}},
    document:{hidden, ...target('document')},
  }));
  const allowed = bits === 0;
  assert.equal(runtime.api.publicMotionAllowed(), allowed);
  assert.equal(runtime.api.usePublicMotion(), allowed);
  let updated = 0;
  runtime.api.startPublicTransition(() => updated++);
  assert.equal(updated, 1, 'Every action still updates exactly once');
  assert.equal(runtime.transitions(), Number(allowed));
}
console.log('Public transitions passed: SSR fallback, eight preference states, immediate reduced-motion/SaveData/hidden actions and subscription cleanup. No browser, database or network.');
