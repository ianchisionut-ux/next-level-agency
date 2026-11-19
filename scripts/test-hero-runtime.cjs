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
      if (name === '@/components/IntentLink') return { default: props => React.createElement('a', props, props.children) };
      if (name === 'lucide-react') return new Proxy({}, { get: () => props => React.createElement('svg', props) });
      if (name === '@/lib/hero-framing') return {};
      if (name === '@/lib/hero-energy') return {};
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
  const compact = input.compact || input.coarse || input.saveData;
  assert.equal(policy.activation, 'visible'); assert.equal(policy.autoRotate, !input.reduced && !input.saveData);
  assert.equal(policy.pixelRatioCap, compact ? 1 : 1.5);
  assert.equal(policy.environmentSize, compact ? 64 : 128);
  assert.equal(policy.maxFps, compact ? 24 : 30);
  assert.equal(policy.transmissionCap, compact ? 0 : .74);
  policies++;
}
assert.ok(!/navigator\s*\.\s*(userAgent|webdriver)/.test(source), 'No user-agent, crawler or test-only branches');
assert.ok(!/requestIdleCallback|scheduleBoot|shouldAutoStartHero|preloadOnPointer/.test(source), 'No timer, idle or hover bootstrap path remains');
const html = require('react-dom/server').renderToStaticMarkup(React.createElement(policyApi.default));
assert.ok(!html.includes('/hero/nextlevel-core.webp'), 'The old orthographic poster must not return');
const withoutNoscript = value => value.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
const noscript = /<noscript\b[^>]*>([\s\S]*?)<\/noscript>/i.exec(html)?.[1];
assert.ok(noscript, 'Server HTML includes a fallback for JS-disabled visitors');
for (const frame of ['mobile', 'tablet', 'desktop']) assert.ok(noscript.includes(`/hero/nextlevel-core-runtime-${frame}.webp`), 'Matching perspective previews remain inside noscript');
assert.ok(noscript.includes('nl-core-runtime-preview') && noscript.includes('alt="Ecosistem Next Level:'), 'The noscript fallback retains framing and descriptive alternative text');
assert.ok(noscript.includes('.nl-core-loading,.nl-core-live-status{display:none}'), 'JS-disabled visitors do not see a loading message that can never finish');
assert.ok(!/<(?:img|picture|source|link)\b/.test(withoutNoscript(html)), 'Normal startup neither renders nor preloads a static hero picture');
assert.ok(withoutNoscript(html).includes('Se pregătește ecosistemul…'), 'A subtle loading status is present before hydration');
assert.ok(!html.includes('Explorează în 3D') && html.includes('Ecosistemul 3D pornește automat.'), 'There is no Play gate on any viewport');
assert.ok(!html.includes('nextlevel-core.glb'), 'Server HTML must not preload the heavy model');
for (const path of ['/servicii/web-design-dezvoltare', '/servicii/performance-marketing', '/servicii/ai-automatizari']) assert.ok(html.includes(`href="${path}"`), '3D service links target their dedicated pages');

