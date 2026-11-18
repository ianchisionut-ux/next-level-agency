const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const React = require('react');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');

const source = fs.readFileSync('components/IntentLink.tsx', 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'components/IntentLink.tsx', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
assert.equal((compiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
const NextLink = ({ prefetch, href, children, ...props }) => React.createElement('a', { ...props, href, 'data-mock-prefetch': String(prefetch) }, children);
function runtime(react = React, globals = {}) {
  const api = {};
  vm.runInNewContext(compiled.outputText, { exports: api, ...globals,
    require(name) {
      if (name === 'next/link') return { __esModule: true, default: NextLink };
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return api.default;
}
const SSRLink = runtime();
const ssr = renderToStaticMarkup(React.createElement(SSRLink, { href: '/servicii#web-development', className: 'unchanged', 'aria-label': 'Servicii web', target: '_self' }, 'Vezi serviciul'));
assert.ok(ssr.includes('href="/servicii#web-development"'));
assert.ok(ssr.includes('data-mock-prefetch="false"'));
assert.ok(ssr.includes('class="unchanged"'));
assert.ok(ssr.includes('aria-label="Servicii web"'));
assert.ok(ssr.includes('Vezi serviciul'));
assert.ok(!/navigator\s*\.\s*(userAgent|webdriver)/.test(source), 'No crawler or test-specific behavior');

function harness(initialProps = {}, initialSettings = {}) {
  const settings = { fine: true, reduced: false, saveData: false, ...initialSettings };
  let state = null, props = { href: '/servicii', children: 'Servicii', ...initialProps };
  let preferenceReads = 0;
  const Link = runtime({ ...React, useState: () => [state, value => { state = value; }] }, {
    window: { matchMedia(query) { preferenceReads++; return { matches: query.includes('reduced-motion') ? settings.reduced : settings.fine }; } },
    navigator: { connection: { get saveData() { preferenceReads++; return settings.saveData; } } },
  });
  return { settings, render: () => Link(props), setProps(value) { props = { ...props, ...value }; }, preferenceReads: () => preferenceReads };
}
const mouse = () => ({ pointerType: 'mouse', defaultPrevented: false });
const focus = () => ({ defaultPrevented: false });
for (const mode of [undefined, null, 'auto', true, false]) {
  const link = harness({ prefetch: mode });
  assert.equal(link.render().props.prefetch, false, `Initial mode ${mode}`);
  assert.equal(link.preferenceReads(), 0, 'Arrival does not inspect preferences or activate prefetch');
  link.render().props.onPointerEnter(mouse());
  assert.equal(link.render().props.prefetch, mode === false ? false : mode ?? null);
  link.setProps({ prefetch: false });
  link.render().props.onFocus(focus());
  assert.equal(link.render().props.prefetch, false, 'Explicit false remains permanent after any intent');
}
const keyboard = harness(); keyboard.render().props.onFocus(focus()); assert.equal(keyboard.render().props.prefetch, null);
keyboard.setProps({ href: '/contact' }); assert.equal(keyboard.render().props.prefetch, false, 'A changed destination requires its own intent');
for (const preferences of [{ fine: false }, { reduced: true }, { saveData: true }]) {
  const link = harness({}, preferences);
  link.render().props.onPointerEnter(mouse()); link.render().props.onFocus(focus());
  assert.equal(link.render().props.prefetch, false, 'Manual preference paths wait for normal navigation');
}
for (const pointerType of ['touch', 'pen', '']) {
  const link = harness(); link.render().props.onPointerEnter({ pointerType, defaultPrevented: false });
  assert.equal(link.render().props.prefetch, false);
}
let pointerCalls = 0, focusCalls = 0;
const canceled = harness({
  onPointerEnter(event) { pointerCalls++; event.defaultPrevented = true; },
  onFocus(event) { focusCalls++; event.defaultPrevented = true; },
});
canceled.render().props.onPointerEnter(mouse()); canceled.render().props.onFocus(focus());
assert.equal(pointerCalls, 1); assert.equal(focusCalls, 1); assert.equal(canceled.render().props.prefetch, false, 'Consumer cancellation is preserved');
const href = { pathname: '/servicii', query: { type: 'web' }, hash: 'web-development' };
const ref = { current: null }, onClick = () => {}, onNavigate = () => {}, onMouseEnter = () => {};
const props = harness({ href, ref, onClick, onNavigate, onMouseEnter, replace: true, scroll: false, target: '_blank', rel: 'noopener noreferrer', className: 'same', style: { color: 'red' }, 'data-magnetic': true });
const element = props.render();
for (const [key, value] of Object.entries({ href, ref, onClick, onNavigate, onMouseEnter, replace: true, scroll: false, target: '_blank', rel: 'noopener noreferrer', className: 'same', 'data-magnetic': true })) assert.equal(element.props[key], value, `${key} preserved`);
props.render().props.onFocus(focus()); assert.equal(props.render().props.prefetch, null);
assert.equal(props.render().props.href, href, 'URL objects remain untouched');

for (const file of ['components/Header.tsx', 'components/Footer.tsx', 'components/HomeHero.tsx', 'app/page.tsx', 'app/servicii/page.tsx', 'app/blog/page.tsx', 'app/blog/[slug]/page.tsx', 'app/portofoliu/page.tsx', 'app/contact/page.tsx', 'app/chestionar-site-prezentare/page.tsx']) {
  const contents = fs.readFileSync(file, 'utf8');
  assert.ok(contents.includes('import Link from "@/components/IntentLink";'), `${file} uses intent-only prefetch`);
  assert.ok(!contents.includes('from "next/link"'), file);
}
console.log('Intent links passed: SSR href/content preserved, no initial prefetch or browser reads, mouse/focus intent, permanent false, coarse/touch/reduced/SaveData paths, changed destinations, handler cancellation, forwarded refs/URL objects/navigation props and 10 public entry points. No network or database.');
