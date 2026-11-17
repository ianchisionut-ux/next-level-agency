const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Isolated Prisma/HTTP fixtures only. This script never reads credentials or
// invokes a real provider/database; unknown SQL and requests fail immediately.
const key = index => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
function environment() {
  const operations = new Map(), drafts = new Map(), preferences = new Map(), requests = [], sql = [], cache = new Map();
  let transactionTail = Promise.resolve(), mode = 'ok', auth = true;
  const execute = async (query, ...args) => {
    sql.push(query);
    if (query.includes('CREATE ') || query.includes('pg_advisory_xact_lock')) return 0;
    if (query.includes('INSERT INTO nextlevel_mailbox_operations')) { operations.set(args[0], { id: args[0], requestHash: args[2], status: 'RESERVED', draftId: null, result: null }); return 1; }
    if (query.includes('UPDATE nextlevel_mailbox_operations')) {
      const row = operations.get(args[0]); assert.ok(row);
      if (query.includes('SET "draftId"')) row.draftId = args[1];
      else if (query.includes("status='SENT'")) { row.status = 'SENT'; row.result = JSON.parse(args[1]); }
      else if (query.includes('SET status=$2')) row.status = args[1];
      else if (query.includes("status='RESERVED'")) row.status = 'RESERVED';
      else throw new Error(`Unexpected operation update ${query}`);
      return 1;
    }
    if (query.includes('INSERT INTO nextlevel_mailbox_drafts') || query.includes('UPDATE nextlevel_mailbox_drafts')) {
      if (query.startsWith('UPDATE') && !drafts.has(args[0])) return 0;
      drafts.set(args[0], { id: args[0], payload: args[2], summary: args[3], createdAt: new Date(), updatedAt: new Date() }); return 1;
    }
    if (query.includes('DELETE FROM nextlevel_mailbox_drafts')) {
      if (query.includes('AND payload=$3') && drafts.get(args[0])?.payload !== args[2]) return 0;
      return drafts.delete(args[0]) ? 1 : 0;
    }
    if (query.includes('INSERT INTO nextlevel_mailbox_preferences')) { preferences.set(args[0], args[1]); return 1; }
    throw new Error(`Unexpected SQL mutation ${query}`);
  };
  const query = async (query, ...args) => {
    sql.push(query);
    assert.ok(!query.includes('pg_advisory_xact_lock'), 'Prisma must not deserialize PostgreSQL void');
    if (query.includes('FROM nextlevel_mailbox_operations')) { const row = operations.get(args[0]); return row && (!query.includes("status='SENT'") || row.status === 'SENT') ? [row] : []; }
    if (query.includes('FROM nextlevel_mailbox_drafts')) return query.includes('WHERE id=') ? drafts.has(args[0]) ? [drafts.get(args[0])] : [] : [...drafts.values()];
    if (query.includes('FROM nextlevel_mailbox_preferences')) return preferences.has(args[0]) ? [{ signature: preferences.get(args[0]) }] : [];
    throw new Error(`Unexpected SQL read ${query}`);
  };
  const prisma = {
    $executeRawUnsafe: execute, $queryRawUnsafe: query,
    $transaction(callback) { const result = transactionTail.then(() => callback(prisma)); transactionTail = result.catch(() => undefined); return result; },
  };
  const env = { RESEND_API_KEY: 'ISOLATED-NOT-A-REAL-KEY', RESEND_INBOX_ID: 'inbox1', ENCRYPTION_KEY: '1'.repeat(64) };
  const providerFetch = async (url, init) => {
    const request = { url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : null, headers: init.headers };
    requests.push(request);
    assert.ok(request.url.startsWith('https://api.resend.com/'), 'Only the trusted provider may be called');
    const respond = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (request.url.endsWith('/inboxes/inbox1')) return respond({ id: 'inbox1', email_address: mode === 'wrong-inbox' ? 'other@example.com' : 'contact@nextlevel-agency.ro', domain_id: 'domain1' });
    if (request.url.endsWith('/domains/domain1')) return respond({ status: 'partially_verified', capabilities: { sending: 'enabled', receiving: 'enabled' }, records: [{ record: 'DKIM', status: 'verified' }, { record: 'SPF', status: 'verified' }, { record: 'Receiving', type: 'MX', name: '@', status: 'verified' }] });
    if (request.method === 'POST' && request.url.endsWith('/drafts')) return respond({ id: 'providerDraft1' });
    if (request.method === 'POST' && /\/(send|reply|forward)$/.test(request.url)) {
      if (mode === 'uncertain') throw new TypeError('Isolated response loss');
      if (mode === 'rejected') return new Response('{}', { status: 422 });
      return respond({ id: 'sent1' });
    }
    if (request.url.endsWith('/threads/thread1/emails/email1')) return respond({ id: 'email1', direction: 'inbound', from: 'Fixture <sender@example.com>', to: ['contact@nextlevel-agency.ro'], reply_to: [], subject: 'Original', html: '<p>Original</p>', text: 'Original', attachments: [{ id: 'file1', filename: 'fixture.png', size: 4 }] });
    if (request.url.endsWith('/emails/receiving/email1/attachments/file1')) return respond({ id: 'file1', filename: 'fixture.png', size: 4, content_type: 'image/png', download_url: mode === 'evil-attachment' ? 'https://evil.example/attachment' : 'https://inbound-cdn.resend.com/fixture' });
    throw new Error(`Unexpected HTTP request ${request.method} ${request.url}`);
  };
  function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const api = {}; cache.set(absolute, api);
    const compiled = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(compiled, {
      exports: api, process: { env, cwd: () => process.cwd() }, Buffer, AbortSignal, URL, URLSearchParams, Response, Request, fetch: providerFetch, console,
      require(id) {
        if (id === 'server-only') return {};
        if (id === '@/lib/prisma') return { prisma };
        if (id === '@/lib/session') return { getCurrentUser: async () => auth === null ? null : { userId: 'fixture' }, isSuperAdmin: async () => auth === true };
        if (id === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
        if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
        if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id + '.ts'));
        if (['node:crypto', 'node:fs/promises', 'node:path', 'crypto', 'sanitize-html'].includes(id)) return require(id);
        throw new Error(`Unexpected dependency ${id}`);
      },
    }, { filename: absolute });
    return api;
  }
  return { load, requests, operations, drafts, preferences, sql, setMode: value => { mode = value; }, setAuth: value => { auth = value; } };
}
const message = operationKey => ({ to: 'receiver@example.com', cc: ['copy@example.com'], bcc: ['private@example.com'], subject: 'Isolated fixture', text: 'Fixture body', html: '<p>Fixture body <img src="https://example.com/image.png"></p>', attachments: [{ filename: 'fixture.txt', contentType: 'text/plain', content: Buffer.from('isolated attachment').toString('base64') }], operationKey });

