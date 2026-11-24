const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const source = fs.readFileSync('components/HomeMotion.tsx', 'utf8');
const compiled = ts.transpileModule(source, {
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
});
assert.deepEqual(compiled.diagnostics, []);

function runtime(react = React, globals = {}) {
  const api = {};
  vm.runInNewContext(compiled.outputText, {
    exports: api, ...globals,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return api;
}

const api = runtime();
for (let bits = 0; bits < 16; bits++) {
  assert.equal(api.landingMotionEnabled({ compact: Boolean(bits & 1), finePointer: !(bits & 2), reduced: Boolean(bits & 4), saveData: Boolean(bits & 8) }), bits === 0);
}
const html = require('react-dom/server').renderToStaticMarkup(React.createElement(api.default, null, React.createElement('p', null, 'Visible content')));
assert.ok(html.includes('data-motion="static"'), 'No decorative loop starts before preferences are known');
assert.ok(html.includes('Visible content'), 'Content is server-rendered and visible without JavaScript');

function harness(preferences = {}) {
  const settings = { compact: false, finePointer: true, reduced: false, saveData: false, ...preferences };
  const listeners = new Map(), pointers = new Map(), raf = new Map(), effects = [];
  const instances = [], observeCounts = new Map();
  const revealNodes = ['seen', 'later'].map(name => {
    const classes = new Set();
    return { name, style: { animation: '' }, classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) } };
  });
  let observers = 0, disconnects = 0;
  const element = {
    dataset: { motion: 'static' }, querySelectorAll(selector) { return selector === '[data-reveal]' ? revealNodes : []; },
    addEventListener(name, fn) { pointers.set(name, fn); }, removeEventListener(name) { pointers.delete(name); },
  };
  const document = {
    hidden: false, documentElement: { dataset: {} },
    addEventListener(name, fn) { listeners.set(`document:${name}`, fn); }, removeEventListener(name) { listeners.delete(`document:${name}`); },
  };
  const connection = {
    get saveData() { return settings.saveData; },
    addEventListener(name, fn) { listeners.set(`connection:${name}`, fn); }, removeEventListener(name) { listeners.delete(`connection:${name}`); },
  };
  const window = {
    IntersectionObserver: true,
    matchMedia(query) {
      const key = query.includes('reduced') ? 'reduced' : query.includes('max-width') ? 'compact' : 'finePointer';
      return {
        get matches() { return settings[key]; },
        addEventListener(name, fn) { listeners.set(`${key}:${name}`, fn); }, removeEventListener(name) { listeners.delete(`${key}:${name}`); },
      };
    },
  };
  const local = runtime({ ...React, useRef() { return { current: element }; }, useEffect(fn) { effects.push(fn); } }, {
    window, document, navigator: { connection },
    requestAnimationFrame(fn) { raf.set(1, fn); return 1; }, cancelAnimationFrame(id) { raf.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { observers++; this.callback = callback; this.targets = new Set(); instances.push(this); }
      observe(target) { this.targets.add(target); observeCounts.set(target, (observeCounts.get(target) || 0) + 1); }
      unobserve(target) { this.targets.delete(target); }
      disconnect() { disconnects++; this.targets.clear(); }
    },
    Element: class {}, Node: class {},
  });
  local.default({ children: null });
  const cleanups = effects.map(fn => fn());
  return { settings, element, document, listeners, pointers, raf, revealNodes, instances, observeCounts,
    reveal(target) { const observer = instances.at(-1); assert.ok(observer.targets.has(target), 'Only currently observed nodes can intersect'); observer.callback([{ target, isIntersecting: true }]); },
    get observers() { return observers; }, get disconnects() { return disconnects; }, cleanup() { cleanups.forEach(fn => fn()); } };
}

