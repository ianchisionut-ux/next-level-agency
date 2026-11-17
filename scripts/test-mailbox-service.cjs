const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

class MailboxError extends Error { constructor(message, status = 400, code = 'ERROR') { super(message); this.status = status; this.code = code; } }
class ProviderError extends MailboxError {}
let online = true, mismatch = false, provider404 = false, attachmentCached = true, wrongSize = false;
let localUpdates = 0, archived = 0, fetches = 0;
let datasets = null, enqueueFailure = null, checkpointFailure = null, chunkedThread = null;
let pendingJobs = 0, deferredJobs = 0, tick = 0, leaseSequence = 0, scanNow = null, enqueueElapsed = 0;
const durableScans = new Map(), leases = new Map(), queuedEmails = new Set(), scanCalls = [], enqueueCalls = [];
class ServiceDate extends Date { static now() { return scanNow === null ? Date.now() : scanNow; } }
const summary = { id: 'thread1', subject: 'Fixture', from: 'sender@example.com', to: ['contact@nextlevel-agency.ro'], preview: '', unread: true, messageCount: 1, folder: 'inbox', lastMessageAt: '2026-11-17T12:00:00Z' };
const email = { id: 'email1', from: 'sender@example.com', to: ['contact@nextlevel-agency.ro'], text: 'Archived fixture', direction: 'inbound', attachments: [{ id: 'file1', content_id: 'cid-fixture' }] };
const cached = { thread: summary, emails: [email], nextCursor: null, archived: true };
const metadata = [];
const config = { MAILBOX_ADDRESS: 'contact@nextlevel-agency.ro', MailboxError, mailboxConfig: () => ({ inboxId: 'inbox1', apiKey: 'fixture-not-real' }), providerId: value => { if (typeof value !== 'string' || !/^[a-z0-9_-]+$/i.test(value)) throw new MailboxError('Bad ID'); return value; } };
const provider = {
  ProviderError,
  resolveInbox: async () => { if (mismatch) throw new MailboxError('Wrong mailbox', 503, 'INBOX_ADDRESS_MISMATCH'); if (!online) throw new ProviderError('Offline', 502, 'RESEND_503'); return { id: 'inbox1' }; },
  mailboxStatus: async () => ({ configured: true, inboxId: 'inbox1', sendingReady: true, receivingReady: true }),
  listThreads: async (folder, after, inboxId) => {
    if (!datasets) return { items: [summary], rawThreads: [{ id: 'thread1', subject: 'Fixture', from: summary.from, to: summary.to, received_at: summary.lastMessageAt, folder: 'inbox', read: false, email_count: 1 }], nextCursor: null };
    assert.equal(inboxId, 'inbox1'); scanCalls.push({ folder, after: after || null });
    const all = datasets[folder] || [], start = after ? all.findIndex(thread => thread.id === after) + 1 : 0;
    if (after) assert.ok(start > 0, 'A provider cursor must refer to its actual page');
    const page = all.slice(start, start + 30);
    return { items: [], rawThreads: page, nextCursor: start + page.length < all.length ? page.at(-1).id : null };
  },
  threadDetails: async () => { if (provider404) throw new ProviderError('Expired provider body', 404, 'RESEND_404'); return { thread: summary, rawEmails: [email], emails: [email], nextCursor: null }; },
  normalizeEmail: raw => ({ ...raw, attachments: raw.attachments.map(file => ({ ...file, contentId: file.content_id, inline: Boolean(file.content_id) })) }),
  updateThread: async () => { if (provider404) throw new ProviderError('Expired provider thread', 404, 'RESEND_404'); return { thread: summary }; },
  attachmentInfo: async () => ({ url: 'https://inbound-cdn.resend.com/fixture', filename: 'fixture.png', contentType: 'image/png', size: wrongSize ? 5 : 4 }),
};
const archive = {
  archiveThreadSummary: async (_inbox, _thread, value) => { metadata.push(value); },
  archiveEmail: async (_inbox, _thread, value) => { archived++; return value; },
  getArchivedThread: async () => cached,
  listArchivedThreads: async () => ({ items: [summary], nextCursor: null }),
  updateArchivedThread: async (_inbox, _thread, value) => { localUpdates++; return { ...cached, thread: { ...summary, ...(value.read === undefined ? {} : { unread: !value.read }), ...(value.folder ? { folder: value.folder } : {}) } }; },
  getArchivedAttachment: async () => attachmentCached ? { data: Buffer.from('SAFE'), filename: 'fixture.html', contentType: 'text/html' } : null,
  enqueueThreadArchive: async (_inbox, threadId, after) => {
    enqueueCalls.push({ threadId, after: after || null });
    if (scanNow !== null) scanNow += enqueueElapsed;
    if (enqueueFailure === threadId) { enqueueFailure = null; throw new ProviderError('Interrupted enqueue', 502, 'FIXTURE_ENQUEUE_FAILED'); }
    const emailId = `${threadId}:${after || 'head'}`, fresh = !queuedEmails.has(emailId); queuedEmails.add(emailId);
    if (threadId === chunkedThread && !after) return { queued: fresh ? 300 : 0, nextCursor: 'email300' };
    if (threadId === chunkedThread) assert.equal(after, 'email300');
    return { queued: fresh ? 1 : 0, nextCursor: null };
  },
  claimMailboxArchiveScan: async (inboxId, folder) => {
    const key = `${inboxId}:${folder}`;
    if (leases.has(key)) return null;
    const row = durableScans.get(key) || { inboxId, folder, afterCursor: null, nextCursor: null, threadIds: [], emailCursor: null, completedAt: null, lastAttemptAt: null, revision: 0 };
    const leaseToken = `lease_${++leaseSequence}`; leases.set(key, leaseToken); durableScans.set(key, structuredClone(row));
    return structuredClone({ ...row, leaseToken });
  },
  saveMailboxArchiveScan: async (state, update) => {
    const key = `${state.inboxId}:${state.folder}`, current = durableScans.get(key);
    assert.equal(leases.get(key), state.leaseToken); assert.equal(current.revision, state.revision);
    if (checkpointFailure === state.threadIds[0] && update.threadIds && update.threadIds[0] !== state.threadIds[0]) { checkpointFailure = null; throw new Error('Checkpoint interrupted after enqueue'); }
    const next = { ...state, ...update, revision: current.revision + 1, lastAttemptAt: new Date(1_800_000_000_000 + ++tick).toISOString() };
    durableScans.set(key, structuredClone(next)); return structuredClone(next);
  },
  releaseMailboxArchiveScan: async state => { const key = `${state.inboxId}:${state.folder}`; if (leases.get(key) === state.leaseToken) leases.delete(key); },
  processMailboxArchiveJobs: async () => ({ processed: 1, completed: 1, deferred: deferredJobs, pending: pendingJobs }),
  mailboxArchiveStatus: async () => ({ emails: 1, attachments: 1, pending: pendingJobs, deferred: deferredJobs }),
};
function loadService() {
 const api = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/mailbox/service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: api, Buffer, Response, AbortSignal, Date: ServiceDate, process: { env: { ENCRYPTION_KEY: '1'.repeat(64) } },
  fetch: async url => { fetches++; assert.equal(url, 'https://inbound-cdn.resend.com/fixture'); return new Response(Buffer.from('SAFE'), { headers: { 'Content-Type': 'image/png' } }); },
  require(id) { if (id === 'server-only') return {}; if (id === './config') return config; if (id === './provider') return provider; if (id === './archive') return archive; throw new Error(`Unexpected dependency ${id}`); },
});
 return api;
}
let api = loadService();

