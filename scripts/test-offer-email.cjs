const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real route, access wrapper, request validation, offer normalizer
// and message templates. Sessions, provider sends and database are isolated fakes.
const state = { user: { userId: 'test-admin' }, superAdmin: true, missing: false, failUpdate: false, failure: null, defer: null, calls: [], updates: [], invalidated: [], events: [], provider: new Map(), sendAttempts: 0 };
const brief = { id: 'test-brief', createdAt: new Date('2026-11-22T09:00:00Z'), companyName: 'Fixture Company', contactName: 'Fixture Contact', contactEmail: 'fixture@example.invalid', pages: [], ctaGoals: [], contactElements: [] };
const operationKey = '742b7112-8909-4126-bc02-674b5664983c';
const offer = { operationKey, offerNumber: 'NLA-TEST-OFFER', offerDate: '2026-11-22', customerName: 'Fixture Contact', customerCompany: 'Fixture Company', customerEmail: 'recipient@example.invalid', projectTitle: 'Website cu idei ș & <tag>', projectSummary: 'Conținut original ș ✓', vatRate: 0, items: [{ id: 'one', description: 'Design & dezvoltare', details: 'Detalii <sigur>', quantity: 1, unit: 'proiect', unitPrice: 3000 }] };
const modules = new Map();
let config;
const dependencies = {
  'server-only': {},
  'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  'next/cache': { revalidatePath: path => state.invalidated.push(path) },
  '@/lib/session': { getCurrentUser: async () => state.user, isSuperAdmin: async () => state.superAdmin },
  '@/lib/prisma': { prisma: { websiteBrief: {
    findUnique: async query => { assert.equal(query.where.id, brief.id); return state.missing ? null : brief; },
    update: async query => {
      state.events.push('update');
      assert.ok(state.provider.size, 'Offer cannot be marked sent before provider acceptance');
      if (state.failUpdate) { state.failUpdate = false; throw new Error('Isolated storage failure'); }
      state.updates.push(query); return { ...brief, ...query.data };
    },
  } } },
  '@/lib/mailbox/send': { sendMessage: async input => {
    state.sendAttempts++;
    const body = config.messageInput(input);
    state.calls.push({ input, body }); state.events.push('send');
    if (state.failure) throw new config.MailboxError('Rezultat necunoscut; verifică Trimise.', 502, 'SEND_REQUIRES_REVIEW');
    const fingerprint = JSON.stringify(body), existing = state.provider.get(body.operationKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new config.MailboxError('Cheie folosită pentru alt mesaj.', 409, 'IDEMPOTENCY_CONFLICT');
      state.events.push('replay'); return existing.result;
    }
    if (state.defer) await state.defer;
    const result = { id: `fake-email-${state.provider.size + 1}`, threadId: null, accepted: true, operationKey: body.operationKey };
    state.provider.set(body.operationKey, { fingerprint, result }); state.events.push('accepted'); return result;
  } },
};
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const api = {}; modules.set(file, api);
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: api, Buffer, Date, URL, URLSearchParams, Response, Request, Headers,
    process: { env: {} }, require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      if (id === 'sanitize-html') return require(id);
      if (id.startsWith('@/lib/')) return load(`lib/${id.slice('@/lib/'.length)}.ts`);
      if (file.startsWith('lib/mailbox/') && id.startsWith('./')) return load(`lib/mailbox/${id.slice(2)}.ts`);
      throw new Error(`Unmocked dependency: ${id}`);
    },
  }, { filename: file });
  return api;
}
config = load('lib/mailbox/config.ts');
const { POST } = load('app/api/oferte-web/[id]/send-email/route.ts');
const request = (data = offer) => new Request('https://nextlevel.example.invalid/api/oferte-web/test-brief/send-email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof data === 'string' ? data : JSON.stringify(data) });
const send = data => POST(request(data), { params: Promise.resolve({ id: brief.id }) });
async function main() {
  let release;
  state.defer = new Promise(resolve => { release = resolve; });
  const pending = send();
  // Flush async request reads; no live wait or network service is involved.
  for (let turn = 0; turn < 100 && !state.calls.length; turn++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.calls.length, 1, 'Validated route must reach mailbox sending');
  assert.equal(state.updates.length, 0, 'No offer sent timestamp before accepted response');
  assert.equal(state.provider.size, 0);
  release(); const response = await pending; state.defer = null;
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const result = await response.json(); assert.equal(result.sent, true); assert.equal(result.accepted, true); assert.equal(result.emailId, 'fake-email-1');
  assert.equal(result.operationKey, operationKey);
  const call = state.calls[0]; assert.equal(call.input.operationKey, operationKey); assert.equal(call.input.to, offer.customerEmail);
  assert.equal(call.body.to[0], offer.customerEmail); assert.match(call.body.subject, /NLA-TEST-OFFER/);
  assert.ok(call.input.html.includes('Conținut original ș ✓')); assert.ok(call.input.html.includes('&lt;tag&gt;')); assert.ok(call.input.text.includes('Website cu idei ș & <tag>'));
  assert.ok(state.events.indexOf('accepted') < state.events.indexOf('update'));
  const saved = state.updates[0].data;
  assert.equal(saved.status, 'QUOTED'); assert.equal(saved.estimatedValue, 3000); assert.ok(saved.offerEmailSentAt instanceof Date);
  assert.equal(saved.offerSentAt, saved.offerEmailSentAt); assert.equal(saved.offerData.customerEmail, offer.customerEmail);
  assert.ok(state.invalidated.includes('/dashboard/email'));

  const replay = await send(); assert.equal(replay.status, 200); assert.equal((await replay.json()).emailId, result.emailId);
  assert.equal(state.provider.size, 1); assert.ok(state.events.includes('replay'), 'Same key reuses completed mailbox send result');
  const savedBeforeConflict = state.updates.length;
  assert.equal((await send({ ...offer, projectTitle: 'Modified same key' })).status, 409);
  assert.equal(state.updates.length, savedBeforeConflict);

  for (const input of [{ ...offer, operationKey: undefined }, { ...offer, operationKey: 'not-uuid' }, { ...offer, customerEmail: '' }, { ...offer, customerEmail: 'bad@example.invalid\r\nBcc: another@example.invalid' }, '{malformed']) {
    const updates = state.updates.length, providerCount = state.provider.size;
    const invalid = await send(input); assert.equal(invalid.status, 400); assert.equal(state.updates.length, updates); assert.equal(state.provider.size, providerCount);
  }
  state.missing = true; const beforeMissing = state.sendAttempts; assert.equal((await send()).status, 404); assert.equal(state.sendAttempts, beforeMissing); state.missing = false;
  state.user = null; const beforeAuth = state.sendAttempts; assert.equal((await send()).status, 401);
  state.user = { userId: 'not-admin' }; state.superAdmin = false; assert.equal((await send()).status, 403); assert.equal(state.sendAttempts, beforeAuth);
  state.superAdmin = true;

  const updatesBeforeUnknown = state.updates.length; state.failure = 'uncertain';
  const uncertain = await send({ ...offer, operationKey: 'e8ad806e-dba5-418f-9645-55214a759ebe' });
  assert.equal(uncertain.status, 502); const unknownBody = await uncertain.json(); assert.equal(unknownBody.code, 'SEND_REQUIRES_REVIEW'); assert.equal(unknownBody.definiteNoSend, false);
  assert.equal(state.updates.length, updatesBeforeUnknown); state.failure = null;

  state.failUpdate = true; const retryKey = '9ce0f60b-b1cb-42fc-b5b9-c191fa81415a';
  const storageFailure = await send({ ...offer, operationKey: retryKey }); assert.equal(storageFailure.status, 503);
  assert.equal((await storageFailure.json()).definiteNoSend, false, 'Accepted send with failed storage must retain retry identity');
  const acceptedCount = state.provider.size;
  const recovered = await send({ ...offer, operationKey: retryKey }); assert.equal(recovered.status, 200);
  assert.equal(state.provider.size, acceptedCount, 'Storage recovery must not cause a second provider send');
  console.log('Offer e-mail passed: real route/access/validation/templates, native mailbox payload and stable operation key, acceptance-before-save, safe replay/conflict, validation/auth, uncertain send and accepted-send storage recovery. Fake provider/database only; no messages, secrets or network.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
