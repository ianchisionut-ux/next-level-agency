const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/web-offer-print.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: api, setTimeout, clearTimeout });

const page = { width: 210 * 96 / 25.4, height: 297 * 96 / 25.4 };
let fitted = 0;
for (let height = 300; height < 1600; height += 0.37) {
  try {
    const fit = api.offerPrintGeometry(page.width, height, page.width, page.height);
    assert.ok(fit.scale <= 1 && fit.scale >= 0.72);
    assert.ok(fit.top + height * fit.scale <= page.height - 2 + 1e-8, 'Entire offer including footer must fit the single page');
    assert.ok(fit.left >= 2 - 1e-8 && fit.left + page.width * fit.scale <= page.width - 2 + 1e-8);
    fitted++;
  } catch (error) { assert.ok(height > (page.height - 4) / 0.72); }
}
assert.ok(fitted > 3000);
for (const dimensions of [[0, 1, 1, 1], [1, NaN, 1, 1], [1, 1, Infinity, 1], [1, 1, 1, -1]]) assert.throws(() => api.offerPrintGeometry(...dimensions));
assert.throws(() => api.offerPrintGeometry(page.width, 3000, page.width, page.height), /prea lungă/);
const document = api.offerPrintDocument('<article class="web-offer-paper">Oferta</article>', '', 'https://example.test', '</title><script>test</script>');
assert.ok(document.includes('&lt;/title&gt;&lt;script&gt;test&lt;/script&gt;'));
assert.ok(!document.includes('<script>'));

function fixture({ fontReady = Promise.resolve(), images = [], links = [], height = 1250 } = {}) {
  const calls = [], paper = { style: {}, scrollHeight: height, getBoundingClientRect: () => ({ width: page.width, height }) };
  const win = { closed: false, document: { fonts: { ready: fontReady }, images,
    querySelectorAll: () => links,
    querySelector: selector => selector === '.web-offer-paper' ? paper : { getBoundingClientRect: () => page },
  }, focus: () => calls.push('focus'), print: () => calls.push('print') };
  return { win, calls, paper };
}

(async () => {
  let ready;
  const waiting = fixture({ fontReady: new Promise(resolve => { ready = resolve; }) });
  const printing = api.prepareOfferPrint(waiting.win);
  await Promise.resolve(); assert.equal(waiting.calls.length, 0, 'Never print before fonts are ready');
  ready(); await printing;
  assert.equal(waiting.calls.join(','), 'focus,print');
  assert.ok(Number(waiting.paper.style.transform.match(/[\d.]+/)[0]) < 1, 'Overflowing offer is scaled instead of split');
  const imageFailure = fixture({ images: [{ complete: true, naturalWidth: 0 }] });
  await assert.rejects(api.prepareOfferPrint(imageFailure.win), /Sigla/); assert.equal(imageFailure.calls.length, 0);
  const tooLong = fixture({ height: 3000 });
  await assert.rejects(api.prepareOfferPrint(tooLong.win), /prea lungă/); assert.equal(tooLong.calls.length, 0);
  const events = {};
  const stylesheet = fixture({ links: [{ sheet: null, addEventListener: (event, callback) => { events[event] = callback; } }] });
  const loaded = api.prepareOfferPrint(stylesheet.win);
  await Promise.resolve(); assert.equal(stylesheet.calls.length, 0, 'Never measure before linked preview CSS loads');
  events.load(); await loaded; assert.equal(stylesheet.calls.at(-1), 'print');
  console.log(`Offer print passed: ${fitted} fractional-height fits retain the full footer on one A4 page, no enlargement, legibility guard, font/style/image readiness, missing-asset rejection and escaped title. No browser, network, database or messages.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
