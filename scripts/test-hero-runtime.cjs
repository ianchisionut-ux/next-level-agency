const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const source = fs.readFileSync('components/InteractiveCore.tsx', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;

function runtime({ react = React, globals = {}, imports = [] } = {}) {
  const api = {};
  vm.runInNewContext(code, {
    exports: api, ...globals,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'next/image') return { default: ({ unoptimized, ...props }) => React.createElement('img', props) };
      if (name === 'next/link') return { default: props => React.createElement('a', props, props.children) };
      if (name === 'lucide-react') return new Proxy({}, { get: () => props => React.createElement('svg', props) });
      if (name === '@/lib/hero-framing') return {};
      if (name === 'three' || name.startsWith('three/')) { imports.push(name); throw new Error('3D dependency intercepted; no WebGL or network in this test'); }
      throw new Error(`Unexpected runtime dependency ${name}`);
    },
  });
  return api;
}

const policyApi = runtime();
let policies = 0;
for (let bits = 0; bits < 16; bits++) {
  const input = { compact: Boolean(bits & 1), coarse: Boolean(bits & 2), reduced: Boolean(bits & 4), saveData: Boolean(bits & 8) };
  const policy = policyApi.heroRuntimePolicy(input);
  assert.equal(policy.automatic, bits === 0); assert.equal(policy.autoRotate, bits === 0);
  assert.equal(policy.pixelRatioCap, bits === 0 ? 1.5 : 1);
  assert.equal(policy.environmentSize, bits === 0 ? 128 : 64);
  assert.equal(policy.transmissionCap, bits === 0 ? .58 : 0);
  for (let readiness = 0; readiness < 8; readiness++) assert.equal(policyApi.shouldAutoStartHero(policy, Boolean(readiness & 1), Boolean(readiness & 2), Boolean(readiness & 4)), bits === 0 && readiness === 7);
  policies++;
}
assert.ok(!/navigator\s*\.\s*(userAgent|webdriver)/.test(source), 'No user-agent, crawler or test-only branches');
const html = require('react-dom/server').renderToStaticMarkup(React.createElement(policyApi.default));
assert.ok(!html.includes('/hero/nextlevel-core.webp'), 'The old orthographic poster must not return');
for (const frame of ['mobile', 'tablet', 'desktop']) assert.ok(html.includes(`/hero/nextlevel-core-runtime-${frame}.webp`), 'Current-model perspective previews must be present in server HTML');
assert.ok(html.includes('nl-core-runtime-preview'), 'Perspective previews use the complete stage framing');
assert.ok(html.includes('Explorează în 3D'), 'Keyboard/touch activation must be available in server HTML');
assert.ok(!html.includes('nextlevel-core.glb'), 'Server HTML must not preload the heavy model');

