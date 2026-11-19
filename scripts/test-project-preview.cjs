const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { parseDocument } = require('htmlparser2');

function compile(file) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal((result.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, file);
  return result.outputText;
}
const previewCode = compile('components/ProjectPreview.tsx');
function previewRuntime(react = React, globals = {}) {
  const api = {};
  vm.runInNewContext(previewCode, { exports: api, setTimeout, clearTimeout, ...globals,
    require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return require(name); throw new Error(`Unexpected dependency ${name}`); },
  });
  return api;
}
const api = previewRuntime();
const urls = ['https://www.pmcustoms.us', 'https://www.draculasoil.com', 'https://www.pro-bloc-manager.ro/'];
for (const url of urls) assert.equal(api.projectPreviewUrl(url), url);
for (const url of ['https://www.dailym.ro/pentru-restaurante', 'https://www.bookeasy.ro/descopera', 'https://elmontz.vercel.app', 'https://www.pmcustoms.us.evil.example', 'http://www.pmcustoms.us', 'javascript:alert(1)']) assert.equal(api.projectPreviewUrl(url), null);

function fakeClock() {
  let now = 0, serial = 0;
  const jobs = new Map();
  return {
    jobs,
    set(fn, delay) { const id = ++serial; jobs.set(id, { fn, due: now + delay }); return id; },
    clear(id) { jobs.delete(id); },
    advance(duration) {
      const end = now + duration;
      while (true) {
        const next = [...jobs].filter(([, job]) => job.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        now = next[1].due; jobs.delete(next[0]); next[1].fn();
      }
      now = end;
    },
  };
}
const all = { allowed: true, automatic: true, visible: true, pageVisible: true };
for (let bits = 0; bits < 16; bits++) {
  const clock = fakeClock(), store = api.createProjectPreviewCoordinator(clock);
  const policy = { allowed: Boolean(bits & 1), automatic: Boolean(bits & 2), visible: Boolean(bits & 4), pageVisible: Boolean(bits & 8) };
  store.update('a', policy); store.request('a'); clock.advance(350);
  assert.equal(Boolean(store.getSnapshot()), bits === 15, 'Automatic preview must respect every gate');
  store.release('a'); store.request('a', true);
  assert.equal(Boolean(store.getSnapshot()), policy.allowed && policy.visible && policy.pageVisible, 'Explicit activation bypasses only preference gates');
  store.remove('a'); assert.equal(store.getSnapshot(), null); assert.equal(clock.jobs.size, 0);
}
{
  const clock = fakeClock(), store = api.createProjectPreviewCoordinator(clock);
  store.update('a', all); store.update('b', all);
  store.request('a'); const stale = [...clock.jobs.values()][0].fn;
  clock.advance(349); assert.equal(store.getSnapshot(), null);
  store.release('a'); stale(); assert.equal(store.getSnapshot(), null, 'Canceled callbacks cannot resurrect an iframe');
  store.request('a'); store.request('b'); clock.advance(350); assert.equal(store.getSnapshot().id, 'b');
  store.request('a', true); assert.equal(store.getSnapshot().id, 'a');
  store.update('a', { ...all, automatic: false }); assert.equal(store.getSnapshot().id, 'a', 'An explicit preview can remain under manual preferences');
  store.update('a', { ...all, pageVisible: false }); assert.equal(store.getSnapshot(), null);
  store.request('b'); store.update('b', { ...all, automatic: false }); clock.advance(350); assert.equal(store.getSnapshot(), null);
  store.update('b', all); store.request('b'); clock.advance(350);
  store.update('b', { ...all, automatic: false }); assert.equal(store.getSnapshot(), null, 'Preference changes stop automatic previews');
}

const data = {};
vm.runInNewContext(compile('lib/data.ts'), { exports: data });
const web = {};
vm.runInNewContext(compile('components/WebDevelopment.tsx'), { exports: web,
  require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/lib/data') return data;
    if (name === '@/components/ProjectPreview') return api;
    if (name === 'next/image') return { __esModule: true, default: ({ fill, ...props }) => React.createElement('img', props) };
    throw new Error(`Unexpected dependency ${name}`);
  },
});
const html = renderToStaticMarkup(React.createElement(web.default));
assert.equal((html.match(/<iframe\b/g) || []).length, 0, 'No third-party iframe or page request in initial HTML');
assert.equal((html.match(/<img\b/g) || []).length, data.webProjects.length, 'Every static thumbnail remains server-rendered');
assert.equal((html.match(/<button\b/g) || []).length, urls.length, 'Only permitted projects offer live activation');
assert.equal((html.match(/Explorează site-ul într-o filă nouă\./g) || []).length, 3);
for (const project of data.webProjects) {
  assert.ok(html.includes(`href="${project.url}"`));
  assert.ok(html.includes(project.thumbnail));
  assert.ok(html.includes(project.title));
}
function checkNesting(node, interactive = false) {
  if (['a', 'button'].includes(node.name)) { assert.ok(!interactive, 'No nested anchors/buttons'); interactive = true; }
  for (const child of node.children || []) checkNesting(child, interactive);
}
checkNesting(parseDocument(html));