function harness(preferences = {}) {
  const settings = { compact: false, coarse: false, reduced: false, saveData: false, loaded: true, ...preferences };
  const imports = [], effects = [], raf = new Map(), idle = new Map(), events = new Map();
  let serial = 0, refIndex = 0, stateIndex = 0, observer, collectEffects = true;
  const refs = [], states = [];
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
  const react = { ...React,
    useRef(value) { const index = refIndex++; return refs[index] ||= { current: index === 0 ? mount : value }; },
    useState(value) { const index = stateIndex++; if (!(index in states)) states[index] = value; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect(fn) { if (collectEffects) effects.push(fn); },
  };
  const api = runtime({ react, imports, globals: {
    window, document, navigator,
    requestAnimationFrame(fn) { const id = ++serial; raf.set(id, fn); return id; }, cancelAnimationFrame(id) { raf.delete(id); },
    IntersectionObserver: class { constructor(callback) { observer = callback; } observe() {} disconnect() {} },
  } });
  const render = () => { refIndex = stateIndex = 0; return api.default(); };
  const tree = render(); collectEffects = false;
  const cleanups = effects.map(fn => fn()).filter(Boolean);
  const find = node => {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.className === 'nl-core-activate') return node;
    return React.Children.toArray(node.props?.children).map(find).find(Boolean);
  };
  const button = find(tree); assert.ok(!button, 'No activation button remains');
  return { imports, idle, settings, events, document,
    html() { return require('react-dom/server').renderToStaticMarkup(render()); },
    visible(value) { observer([{ isIntersecting: value }]); },
    paint() { for (let pass = 0; pass < 2; pass++) { const current = [...raf]; raf.clear(); current.forEach(([, fn]) => fn(pass * 16)); } },
    flushIdle() { const current = [...idle]; idle.clear(); current.forEach(([, fn]) => fn()); },
    cleanup() { cleanups.forEach(fn => fn()); },
  };
}

(async () => {
  for (let bits = 0; bits < 16; bits++) {
    const preferences = { compact: Boolean(bits & 1), coarse: Boolean(bits & 2), reduced: Boolean(bits & 4), saveData: Boolean(bits & 8) };
    const test = harness(preferences);
    assert.equal(test.imports.length, 0, 'Offscreen mounts do not start WebGL');
    assert.ok(!/<(?:picture|img|source|link)\b/.test(withoutNoscript(test.html())), 'No static picture while the visible model is still preparing');
    test.visible(false); await new Promise(setImmediate);
    assert.equal(test.imports.length, 0);
    test.document.hidden = true; test.visible(true); await new Promise(setImmediate);
    assert.equal(test.imports.length, 0, 'Hidden tabs defer WebGL even when geometry intersects');
    test.document.hidden = false; test.events.get('document:visibilitychange')();
    assert.ok(!/<(?:picture|img|source|link)\b/.test(withoutNoscript(test.html())), 'Pending dependency imports keep the luminous stage and loader instead of a poster');
    await new Promise(setImmediate);
    assert.equal(test.imports.length, 4, 'Visible desktop and mobile heroes start automatically');
    const failedHtml = withoutNoscript(test.html());
    assert.ok(failedHtml.includes('nl-core-failure-preview') && failedHtml.includes('<picture>') && failedHtml.includes('/hero/nextlevel-core-runtime-mobile.webp'), 'A failed WebGL dependency displays the matching picture fallback');
    assert.ok(!failedHtml.includes('nl-core-loading'), 'The loading indicator disappears on failure');
    assert.ok(failedHtml.includes('Se afișează imaginea de rezervă.'), 'The failure fallback is announced accessibly');
    test.visible(false); test.visible(true);
    test.document.hidden = true; test.events.get('document:visibilitychange')();
    test.document.hidden = false; test.events.get('document:visibilitychange')();
    test.settings.saveData = !test.settings.saveData; test.events.get('connection:change')();
    test.paint(); test.flushIdle(); await Promise.resolve();
    assert.equal(test.imports.length, 4, 'Repeated visibility and preference changes never initialize twice'); test.cleanup();
  }
  const priority = harness({ loaded: false }); priority.visible(true); await new Promise(setImmediate);
  assert.equal(priority.imports.length, 4, 'The hero does not wait for window load or a click'); priority.cleanup();
  const unmounted = harness(); unmounted.cleanup(); unmounted.visible(true); await new Promise(setImmediate);
  assert.equal(unmounted.imports.length, 0, 'Unmounted heroes cannot import dependencies');
  console.log(`Hero runtime passed: ${policies} preference combinations, automatic visible-only desktop/mobile startup without a static poster, accessible failure and noscript fallbacks, dedicated service links, hidden-tab deferral and duplicate/unmount guards. No rendering, network or database.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
