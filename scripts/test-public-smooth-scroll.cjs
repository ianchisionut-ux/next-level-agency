const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(path) {
  const result = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(result.diagnostics.length, 0, path);
  return result.outputText;
}
const component = compile('components/PublicSmoothScroll.tsx');
const motion = compile('lib/public-transitions.ts');
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function runtime(initial = {}, loading) {
  const targets = [];
  function target(extra = {}) {
    const listeners = new Map();
    const object = {
      ...extra,
      addEventListener(type, callback, capture = false) {
        const key = `${type}:${Boolean(capture)}`;
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key).add(callback);
      },
      removeEventListener(type, callback, capture = false) {
        listeners.get(`${type}:${Boolean(capture)}`)?.delete(callback);
      },
      dispatch(type, event = {}) {
        for (const capture of [true, false]) {
          for (const callback of [...(listeners.get(`${type}:${capture}`) || [])]) callback(event);
        }
      },
      listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
    };
    targets.push(object);
    return object;
  }
  const desktop = target({ matches: initial.desktop ?? true });
  const reduced = target({ matches: initial.reduced ?? false });
  const connection = target({ saveData: initial.saveData ?? false });
  const document = target({ hidden: initial.hidden ?? false });
  const window = target({ matchMedia(query) {
    if (query === '(min-width: 1024px) and (hover: hover) and (pointer: fine)') return desktop;
    if (query === '(prefers-reduced-motion: reduce)') return reduced;
    throw new Error(`Unexpected media query: ${query}`);
  } });
  class Anchor { hasAttribute(name) { return name === 'href'; } }
  const instances = [];
  let imports = 0, active = 0;
  class FakeLenis {
    constructor(options) {
      assert.equal(active, 0, 'At most one instance owns the public page');
      active++;
      this.options = options;
      this.actualScroll = 420;
      this.isScrolling = false;
      this.scrolls = [];
      this.stops = 0;
      this.starts = 0;
      this.isStopped = false;
      this.destroyed = 0;
      instances.push(this);
    }
    destroy() {
      assert.equal(this.destroyed++, 0, 'Each instance is destroyed exactly once');
      active--;
    }
    scrollTo(position, options) {
      this.scrolls.push({ position, options });
      this.isScrolling = false;
    }
    stop() { this.stops++; this.isStopped = true; this.isScrolling = false; }
    start() { this.starts++; this.isStopped = false; }
  }
  let pending, committed, cleanup, pathname = '/';
  const react = { useEffect(effect, dependencies) { pending = { effect, dependencies }; } };
  const globals = initial.ssr ? {} : {
    window, document, navigator: initial.noConnection ? {} : { connection }, HTMLAnchorElement: Anchor,
  };
  const motionApi = {};
  vm.runInNewContext(motion, { exports: motionApi, require: () => react, ...globals });
  const api = {};
  vm.runInNewContext(component, { exports: api, ...globals, require(name) {
    if (name === 'react') return react;
    if (name === 'next/navigation') return { usePathname: () => pathname };
    if (name === '@/lib/public-transitions') return motionApi;
    if (name === 'lenis') { imports++; return loading ? loading.promise : { default: FakeLenis }; }
    throw new Error(`Unexpected import: ${name}`);
  } });
  return {
    render(path = pathname) {
      pathname = path;
      assert.equal(api.default(), null, 'The enhancement adds no DOM wrapper');
    },
    commit() {
      const dependencies = Array.from(pending.dependencies);
      if (committed && dependencies.every((value, index) => value === committed[index])) return;
      cleanup?.();
      committed = dependencies;
      cleanup = pending.effect();
    },
    unmount() { cleanup?.(); cleanup = undefined; committed = undefined; },
    change(name, value) {
      const [object, property, event] = {
        desktop: [desktop, 'matches', 'change'], reduced: [reduced, 'matches', 'change'],
        saveData: [connection, 'saveData', 'change'], hidden: [document, 'hidden', 'visibilitychange'],
      }[name];
      object[property] = value;
      object.dispatch(event);
    },
    module: { default: FakeLenis }, instances, window, document, Anchor,
    imports: () => imports, active: () => active,
    listenerCount: () => targets.reduce((sum, object) => sum + object.listenerCount(), 0),
  };
}