// Execute actual component handlers and effects with a deterministic browser,
// without loading any frame, browser, network service or database.
function browserHarness({ intersectionSupported = true, resizeSupported = true } = {}) {
  const clock = fakeClock(), instances = [], intersections = new Map(), resizes = new Map(), listeners = new Map();
  const settings = { fine: true, reduced: false, saveData: false };
  let current;
  const listen = (key, fn) => { if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(fn); };
  const unlisten = (key, fn) => listeners.get(key)?.delete(fn);
  const media = key => ({ get matches() { return settings[key]; }, addEventListener: (_, fn) => listen(key, fn), removeEventListener: (_, fn) => unlisten(key, fn) });
  const document = { hidden: false, addEventListener: (name, fn) => listen(name, fn), removeEventListener: (name, fn) => unlisten(name, fn) };
  const window = { innerWidth: 1280, innerHeight: 800, matchMedia: query => media(query.includes('reduced-motion') ? 'reduced' : 'fine'), setTimeout: clock.set, clearTimeout: clock.clear,
    addEventListener: (name, fn) => listen(name, fn), removeEventListener: (name, fn) => unlisten(name, fn) };
  const react = { ...React,
    useId() { current.cursor++; return current.id; },
    useRef(value) {
      const index = current.cursor++;
      if (!current.slots[index]) {
        const bindViewport = value === null && !current.viewportBound;
        current.slots[index] = { current: bindViewport ? current.element : value };
        if (bindViewport) current.viewportBound = true;
      }
      return current.slots[index];
    },
    useSyncExternalStore(_subscribe, getSnapshot) { current.cursor++; return getSnapshot(); },
    useState(value) {
      const owner = current, index = owner.cursor++;
      if (!(index in owner.slots)) owner.slots[index] = value;
      return [owner.slots[index], next => { owner.slots[index] = typeof next === 'function' ? next(owner.slots[index]) : next; }];
    },
    useEffect(fn, dependencies) {
      const owner = current, index = owner.cursor++, previous = owner.slots[index];
      if (previous && dependencies.every((value, i) => Object.is(value, previous.dependencies[i]))) return;
      owner.effects.push(() => { previous?.cleanup?.(); owner.slots[index] = { dependencies, cleanup: fn() }; });
    },
  };
  const runtime = previewRuntime(react, { window, document, navigator: { connection: { get saveData() { return settings.saveData; }, addEventListener: (_, fn) => listen('connection', fn), removeEventListener: (_, fn) => unlisten('connection', fn) } },
    setTimeout: clock.set, clearTimeout: clock.clear,
    IntersectionObserver: intersectionSupported ? class {
      constructor(callback) { this.callback = callback; this.elements = new Set(); }
      observe(element) { this.elements.add(element); intersections.set(element, this.callback); }
      disconnect() { this.elements.forEach(element => intersections.delete(element)); this.elements.clear(); }
    } : undefined,
    ResizeObserver: resizeSupported ? class {
      constructor(callback) { this.callback = callback; this.elements = new Set(); }
      observe(element) { this.elements.add(element); resizes.set(element, this.callback); }
      disconnect() { this.elements.forEach(element => resizes.delete(element)); this.elements.clear(); }
    } : undefined,
  });
  function render() {
    for (let pass = 0; pass < 2; pass++) for (const instance of instances) {
      current = instance; instance.cursor = 0; instance.tree = runtime.default(instance.props);
      instance.frameRenders += nodes(instance.tree, 'iframe').length;
      const effects = instance.effects.splice(0); effects.forEach(fn => fn());
    }
  }
  function add(id, url) {
    const instance = { id, slots: [], effects: [], width: 400, top: 0, measurements: 0, frameRenders: 0, element: null };
    instance.element = { getBoundingClientRect: () => {
      instance.measurements++;
      return { width: instance.width, height: instance.width * 9 / 16, top: instance.top, left: 0, bottom: instance.top + instance.width * 9 / 16, right: instance.width };
    } };
    instance.props = { url, title: id, thumbnail: React.createElement('img', { src: '/fixture.webp', alt: id }), children: React.createElement('a', { href: url }, 'Vezi site-ul') };
    instances.push(instance); render(); return instance;
  }
  const nodes = (node, type) => !node || typeof node !== 'object' ? [] : [...(node.type === type ? [node] : []), ...React.Children.toArray(node.props?.children).flatMap(child => nodes(child, type))];
  return { add, render, settings, document, clock, nodes,
    visible(instance, value) { instance.top = value ? 0 : 1000; intersections.get(instance.element)?.([{ isIntersecting: value, intersectionRatio: value ? 1 : 0 }]); render(); },
    event(name) { listeners.get(name)?.forEach(fn => fn()); render(); },
    resize(instance, width) { instance.width = width; resizes.get(instance.element)?.([{ target: instance.element, contentRect: { width } }]); render(); },
    advance(time) { clock.advance(time); render(); },
    frames() { return instances.flatMap(instance => nodes(instance.tree, 'iframe')); },
    measurements() { return instances.reduce((sum, instance) => sum + instance.measurements, 0); },
    resizeObservers() { return resizes.size; },
    listeners(name) { return listeners.get(name)?.size || 0; },
    cleanup() { instances.forEach(instance => instance.slots.forEach(slot => slot?.cleanup?.())); },
  };
}
const browser = browserHarness();
const first = browser.add('pm', urls[0]), second = browser.add('dracula', urls[1]), blocked = browser.add('blocked', 'https://www.bookeasy.ro/descopera');
browser.visible(first, true); browser.visible(second, true);
assert.equal(browser.frames().length, 0);
assert.equal(browser.measurements(), 0, 'Mount and intersection eligibility cannot force layout');
assert.equal(browser.resizeObservers(), 0, 'Inactive cards do not observe their size');
browser.resize(first, 400);
assert.equal(browser.measurements(), 0, 'Inactive resize does not measure the preview');
assert.equal(browser.listeners('resize'), 0);
first.tree.props.onPointerEnter({ pointerType: 'mouse' }); browser.advance(349); assert.equal(browser.frames().length, 0);
assert.equal(browser.measurements(), 0, 'Canceled or pending intent has no geometry work when IO exists');
browser.advance(1); assert.equal(browser.frames().length, 1);
assert.equal(browser.measurements(), 1); assert.equal(browser.resizeObservers(), 1);
let frame = browser.frames()[0]; assert.equal(frame.props.src, urls[0]);
assert.equal(frame.props.width, 1280); assert.equal(frame.props.height, 720); assert.equal(frame.props.style.transform, 'scale(0.3125)');
assert.equal(frame.props.style.pointerEvents, 'none'); assert.equal(frame.props.tabIndex, -1);
assert.equal(frame.props.sandbox, 'allow-scripts allow-same-origin'); assert.equal(frame.props.referrerPolicy, 'no-referrer');
for (const capability of ['camera', 'microphone', 'payment', 'autoplay']) assert.ok(frame.props.allow.includes(`${capability} 'none'`));
assert.equal(frame.props.style.opacity, 0); frame.props.onLoad(); browser.render(); assert.equal(browser.frames()[0].props.style.opacity, 1);
browser.resize(first, 320); assert.equal(browser.frames()[0].props.style.transform, 'scale(0.25)');
assert.equal(browser.measurements(), 1, 'Active RO uses its supplied content width without a synchronous layout read');
second.tree.props.onFocus({ currentTarget: { contains: () => false }, relatedTarget: null }); browser.advance(350);
assert.equal(browser.frames().length, 1); assert.equal(browser.frames()[0].props.src, urls[1], 'Focus replaces the previous iframe');
assert.equal(browser.resizeObservers(), 1, 'Replacing a preview disconnects the previous size observer');
second.tree.props.onPointerLeave({ pointerType: 'mouse' }); browser.render(); assert.equal(browser.frames().length, 0);
assert.equal(browser.resizeObservers(), 0, 'Stopping a preview releases size observations');
first.tree.props.onPointerEnter({ pointerType: 'mouse' }); first.tree.props.onPointerLeave({ pointerType: 'mouse' }); browser.advance(350); assert.equal(browser.frames().length, 0);
blocked.tree.props.onPointerEnter({ pointerType: 'mouse' }); browser.advance(350); assert.equal(browser.frames().length, 0);
browser.settings.reduced = true; browser.event('reduced');
first.tree.props.onFocus({ currentTarget: { contains: () => false }, relatedTarget: null }); browser.advance(350); assert.equal(browser.frames().length, 0);
browser.nodes(first.tree, 'button')[0].props.onClick(); browser.render(); assert.equal(browser.frames().length, 1, 'Manual activation remains available with reduced motion');
browser.document.hidden = true; browser.event('visibilitychange'); assert.equal(browser.frames().length, 0);
browser.document.hidden = false; browser.event('visibilitychange');
browser.settings.reduced = false; browser.settings.saveData = true; browser.event('reduced'); browser.event('connection');
first.tree.props.onPointerEnter({ pointerType: 'mouse' }); browser.advance(350); assert.equal(browser.frames().length, 0);
browser.nodes(first.tree, 'button')[0].props.onClick(); browser.render(); assert.equal(browser.frames().length, 1);
browser.visible(first, false); assert.equal(browser.frames().length, 0, 'Offscreen previews unload');
browser.visible(first, true); browser.nodes(first.tree, 'button')[0].props.onClick(); browser.render();
browser.advance(15000); assert.equal(browser.frames().length, 0, 'A stalled preview releases resources and keeps the external link');
assert.ok(JSON.stringify(first.tree).includes('Previzualizarea nu este disponibilă.'));
assert.equal(browser.nodes(first.tree, 'a')[0].props.href, urls[0]);
browser.nodes(first.tree, 'button')[0].props.onClick(); browser.render();
first.tree.props.onKeyDown({ key: 'Escape' }); browser.render(); assert.equal(browser.frames().length, 0);
browser.cleanup(); assert.equal(browser.clock.jobs.size, 0);
assert.equal(browser.resizeObservers(), 0);