function resetScan(count = 0) {
  durableScans.clear(); leases.clear(); queuedEmails.clear(); scanCalls.length = 0; enqueueCalls.length = 0;
  enqueueFailure = checkpointFailure = chunkedThread = null; pendingJobs = deferredJobs = tick = 0; scanNow = null; enqueueElapsed = 0;
  datasets = { inbox: Array.from({ length: count }, (_, index) => ({ id: `thread${String(index + 1).padStart(3, '0')}`, subject: 'Fixture', folder: 'inbox' })), sent: [], archive: [] };
  api = loadService();
}

(async () => {
  const list = await api.mailboxThreads('sent');
  assert.equal(list.items.length, 1); assert.equal(metadata[0].has_sent, true);
  const detail = await api.mailboxThread('thread1');
  assert.equal(archived, 1); assert.equal(detail.emails[0].attachments[0].contentId, 'cid-fixture');
  assert.equal(detail.rawEmails, undefined, 'Raw provider payload must not escape the DTO');
  provider404 = true;
  assert.equal((await api.mailboxThread('thread1')).archived, true, 'Expired provider body remains available locally');
  const changed = await api.mailboxUpdate('thread1', { archived: true, unread: false });
  assert.equal(changed.thread.folder, 'archive'); assert.equal(changed.thread.unread, false); assert.ok(changed.warning);
  assert.equal(localUpdates, 1, 'Read/archive changes must work after provider retention');
  online = false;
  assert.ok((await api.mailboxThreads('inbox')).warning);
  const attachment = await api.mailboxAttachment('thread1', 'email1', 'file1', true);
  assert.equal(attachment.headers.get('Content-Type'), 'application/octet-stream');
  assert.match(attachment.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(await attachment.text(), 'SAFE'); assert.equal(fetches, 0);
  online = true; attachmentCached = false;
  const image = await api.mailboxAttachment('thread1', 'email1', 'file1', true);
  assert.equal(image.headers.get('Content-Type'), 'image/png'); assert.match(image.headers.get('Content-Disposition'), /^inline/);
  wrongSize = true;
  await assert.rejects(() => api.mailboxAttachment('thread1', 'email1', 'file1', true), /Dimensiunea/);
  mismatch = true;
  await assert.rejects(() => api.mailboxThreads('inbox'), /Wrong mailbox/);
  mismatch = false; provider404 = false;

  resetScan(65);
  const first = await api.synchronizeMailbox({ maxScanSteps: 5 });
  assert.equal(first.partial, true);
  const held = durableScans.get('inbox1:inbox');
  assert.equal(held.afterCursor, null, 'Page cursor cannot advance while its IDs remain');
  assert.equal(held.nextCursor, 'thread030'); assert.equal(held.threadIds[0], 'thread004');
  assert.equal(held.threadIds.length, 27); assert.equal(leases.size, 0);
  // New head mail must not evict the original page snapshot between instances.
  datasets.inbox.unshift({ id: 'new_head_1' }, { id: 'new_head_2' });
  api = loadService();
  const resumed = await api.synchronizeMailbox({ maxScanSteps: 100 });
  assert.equal(resumed.partial, false); assert.equal(resumed.scanPartial, false);
  assert.ok(scanCalls.some(call => call.folder === 'inbox' && call.after === 'thread030'));
  assert.ok(scanCalls.some(call => call.folder === 'inbox' && call.after === 'thread060'));
  assert.equal(new Set(enqueueCalls.map(call => call.threadId)).size, 65);
  assert.ok(!enqueueCalls.some(call => call.threadId.startsWith('new_head')), 'New head messages wait for the next complete cycle');
  assert.equal(durableScans.get('inbox1:inbox').afterCursor, null, 'A complete scan rotates back to head');
  await api.synchronizeMailbox({ maxScanSteps: 100 });
  assert.ok(enqueueCalls.some(call => call.threadId === 'new_head_1'));
  assert.ok(enqueueCalls.some(call => call.threadId === 'new_head_2'));

  resetScan(40); enqueueFailure = 'thread002';
  const interrupted = await api.synchronizeMailbox({ maxScanSteps: 100 });
  assert.equal(interrupted.partial, true);
  assert.equal(interrupted.cursors.find(row => row.folder === 'inbox').error, 'FIXTURE_ENQUEUE_FAILED');
  assert.equal(durableScans.get('inbox1:inbox').threadIds[0], 'thread002');
  const beforeResume = enqueueCalls.length; api = loadService();
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 100 })).partial, false);
  assert.equal(enqueueCalls[beforeResume].threadId, 'thread002', 'A failed enqueue must be resumed, never skipped');
  assert.equal(new Set(enqueueCalls.map(call => call.threadId)).size, 40);

  resetScan(2); checkpointFailure = 'thread001';
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 100 })).partial, true);
  assert.equal(durableScans.get('inbox1:inbox').threadIds[0], 'thread001');
  api = loadService();
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 100 })).partial, false);
  assert.equal(enqueueCalls.filter(call => call.threadId === 'thread001').length, 2, 'Uncertain checkpoint repeats the idempotent enqueue');
  assert.equal(queuedEmails.size, 2, 'A replay cannot duplicate durable email jobs');

  resetScan(1); chunkedThread = 'thread001';
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 1 })).partial, true);
  assert.equal(durableScans.get('inbox1:inbox').emailCursor, 'email300');
  assert.equal(durableScans.get('inbox1:inbox').threadIds[0], 'thread001');
  api = loadService();
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 3 })).partial, false);
  assert.equal(enqueueCalls[1].after, 'email300', 'Nested email pagination resumes after the already-enqueued batch');

  resetScan(40); scanNow = 1000; enqueueElapsed = 1200;
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 100, scanBudgetMs: 1000 })).partial, true);
  assert.equal(enqueueCalls.length, 1, 'A request cannot keep scanning after its budget');
  enqueueElapsed = 0;
  const callsAtBudget = scanCalls.length;
  await api.synchronizeMailbox({ maxScanSteps: 1 });
  assert.equal(scanCalls[callsAtBudget].folder, 'sent', 'An untouched folder goes first after budget exhaustion');
  await api.synchronizeMailbox({ maxScanSteps: 1 });
  assert.equal(scanCalls.at(-1).folder, 'archive', 'A long inbox cannot starve Archive');

  resetScan(1); leases.set('inbox1:inbox', 'another_runner');
  const busy = await api.synchronizeMailbox({ maxScanSteps: 100 });
  assert.equal(busy.partial, true); assert.equal(busy.cursors.find(row => row.folder === 'inbox').busy, true);
  assert.equal(enqueueCalls.length, 0); assert.equal(leases.get('inbox1:inbox'), 'another_runner');
  leases.delete('inbox1:inbox');
  assert.equal((await api.synchronizeMailbox({ maxScanSteps: 100 })).partial, false);

  resetScan(0); pendingJobs = 1;
  assert.equal((await api.synchronizeMailbox()).partial, true, 'Pending archive bytes must never report complete');
  pendingJobs = 0; deferredJobs = 1;
  assert.equal((await api.synchronizeMailbox()).partial, true, 'Deferred archive work must never report complete');

  let cronSync = { partial: true, cursors: [{ folder: 'inbox', complete: false }] }, cronArchive = { pending: 0, deferred: 0 }, cronCalls = 0, cronThrows = false;
  const cron = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/cron/mailbox/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: cron, process: { env: { CRON_SECRET: 'local-fixture-secret' } },
    require(id) {
      if (id === 'next/server') return { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { status: init?.status || 200, headers: { 'Content-Type': 'application/json' } }) } };
      if (id === '@/lib/mailbox/config') return config;
      if (id === '@/lib/mailbox/service') return { synchronizeMailbox: async () => { cronCalls++; if (cronThrows) throw new Error('Fixture outage'); return cronSync; } };
      if (id === '@/lib/mailbox/archive') return { processMailboxArchiveJobs: async () => cronArchive };
      throw new Error(`Unexpected cron dependency ${id}`);
    },
  });
  assert.equal((await cron.GET(new Request('http://local.invalid/cron'))).status, 401); assert.equal(cronCalls, 0);
  const authorized = () => new Request('http://local.invalid/cron', { headers: { authorization: 'Bearer local-fixture-secret' } });
  assert.equal((await (await cron.GET(authorized())).json()).ok, false, 'An unfinished provider scan cannot be hidden by an empty job queue');
  cronSync = { partial: false, cursors: [] };
  assert.equal((await (await cron.GET(authorized())).json()).ok, true);
  cronArchive = { pending: 1, deferred: 0 }; assert.equal((await (await cron.GET(authorized())).json()).ok, false);
  cronArchive = { pending: 0, deferred: 1 }; assert.equal((await (await cron.GET(authorized())).json()).ok, false);
  cronThrows = true; assert.equal((await cron.GET(authorized())).status, 503);
  console.log('Mailbox service tests passed: history/CID/attachment safety; durable >30-thread continuation and new-head rotation; enqueue/checkpoint failure replay; nested email cursor; bounded/fair/concurrent scans; pending/deferred truth; authenticated cron honors partial. All provider, DB and HTTP operations are mocks; no real email, network or DB access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