(async () => {
  const fixture = environment(), config = fixture.load('lib/mailbox/config.ts'), provider = fixture.load('lib/mailbox/provider.ts'), send = fixture.load('lib/mailbox/send.ts'), draftApi = fixture.load('lib/mailbox/drafts.ts');
  assert.throws(() => config.messageInput({ ...message(key(1)), subject: 'Header\r\nBcc:bad@example.com' }), /Subiectul/);
  assert.throws(() => config.messageInput({ ...message(key(1)), to: 'ok@example.com\r\nBcc:bad@example.com' }), /Adresa/);
  assert.throws(() => config.messageInput({ ...message(key(1)), attachments: [{ filename: '../path', content: 'AAAA', contentType: 'text/plain' }] }), /atașamentului/);
  await assert.rejects(() => config.readJson(new Request('https://local.test/api/mailbox/send', { method: 'POST', body: '{}', headers: { 'Content-Length': '4400001' } })), /4,4 MB/);
  const cleaned = config.messageInput({ ...message(key(10)), html: '<p onclick="alert(1)" style="color:#123456;position:fixed;background:url(https://evil.example/x)">Safe <a href="jav&#x61;script:alert(1)">link</a><img src="https://example.com/image.png" onerror="alert(1)"><img src="data:image/svg+xml,bad"></p><script>alert(1)</script><iframe src="https://evil.example"></iframe><form action="https://evil.example"><input name="secret"></form>' }).html;
  assert.ok(cleaned.includes('color:#123456') && cleaned.includes('https://example.com/image.png'));
  assert.ok(!/onclick|onerror|javascript|<script|<iframe|<form|<input|position|background|data:image/i.test(cleaned), 'Server allowlist must strip executable HTML/CSS/URL content');
  assert.throws(() => config.messageInput({ ...message(key(10)), text: '', html: '<script>alert(1)</script>' }), /nu conține/);
  const status = await provider.mailboxStatus();
  assert.equal(status.configured, true); assert.equal(status.sendingReady, true); assert.equal(status.receivingReady, true);
  assert.equal(fixture.requests.filter(request => request.method !== 'GET').length, 0, 'Status must never send or modify provider settings');
  assert.ok(!JSON.stringify(status).includes('ISOLATED-NOT-A-REAL-KEY'));

  const sent = await send.sendMessage(message(key(1)));
  assert.equal(sent.accepted, true);
  const create = fixture.requests.find(request => request.method === 'POST' && request.url.endsWith('/drafts'));
  assert.equal(create.body.bcc[0], 'private@example.com');
  assert.equal(create.body.attachments[0].content_type, 'text/plain');
  assert.match(create.body.html, /<img/);
  const callsBeforeReplay = fixture.requests.length;
  assert.equal((await send.sendMessage(message(key(1)))).id, sent.id);
  assert.equal(fixture.requests.length, callsBeforeReplay, 'Durable replay returns locally without calling Resend');
  await assert.rejects(() => send.sendMessage({ ...message(key(1)), text: 'Different body' }), /alt mesaj/);

  const concurrent = environment(), concurrentSend = concurrent.load('lib/mailbox/send.ts');
  const pair = await Promise.allSettled([concurrentSend.sendMessage(message(key(2))), concurrentSend.sendMessage(message(key(2)))]);
  assert.ok(pair.some(result => result.status === 'fulfilled'));
  assert.equal(concurrent.requests.filter(request => request.url.endsWith('/send')).length, 1);

  const unknown = environment(), unknownSend = unknown.load('lib/mailbox/send.ts'); unknown.setMode('uncertain');
  await assert.rejects(() => unknownSend.sendMessage(message(key(3))), error => /nu a putut fi confirmat/.test(error.message) && error.definiteNoSend !== true);
  assert.equal(unknown.operations.get(key(3)).status, 'UNCERTAIN');
  unknown.setMode('ok');
  await assert.rejects(() => unknownSend.sendMessage(message(key(3))), /retrimiterea|reîncercarea/);
  assert.equal(unknown.requests.filter(request => request.url.endsWith('/send')).length, 1, 'Unknown result remains blocked beyond provider replay-window semantics');

  const rejected = environment(), rejectedSend = rejected.load('lib/mailbox/send.ts'); rejected.setMode('rejected');
  await assert.rejects(() => rejectedSend.sendMessage(message(key(4))), error => error.definiteNoSend === true); assert.equal(rejected.operations.get(key(4)).status, 'FAILED');
  rejected.setMode('ok'); await rejectedSend.sendMessage(message(key(4)));
  assert.equal(rejected.requests.filter(request => request.url.endsWith('/drafts')).length, 1, 'Confirmed failed send reuses its existing unsent provider draft');

  await assert.rejects(() => send.sendMessage({ ...message(key(5)), emailId: 'email1' }, 'thread1'), /Destinatarul răspunsului/);
  await send.sendMessage({ ...message(key(6)), to: 'sender@example.com', emailId: 'email1' }, 'thread1');
  await send.sendMessage({ ...message(key(7)), emailId: 'email1' }, 'thread1', true);
  assert.ok(fixture.requests.some(request => request.url.endsWith('/forward') && request.body.to[0] === 'receiver@example.com'));

  await draftApi.saveDraft({ ...message(key(8)), kind: 'new' });
  const stored = fixture.drafts.get(key(8));
  assert.ok(!stored.payload.includes('Fixture body') && !stored.summary.includes('receiver@example.com'), 'Draft content and summary must be encrypted');
  const restored = await draftApi.getDraft(key(8)); assert.equal(restored.html, config.messageInput(message(key(8))).html); assert.equal(restored.attachments[0].content, message(key(8)).attachments[0].content);
  const draftSent = await draftApi.sendDraft(key(8), { operationKey: key(8) }); assert.equal(fixture.drafts.has(key(8)), false);
  const beforeDraftReplay = fixture.requests.length;
  assert.equal((await draftApi.sendDraft(key(8), { operationKey: key(8) })).id, draftSent.id);
  assert.equal(fixture.requests.length, beforeDraftReplay, 'Draft-send replay survives draft deletion');
  await assert.rejects(() => draftApi.sendDraft(key(9), { operationKey: key(8) }), /altei ciorne/);
  await draftApi.preferences({ signature: '<p>Fixture signature</p>' });
  assert.ok(![...fixture.preferences.values()][0].includes('Fixture signature'));
  assert.equal((await draftApi.preferences()).signature, '<p>Fixture signature</p>');
  assert.equal((await draftApi.preferences({ signature: '' })).signature, '');
  await draftApi.saveDraft({ ...message(key(11)), kind: 'new' });
  const oldDraftToken = fixture.drafts.get(key(11)).payload;
  await draftApi.saveDraft({ ...message(key(11)), text: 'Concurrent edit must survive', kind: 'new' }, key(11));
  await draftApi.deleteDraft(key(11), oldDraftToken);
  assert.equal((await draftApi.getDraft(key(11))).text, 'Concurrent edit must survive', 'A sent snapshot must not delete edits saved while sending');

  assert.equal((await provider.attachmentInfo('thread1', 'email1', 'file1')).contentType, 'image/png');
  fixture.setMode('evil-attachment');
  await assert.rejects(() => provider.attachmentInfo('thread1', 'email1', 'file1'), /nu provine de la Resend/);
  await assert.rejects(() => provider.attachmentInfo('thread1', 'email1', 'otherFile'), /nu aparține/);

  const access = fixture.load('lib/mailbox/access.ts'); let called = false;
  const action = access.mailboxApi(async () => { called = true; return Response.json({ ok: true }); });
  fixture.setAuth(false); assert.equal((await action()).status, 403); assert.equal(called, false);
  fixture.setAuth(null); assert.equal((await action()).status, 401); assert.equal(called, false);
  const rejectedAccess = rejected.load('lib/mailbox/access.ts'); rejected.setMode('rejected');
  const safeRejection = await rejectedAccess.mailboxApi(async () => Response.json(await rejectedSend.sendMessage(message(key(12)))))();
  assert.equal((await safeRejection.json()).definiteNoSend, true);
  const unknownAccess = unknown.load('lib/mailbox/access.ts'); unknown.setMode('uncertain');
  const unknownRejection = await unknownAccess.mailboxApi(async () => Response.json(await unknownSend.sendMessage(message(key(13)))))();
  assert.equal((await unknownRejection.json()).definiteNoSend, false);
  console.log('Mailbox core tests passed: superadmin authorization, input/attachment validation, readiness reads, HTML/CC/BCC, durable idempotency/concurrency/uncertainty, native replies/forwards, encrypted drafts/signature and replay after draft deletion. No real network or database access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