function harness(preferences = {}) {
  const settings = { compact: false, coarse: false, reduced: false, saveData: false, loaded: true, ...preferences };
  const imports = [], effects = [], raf = new Map(), idle = new Map(), events = new Map();
  let serial = 0, refIndex = 0, observer;
  const mount = { clientWidth: 1200, clientHeight: 780 };
  const media = query => {
    const field = query.includes('reduced-motion') ? 'reduced' : query.includes('max-width') ? 'compact' : 'coarse';
    return { get matches() { return settings[field]; }, addEventListener(name, fn) { events.set(`${field}:${name}`, fn); }, removeEventListener(name) { events.delete(`${field}:${name}`); } };
  };
  const window = {
    matchMedia: media, devicePixelRatio: 2,
    requestIdleCallback(fn) { const id = ++serial; idle.set(id, fn); return id; },
    cancelIdleCallback(id) { idle.delete(id); },
    setTimeout(fn) { const id = ++serial; idle.set(id, fn); return id; }, clearTimeout(id) { idle.delete(id); },
    addEventListener(name, fn) { events.set(`window:${name}`, fn); }, removeEventListener(name) { events.delete(`window:${name}`); },
  };
  const document = { readyState: settings.loaded ? 'complete' : 'loading', hidden: false, addEventListener(name, fn) { events.set(`document:${name}`, fn); }, removeEventListener(name) { events.delete(`document:${name}`); } };
  const navigator = { connection: { get saveData() { return settings.saveData; }, addEventListener(name, fn) { events.set(`connection:${name}`, fn); }, removeEventListener(name) { events.delete(`connection:${name}`); } } };
  const react = { ...React, useRef(value) { return { current: refIndex++ === 0 ? mount : value }; }, useState(value) { return [value, () => {}]; }, useEffect(fn) { effects.push(fn); } };
  const api = runtime({ react, imports, globals: {
    window, document, navigator,
    requestAnimationFrame(fn) { const id = ++serial; raf.set(id, fn); return id; }, cancelAnimationFrame(id) { raf.delete(id); },
    IntersectionObserver: class { constructor(callback) { observer = callback; } observe() {} disconnect() {} },
  } });
  const tree = api.default();
  const cleanups = effects.map(fn => fn()).filter(Boolean);
  const find = node => {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.className === 'nl-core-activate') return node;
    return React.Children.toArray(node.props?.children).map(find).find(Boolean);
  };
  const button = find(tree); assert.ok(button);
  return { imports, idle, settings, events, document,
    visible(value) { observer([{ isIntersecting: value }]); },
    paint() { for (let pass = 0; pass < 2; pass++) { const current = [...raf]; raf.clear(); current.forEach(([, fn]) => fn(pass * 16)); } },
    flushIdle() { const current = [...idle]; idle.clear(); current.forEach(([, fn]) => fn()); },
    activate() { button.props.onClick(); }, cleanup() { cleanups.forEach(fn => fn()); },
  };
}

(async () => {
  for (const preferences of [{ compact: true }, { coarse: true }, { reduced: true }, { saveData: true }]) {
    const test = harness(preferences); test.visible(true); test.paint(); test.flushIdle();
    await Promise.resolve(); assert.equal(test.imports.length, 0, 'Manual-mode visits cannot import Three or its loaders');
    test.activate(); test.activate(); await new Promise(setImmediate);
    assert.equal(test.imports.length, 4, 'An explicit activation bypasses idle once, without duplicate imports'); test.cleanup();
  }
  const desktop = harness({ loaded: false }); desktop.visible(true); desktop.paint();
  assert.equal(desktop.idle.size, 0, 'Desktop must wait for the load event');
  desktop.events.get('window:load')(); assert.equal(desktop.idle.size, 1); assert.equal(desktop.imports.length, 0);
  desktop.flushIdle(); await new Promise(setImmediate); assert.equal(desktop.imports.length, 4); desktop.cleanup();

  const offscreen = harness(); offscreen.paint(); assert.equal(offscreen.idle.size, 0);
  offscreen.visible(true); assert.equal(offscreen.idle.size, 1);
  const staleIdle = [...offscreen.idle.values()][0]; offscreen.visible(false); assert.equal(offscreen.idle.size, 0);
  staleIdle(); await Promise.resolve(); assert.equal(offscreen.imports.length, 0); offscreen.cleanup();

  const changed = harness(); changed.visible(true); changed.paint(); assert.equal(changed.idle.size, 1);
  changed.settings.saveData = true; changed.events.get('connection:change')(); assert.equal(changed.idle.size, 0); changed.cleanup();

  const hidden = harness(); hidden.document.hidden = true; hidden.visible(true); hidden.paint(); assert.equal(hidden.idle.size, 0);
  hidden.document.hidden = false; hidden.events.get('document:visibilitychange')(); assert.equal(hidden.idle.size, 1); hidden.cleanup();

  const priority = harness({ compact: true, loaded: false }); priority.activate(); await new Promise(setImmediate);
  assert.equal(priority.imports.length, 4, 'Keyboard/pointer activation cannot be delayed by load or idle'); priority.cleanup();
  console.log(`Hero runtime passed: ${policies} preference combinations, 128 readiness states, SSR poster/activation, zero automatic 3D imports on manual paths, desktop load/paint/idle, offscreen/hidden cancellation and explicit-priority activation. No rendering, network or database.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