for (const preferences of [{ compact: true }, { finePointer: false }, { reduced: true }, { saveData: true }]) {
  const test = harness(preferences);
  assert.equal(test.element.dataset.motion, 'static');
  assert.equal(test.observers, 0, 'Constrained visits do not create reveal observers');
  assert.equal(test.pointers.size, 0, 'Constrained visits do not attach cosmetic pointer handlers');
  assert.equal(test.raf.size, 0);
  test.cleanup();
  assert.equal(test.listeners.size, 0);
  assert.equal(test.document.documentElement.dataset.landingMotion, undefined, 'Public preference marker is removed on navigation');
}
const desktop = harness();
assert.equal(desktop.element.dataset.motion, 'full'); assert.equal(desktop.observers, 1); assert.equal(desktop.pointers.size, 2);
desktop.settings.saveData = true; desktop.listeners.get('connection:change')();
assert.equal(desktop.element.dataset.motion, 'static'); assert.equal(desktop.disconnects, 1); assert.equal(desktop.pointers.size, 0);
desktop.settings.saveData = false; desktop.listeners.get('connection:change')();
assert.equal(desktop.element.dataset.motion, 'full'); assert.equal(desktop.observers, 2);
desktop.document.hidden = true; desktop.listeners.get('document:visibilitychange')();
assert.equal(desktop.element.dataset.motion, 'static'); assert.equal(desktop.pointers.size, 0);
desktop.document.hidden = false; desktop.listeners.get('document:visibilitychange')();
assert.equal(desktop.element.dataset.motion, 'full');
desktop.cleanup(); assert.equal(desktop.pointers.size, 0); assert.equal(desktop.listeners.size, 0);

const once = harness();
const [seen, later] = once.revealNodes;
once.reveal(seen);
assert.ok(seen.classList.contains('nl-revealed'), 'The actual observer callback reveals a node');
assert.ok(!once.instances[0].targets.has(seen), 'A revealed node is unobserved immediately');
assert.equal(seen.style.animation, '', 'The first reveal retains the existing CSS animation');

once.document.hidden = true; once.listeners.get('document:visibilitychange')();
assert.ok(seen.classList.contains('nl-revealed'), 'Hiding the page must not clear completed reveal classes');
assert.equal(seen.style.animation, 'none', 'Returning to full motion cannot restart the completed CSS animation');
once.instances[0].callback([{ target: later, isIntersecting: true }]);
assert.ok(!later.classList.contains('nl-revealed'), 'A queued callback must not reveal content while the page is hidden');
once.document.hidden = false; once.listeners.get('document:visibilitychange')();
assert.equal(once.element.dataset.motion, 'full');
assert.equal(once.observeCounts.get(seen), 1, 'Hide/show must not reobserve completed content');
once.instances[0].callback([{ target: later, isIntersecting: true }]);
assert.ok(!later.classList.contains('nl-revealed'), 'A disconnected observer cannot reveal nodes after a replacement starts');

once.settings.reduced = true; once.listeners.get('reduced:change')();
assert.equal(once.element.dataset.motion, 'static'); assert.equal(once.pointers.size, 0);
assert.ok(seen.classList.contains('nl-revealed'), 'Reduced motion retains the final visible state');
once.settings.reduced = false; once.listeners.get('reduced:change')();
assert.equal(once.element.dataset.motion, 'full');
assert.equal(once.observeCounts.get(seen), 1, 'Reduced-motion cycles must not replay or reobserve completed content');
assert.equal(seen.style.animation, 'none');

once.settings.saveData = true; once.listeners.get('connection:change')();
once.settings.saveData = false; once.listeners.get('connection:change')();
assert.equal(once.observeCounts.get(seen), 1, 'Save-Data cycles must not reobserve completed content');
assert.ok(once.instances.at(-1).targets.has(later), 'Unseen nodes remain eligible after preference changes');
once.reveal(later);
assert.ok(later.classList.contains('nl-revealed'));
assert.equal(later.style.animation, '', 'An unseen node still receives its first normal animation');
once.cleanup();
assert.ok(seen.classList.contains('nl-revealed') && later.classList.contains('nl-revealed'), 'Cleanup retains completed content instead of resetting it');
assert.equal(later.style.animation, 'none');
assert.equal(once.pointers.size, 0); assert.equal(once.listeners.size, 0);

const css = fs.readFileSync('app/home-motion.css', 'utf8');
assert.ok(!/nl-shimmer|@keyframes nl-gradient/.test(css), 'Noncomposited background-position loops are removed on every device');
assert.ok(css.includes('[data-motion="static"] .animate-marquee { animation: none; }'));
assert.ok(css.includes('[aria-label="Scrie-ne pe WhatsApp"] .animate-ping { animation: none; }'));
assert.ok(css.includes('[data-motion="static"] .marquee-mask { overflow-x: auto;'), 'All platform links remain reachable by horizontal scrolling');
assert.ok(!/userAgent|webdriver/.test(source));
console.log('Home motion passed: 16 preference combinations, visible static SSR, zero cosmetic IO/pointer/RAF in constrained modes, one-time reveals across hidden/reduced-motion/Save-Data cycles, stale observer rejection, unseen-node continuation, cleanup and static gradients/marquee/contact pulse. No browser, network or database.');