for (const intersectionSupported of [false, true]) for (const resizeSupported of [false, true]) {
  const fallback = browserHarness({ intersectionSupported, resizeSupported });
  const project = fallback.add('fallback', urls[0]);
  fallback.visible(project, true);
  assert.equal(fallback.measurements(), 0, 'Every API support combination avoids initial geometry work');
  assert.equal(fallback.resizeObservers(), 0);
  assert.equal(fallback.listeners('resize'), 0); assert.equal(fallback.listeners('scroll'), 0);
  fallback.nodes(project.tree, 'button')[0].props.onClick(); fallback.render();
  assert.equal(fallback.frames().length, 1, 'Explicit activation works with or without IO/RO');
  assert.equal(fallback.frames()[0].props.style.transform, 'scale(0.3125)');
  fallback.resize(project, 320);
  if (!resizeSupported) fallback.event('resize');
  assert.equal(fallback.frames()[0].props.style.transform, 'scale(0.25)');
  fallback.visible(project, false);
  if (!intersectionSupported) fallback.event('scroll');
  assert.equal(fallback.frames().length, 0, 'Fallback visibility checks unload offscreen previews');
  assert.equal(fallback.resizeObservers(), 0);
  assert.equal(fallback.listeners('resize'), 0); assert.equal(fallback.listeners('scroll'), 0);
  const afterStop = fallback.measurements();
  fallback.event('resize'); fallback.event('scroll'); assert.equal(fallback.measurements(), afterStop, 'Stopped previews do no resize/scroll work');
  if (!intersectionSupported) {
    fallback.visible(project, true);
    project.tree.props.onPointerEnter({ pointerType: 'mouse' });
    const beforeStaleIntent = project.frameRenders;
    fallback.visible(project, false); fallback.advance(350);
    assert.equal(project.frameRenders, beforeStaleIntent, 'A stale fallback intent cannot briefly render a frame using old geometry');
  }
  fallback.visible(project, true);
  fallback.nodes(project.tree, 'button')[0].props.onClick(); fallback.render();
  assert.equal(fallback.frames().length, 1);
  fallback.cleanup(); assert.equal(fallback.resizeObservers(), 0); assert.equal(fallback.clock.jobs.size, 0);
  assert.equal(fallback.listeners('resize'), 0); assert.equal(fallback.listeners('scroll'), 0);
}
console.log(`Project preview passed: ${data.webProjects.length} SSR thumbnails/links, zero initial iframes/layout reads/resize observers, ${urls.length} exact allowed sites, 16 policy states, 350ms intent, single active iframe, active-only geometry/resize, all IO/RO support combinations, loading fallback, manual preferences and pointer/keyboard/offscreen/hidden/unmount cleanup. No network or database.`);
