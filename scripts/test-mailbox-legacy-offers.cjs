const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync('lib/mailbox/legacy-offers.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const address = 'contact@nextlevel-agency.ro';
const fixture = (id = 'fixture-email') => ({ id, from: `Next Level <${address}>`, to: ['recipient@example.invalid'], subject: `Propunere Next Level NLA-TEST-${id} – Site exemplu`, created_at: '2026-11-22 09:06:00+00', html: '<p>Original ș ✓</p>', text: 'Original ș ✓', cc: [], bcc: [], reply_to: [], last_event: 'delivered' });
function harness(emails = [fixture()], options = {}) {
  const requests = [], bodies = [], summaries = [], saved = new Map(), known = new Set(options.native || []);
  const api = {}, provider = {
    async resendRequest(url, mutation) {
      assert.equal(mutation, undefined, 'Recovery must never call a send/draft endpoint or mutate the provider');
      assert.ok(url.startsWith('/emails?') || /^\/emails\/[\w-]+$/.test(url)); requests.push(url);
      if (options.fail) throw new Error('Provider unavailable');
      if (url.startsWith('/emails?')) {
        assert.equal(new URLSearchParams(url.split('?')[1]).get('limit'), '100');
        if (options.pages) return options.pages[requests.filter(item => item.startsWith('/emails?')).length - 1];
        return { data: emails.map(({ html, text, ...row }) => row), has_more: false };
      }
      const id = url.split('/').at(-1), row = emails.find(email => email.id === id);
      if (options.detail) return options.detail(row);
      return row;
    },
  };
  const prisma = {
    websiteBrief: { async findMany(query) {
      assert.deepEqual(JSON.parse(JSON.stringify(query.where.offerEmailSentAt)), { not: null });
      assert.equal(query.where.offerData.path[0], 'offerNumber');
      const number = query.where.offerData.equals;
      if (options.noBrief) return [];
      return [{ offerData: { offerNumber: number, customerEmail: options.otherRecipient || 'recipient@example.invalid', projectSummary: 'Edited after sending, never use this as historical body' } }];
    } },
    async $queryRawUnsafe(sql, mailbox, id) {
      assert.match(sql, /^SELECT /); assert.doesNotMatch(sql, /invoices|payments|receipts/i);
      assert.equal(mailbox, address);
      return known.has(id) ? [{ id: 'native-operation' }] : [];
    },
  };
  const archive = {
    async getArchivedThread(inbox, id) { assert.equal(inbox, 'test-inbox'); return saved.has(id) ? { thread: { id }, emails: [saved.get(id)] } : null; },
    async archiveEmail(inbox, thread, email) { assert.equal(inbox, 'test-inbox'); bodies.push({ thread, email }); saved.set(thread, email); },
    async archiveThreadSummary(inbox, thread, summary) { assert.equal(inbox, 'test-inbox'); summaries.push({ thread, summary }); },
  };
  vm.runInNewContext(code, { exports: api, URLSearchParams, Date, require(id) {
    if (id === 'server-only') return {};
    if (id === '@/lib/prisma') return { prisma };
    if (id === './archive') return archive;
    if (id === './provider') return provider;
    if (id === './store') return { mailboxSchema: async () => {} };
    if (id === './config') return { MAILBOX_ADDRESS: address, providerId(value) { assert.equal(typeof value, 'string'); assert.match(value, /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/); return value; } };
    throw new Error(`Unmocked dependency ${id}`);
  } });
  return { run: () => api.synchronizeLegacyOffers('test-inbox'), requests, bodies, summaries, saved };
}
async function main() {
  const original = fixture(), good = harness([original]);
  assert.deepEqual(JSON.parse(JSON.stringify(await good.run())), { imported: 1, skipped: 0, scanned: 1, partial: false });
  assert.equal(good.bodies[0].thread, 'legacy_fixture-email');
  assert.equal(good.bodies[0].email.html, original.html); assert.equal(good.bodies[0].email.text, original.text);
  assert.equal(good.bodies[0].email.received_at, '2026-11-22T09:06:00.000Z');
  assert.equal(good.bodies[0].email.id, original.id); assert.equal(good.bodies[0].email.direction, 'outbound');
  assert.equal(good.summaries[0].summary.source, 'legacy-offer'); assert.equal(good.summaries[0].summary.delivery_status, 'delivered');
  assert.equal(good.summaries[0].summary.folder, 'sent'); assert.equal(good.summaries[0].summary.has_sent, true);
  assert.equal((await good.run()).imported, 0); assert.equal(good.bodies.length, 1, 'Repeated sync must not duplicate sent history');

  for (const candidate of [
    { ...fixture(), from: 'Someone <other@example.invalid>' },
    { ...fixture(), from: 'Fake <contact@nextlevel-agency.ro> extra' },
    { ...fixture(), subject: 'Resetează-ți parola' },
    { ...fixture(), to: ['recipient@example.invalid', 'unexpected@example.invalid'] },
  ]) {
    const test = harness([candidate]); assert.equal((await test.run()).imported, 0); assert.equal(test.bodies.length, 0); assert.equal(test.requests.length, 1);
  }
  for (const options of [{ noBrief: true }, { otherRecipient: 'changed@example.invalid' }, { native: ['fixture-email'] }]) {
    const test = harness([fixture()], options); assert.equal((await test.run()).imported, 0); assert.equal(test.requests.length, 1);
  }
  for (const detail of [
    row => ({ ...row, id: 'different' }), row => ({ ...row, from: 'other@example.invalid' }),
    row => ({ ...row, html: null, text: null }), row => ({ ...row, created_at: 'invalid' }),
    row => ({ ...row, last_event: 'scheduled' }), row => ({ ...row, attachments: [{ id: 'unexpected-file' }] }),
  ]) {
    const test = harness([fixture()], { detail }); const result = await test.run();
    assert.equal(result.partial, true); assert.ok(result.warning); assert.equal(test.bodies.length, 0);
  }
  const failed = await harness([fixture()], { fail: true }).run(); assert.equal(failed.partial, true); assert.ok(failed.warning);
  const limited = harness(Array.from({ length: 6 }, (_, index) => fixture(`fixture-${index}`)));
  const first = await limited.run(); assert.equal(first.imported, 5); assert.equal(first.partial, true);
  const second = await limited.run(); assert.equal(second.imported, 1); assert.equal(second.partial, false); assert.equal(limited.bodies.length, 6);
  const listing = fixture(); const twoPages = harness([listing], { pages: [{ data: [{ ...listing, id: 'ignored', subject: 'Not an offer' }], has_more: true }, { data: [listing], has_more: false }] });
  assert.equal((await twoPages.run()).imported, 1); assert.ok(twoPages.requests.some(url => url.includes('after=ignored')));
  const stalled = harness([], { pages: [{ data: [], has_more: true }] }); assert.equal((await stalled.run()).partial, true);
  const bounded = harness([], { pages: [1, 2, 3].map(index => ({ data: [{ ...fixture(`ignore-${index}`), subject: 'Not an offer' }], has_more: true })) });
  assert.equal((await bounded.run()).partial, true); assert.equal(bounded.requests.length, 3);
  console.log('Legacy offers passed: original bodies/date/status, exact sender/offer/recipient, native and archive deduplication, five-import limit, pagination bounds and explicit partial failures. Fake GET-only provider/store; no email, network, secrets or production database.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