(async () => {
  const ssr = runtime({ ssr: true });
  ssr.render();
  assert.equal(ssr.imports(), 0, 'Server rendering does not load Lenis or read browser globals');

  for (let bits = 0; bits < 16; bits++) {
    const app = runtime({ desktop: !(bits & 1), reduced: Boolean(bits & 2), saveData: Boolean(bits & 4), hidden: Boolean(bits & 8) });
    app.render();
    assert.equal(app.imports(), 0, 'Import is deferred until the client effect');
    app.commit();
    await flush();
    assert.equal(app.imports(), Number(bits === 0), `Eligibility state ${bits}`);
    assert.equal(app.active(), Number(bits === 0), `Instance state ${bits}`);
    app.unmount();
    assert.equal(app.active(), 0);
    assert.equal(app.listenerCount(), 0, 'Unmount releases every preference and native-action listener');
  }

  const app = runtime();
  app.render(); app.commit(); await flush();
  const first = app.instances[0];
  assert.equal(first.options.autoRaf, true);
  assert.equal(first.options.syncTouch, false, 'Touch remains native on hybrid devices');
  assert.equal(first.options.anchors, false, 'Lenis does not take ownership of hash navigation');
  for (const selector of ['.public-mobile-menu', 'input', 'textarea', 'select', "[contenteditable='true']", "[role='dialog']"]) {
    assert.equal(first.options.prevent({ matches: selectors => selectors.split(',').map(value => value.trim()).includes(selector) }), true, selector);
  }
  assert.equal(first.options.prevent({ matches: () => false }), false, 'Normal page content remains eligible');
  app.change('desktop', true);
  assert.equal(app.instances.length, 1, 'Repeated eligibility events do not duplicate instances');

  function nativeEvent(properties = {}) {
    return { prevented: 0, stopped: 0, preventDefault() { this.prevented++; }, stopPropagation() { this.stopped++; }, ...properties };
  }
  for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']) {
    first.isScrolling = 'smooth';
    const event = nativeEvent({ key });
    app.document.dispatch('keydown', event);
    assert.equal(first.isScrolling, false, `${key} cancels wheel inertia`);
    assert.equal(first.isStopped, false, `${key} leaves scrolling enabled before the browser action`);
    assert.equal(event.prevented + event.stopped, 0, `${key} remains a browser action`);
    assert.equal(first.stops, first.starts, 'Each inertia cancellation immediately resumes native input');
    assert.equal(first.scrolls.length, 0, 'The handoff never forces a scroll position');
  }
  const count = first.stops;
  first.isScrolling = 'smooth';
  app.document.dispatch('keydown', nativeEvent({ key: 'a' }));
  assert.equal(first.stops, count, 'Typing does not interrupt wheel scrolling');
  const link = nativeEvent({ button: 0, composedPath: () => [{}, new app.Anchor()] });
  app.document.dispatch('click', link);
  assert.equal(first.isScrolling, false, 'Native anchor activation cancels old wheel inertia');
  assert.equal(link.prevented + link.stopped, 0, 'Anchor activation preserves native history, focus and navigation');
  first.isScrolling = 'smooth';
  app.document.dispatch('click', nativeEvent({ ...link, ctrlKey: true }));
  assert.equal(first.isScrolling, 'smooth', 'Modified link activation remains independent');
  for (const event of ['popstate', 'hashchange']) {
    first.isScrolling = 'smooth';
    app.window.dispatch(event);
    assert.equal(first.isScrolling, false, `${event} releases inertia before native restoration`);
  }

  for (const [preference, disabled, enabled] of [['reduced', true, false], ['saveData', true, false], ['hidden', true, false], ['desktop', false, true]]) {
    const instance = app.instances.at(-1);
    app.change(preference, disabled);
    assert.equal(instance.destroyed, 1, `${preference} immediately destroys its frame loop`);
    assert.equal(app.active(), 0);
    app.change(preference, enabled);
    assert.equal(app.active(), 1, `${preference} can resume without a second simultaneous instance`);
  }
  const previous = app.instances.at(-1);
  app.render('/servicii'); app.commit(); await flush();
  assert.equal(previous.destroyed, 1, 'Pathname changes destroy the previous owner');
  assert.equal(app.active(), 1);
  assert.equal(app.instances.at(-1).scrolls.length, 0, 'New routes keep Next scroll restoration untouched');
  const instancesBeforeRender = app.instances.length;
  app.render('/servicii'); app.commit(); await flush();
  assert.equal(app.instances.length, instancesBeforeRender, 'Ordinary rerenders retain one instance');
  app.unmount();
  assert.equal(app.listenerCount(), 0);

  const lateImport = deferred();
  const cancelled = runtime({}, lateImport);
  cancelled.render(); cancelled.commit(); await flush();
  cancelled.change('hidden', true);
  cancelled.change('hidden', false);
  cancelled.unmount();
  lateImport.resolve(cancelled.module);
  await flush();
  assert.equal(cancelled.imports(), 1, 'Preference churn shares the pending import');
  assert.equal(cancelled.instances.length, 0, 'An import resolving after cleanup cannot create an instance');
  assert.equal(cancelled.listenerCount(), 0);

  const pendingImport = deferred();
  const preferenceRace = runtime({}, pendingImport);
  preferenceRace.render(); preferenceRace.commit(); await flush();
  preferenceRace.change('reduced', true);
  pendingImport.resolve(preferenceRace.module);
  await flush();
  assert.equal(preferenceRace.instances.length, 0, 'A pending import rechecks current motion preferences');
  preferenceRace.change('reduced', false);
  assert.equal(preferenceRace.active(), 1);
  preferenceRace.unmount();

  const strict = runtime();
  strict.render(); strict.commit(); strict.unmount();
  strict.render(); strict.commit(); await flush();
  assert.equal(strict.instances.length, 1, 'Strict Mode effect replay cannot create an abandoned instance');
  strict.unmount();
  assert.equal(strict.listenerCount(), 0);

  const failedImport = deferred();
  const fallback = runtime({}, failedImport);
  fallback.render(); fallback.commit(); await flush();
  failedImport.reject(new Error('Optional chunk unavailable'));
  await flush();
  assert.equal(fallback.active(), 0, 'A chunk failure leaves native scrolling in place');
  fallback.unmount();
  const noConnection = runtime({ noConnection: true });
  noConnection.render(); noConnection.commit(); await flush();
  assert.equal(noConnection.active(), 1, 'Browsers without Network Information remain supported');
  noConnection.unmount();
  assert.equal(noConnection.listenerCount(), 0);

  console.log('Public smooth scroll passed: SSR, 16 eligibility states, native action handoff, nested exclusions, live preferences, navigation cleanup, import races, Strict Mode and chunk fallback. Mocked lifecycle tests; no browser wheel simulation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
