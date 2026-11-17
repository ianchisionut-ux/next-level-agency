const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');

// Isolated PostgreSQL, fake provider, fake key. Production environment and
// database modules are never imported, and no network request is permitted.
async function main() {
  const engine = new PGlite();
  const globals = {};
  let tail = Promise.resolve();
  const statements = [];
  const query = async (sql, args = []) => {
    statements.push(sql);
    assert.doesNotMatch(sql, /\b(?:invoices|invoice_items|payments|receipts|ref_transactions)\b/i);
    return args.length ? engine.query(sql, args) : (await engine.exec(sql)).at(-1) || { rows: [] };
  };
  const prisma = {
    $queryRawUnsafe: async (sql, ...args) => (await query(sql, args)).rows,
    $executeRawUnsafe: async (sql, ...args) => {
      const result = await query(sql, args);
      return result.affectedRows ?? result.rows.length;
    },
    async $transaction(callback) {
      const previous = tail; let release;
      tail = new Promise(resolve => { release = resolve; });
      await previous;
      try { await query('BEGIN'); const result = await callback(prisma); await query('COMMIT'); return result; }
      catch (error) { await query('ROLLBACK'); throw error; }
      finally { release(); }
    },
  };
  class MailboxError extends Error {
    constructor(message, status = 400, code = 'MAILBOX_ERROR', retryable = false) { super(message); Object.assign(this, { status, code, retryable }); }
  }
  const inboxId = 'isolated-inbox', threadId = 'isolated-thread', emailId = 'isolated-email';
  const fileBytes = Buffer.from('PRIVATE-ATTACHMENT-CONTENT');
  const mail = { id: emailId, direction: 'inbound', from: 'Fixture <fixture@example.invalid>', to: ['contact@example.invalid'], cc: [], bcc: [], reply_to: [], subject: 'Isolated archival fixture', text: 'PRIVATE-MESSAGE-TEXT with Unicode ș ✓', html: '<p>PRIVATE-HTML-BODY</p><img src="cid:logo">', read: false, received_at: '2026-11-17T10:00:00.000Z', attachments: [{ id: 'isolated-file', filename: 'fișier.png', size: fileBytes.length }] };
  let metadataAvailable = true, untrustedUrl = false, downloads = 0, onDownload;
  const metadata = () => ({ id: 'isolated-file', filename: 'fișier.png', size: fileBytes.length, content_type: 'image/png', content_id: 'logo', content_disposition: 'inline', download_url: untrustedUrl ? 'https://untrusted.example.invalid/file' : 'https://inbound-cdn.resend.com/isolated-fixture', expires_at: '2026-11-17T11:00:00.000Z' });
  const provider = {
    resolveInbox: async () => ({ id: inboxId }),
    getEmail: async () => structuredClone(mail),
    getThread: async () => ({ id: threadId, subject: mail.subject, folder: 'inbox', read: false, labels: [] }),
    normalizeThread: row => ({ ...row, lastMessageAt: row.received_at, unread: row.read === false, messageCount: Number(row.email_count || 0) }),
    normalizeEmail: row => ({ ...row, createdAt: row.received_at }),
    resendRequest: async url => {
      if (url.includes('/attachments?')) { if (!metadataAvailable) throw new Error('Simulated metadata outage'); return { data: [metadata()], has_more: false }; }
      if (url.includes('/emails?')) return { data: [mail], has_more: false };
      throw new Error('Unmocked provider request: ' + url);
    },
  };
  const config = { MailboxError, providerId(value) { assert.match(value, /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/); return value; }, mailboxConfig: () => ({ inboxId }) };
  const env = { ENCRYPTION_KEY: '17'.repeat(32) };
  function load(file, overrides = {}) {
    const module = { exports: {} };
    const source = fs.readFileSync(file, 'utf8') + (file.endsWith('/archive.ts') ? '\nexport { packAttachment as testPackAttachment, unpackAttachment as testUnpackAttachment };' : '');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const requireMock = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id === 'server-only') return {};
      if (id === '@/lib/prisma') return { prisma };
      if (id === './config') return config;
      if (id === './provider') return provider;
      if (id === '@/lib/crypto') return cipher;
      if (['crypto', 'node:crypto', 'node:fs/promises', 'node:path'].includes(id)) return require(id);
      throw new Error('Unmocked dependency: ' + id);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: requireMock, globalThis: globals, process: { env, cwd: () => process.cwd() }, Buffer, URL, URLSearchParams, Headers, Date, AbortSignal, console,
      fetch: async (url, options) => { assert.equal(new URL(url).hostname, 'inbound-cdn.resend.com'); assert.equal(options.redirect, 'error'); downloads++; if (onDownload) await onDownload(); return new Response(fileBytes, { headers: { 'content-length': String(fileBytes.length) } }); },
    }, { filename: file });
    return module.exports;
  }
  const cipher = load('lib/crypto.ts');
  const archive = load('lib/mailbox/archive.ts');
  const webhook = load('lib/mailbox/webhook.ts');
  try {
    const emptyPacked = archive.testPackAttachment(Buffer.alloc(0));
    assert.ok(emptyPacked.length > 0); assert.equal(archive.testUnpackAttachment(emptyPacked).length, 0);
    const corrupted = Buffer.from(emptyPacked); corrupted[corrupted.length - 1] ^= 1;
    assert.throws(() => archive.testUnpackAttachment(corrupted), undefined, 'AES-GCM detects corrupted archive ciphertext');
    // Official Svix test vector, with its timestamp supplied as the test clock.
    const vectorBody = '{"event_type":"ping","data":{"success":true}}';
    const vectorHeaders = new Headers({ 'svix-id': 'msg_loFOjxBNrRLzqYUf', 'svix-timestamp': '1731705121', 'svix-signature': 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=' });
    assert.equal(webhook.verifyMailboxWebhook(vectorBody, vectorHeaders, 'whsec_plJ3nmyCDGBKInavdOK15jsl', 1731705121000).event.event_type, 'ping');
    assert.throws(() => webhook.verifyMailboxWebhook(vectorBody + ' ', vectorHeaders, 'whsec_plJ3nmyCDGBKInavdOK15jsl', 1731705121000), /invalid/);
    assert.throws(() => webhook.verifyMailboxWebhook(vectorBody, vectorHeaders, 'whsec_plJ3nmyCDGBKInavdOK15jsl', 1731705422000), /expirat/);
    assert.throws(() => webhook.verifyMailboxWebhook(vectorBody, vectorHeaders, '', 1731705121000), /configurată/);
    const event = { type: 'inbox.email.received', created_at: mail.received_at, data: { inbox_id: inboxId, thread_id: threadId, email_id: emailId } };
    const rawEvent = JSON.stringify(event);
    await archive.queueMailboxArchiveEvent('msg_fixture', event, rawEvent);
    await archive.queueMailboxArchiveEvent('msg_fixture', event, rawEvent);
    assert.equal((await query('SELECT count(*)::int AS n FROM nextlevel_mailbox_archive_jobs')).rows[0].n, 1);
    await assert.rejects(() => archive.queueMailboxArchiveEvent('msg_fixture', event, rawEvent + ' '), /corespunde/);
    const enriched = await archive.archiveEmail(inboxId, threadId, mail);
    assert.equal(enriched.attachments[0].content_id, 'logo');
    const stored = (await query('SELECT payload,encrypted_payload FROM nextlevel_mailbox_archive_emails')).rows[0];
    assert.doesNotMatch(JSON.stringify(stored), /PRIVATE-MESSAGE-TEXT|PRIVATE-HTML-BODY/);
    assert.equal(JSON.parse(cipher.decrypt(stored.encrypted_payload)).text, mail.text);
    onDownload = () => archive.updateArchivedThread(inboxId, threadId, { read: true });
    const processed = await archive.processMailboxArchiveJobs();
    onDownload = undefined;
    assert.equal(processed.completed, 1); assert.equal(processed.pending, 0); assert.equal(downloads, 1);
    assert.equal((await archive.getArchivedEmail(inboxId, threadId, emailId)).read, true, 'Background attachment writes preserve a concurrent mark-read operation');
    const bytes = await archive.getArchivedAttachment(inboxId, threadId, emailId, 'isolated-file');
    assert.equal(bytes.contentId, 'logo'); assert.equal(bytes.contentType, 'image/png'); assert.ok(bytes.data.equals(fileBytes));
    const storedFile = (await query('SELECT content FROM nextlevel_mailbox_archive_attachments')).rows[0];
    assert.equal(Buffer.from(storedFile.content).includes(fileBytes), false, 'Attachment bytes are encrypted at rest');
    await archive.processMailboxArchiveJobs(); assert.equal(downloads, 1, 'Completed jobs never download the same attachment twice');
    metadataAvailable = false;
    await archive.archiveEmail(inboxId, threadId, mail);
    const recovered = await archive.getArchivedEmail(inboxId, threadId, emailId);
    assert.equal(recovered.text, mail.text); assert.equal(recovered.html, mail.html); assert.equal(recovered.attachments[0].content_id, 'logo', 'Cached attachment metadata survives a provider outage');
    await archive.updateArchivedThread(inboxId, threadId, { read: true, folder: 'archive' });
    assert.equal((await archive.getArchivedEmail(inboxId, threadId, emailId)).read, true);
    assert.equal((await archive.listArchivedThreads(inboxId, 'archive')).items.length, 1);
    assert.equal((await archive.listArchivedThreads(inboxId, 'inbox')).items.length, 0);
    assert.equal((await archive.getArchivedThread(inboxId, threadId)).emails[0].text, mail.text);
    await archive.archiveThreadSummary(inboxId, 'metadata-only-thread', { id: 'metadata-only-thread', subject: 'Not opened yet', folder: 'inbox', from: 'new@example.invalid', to: ['contact@example.invalid'], received_at: '2026-11-17T10:30:00.000Z', email_count: 2, read: false });
    const unopened = (await archive.listArchivedThreads(inboxId, 'inbox')).items;
    assert.equal(unopened.length, 1, 'Unopened messages remain visible before their body worker runs');
    assert.equal(unopened[0].from, 'new@example.invalid'); assert.equal(unopened[0].messageCount, 2);
    assert.equal(unopened[0].lastMessageAt, '2026-11-17T10:30:00.000Z');
    metadataAvailable = true; untrustedUrl = true;
    await archive.archiveEmail(inboxId, 'other-thread', { ...mail, id: 'other-email' });
    const failure = await archive.processMailboxArchiveJobs();
    assert.equal(failure.deferred, 1); assert.equal(failure.pending, 1); assert.equal(downloads, 1, 'An untrusted signed-URL host is never fetched');
    const status = await archive.mailboxArchiveStatus(inboxId);
    assert.equal(status.emails, 2); assert.equal(status.attachments, 1); assert.equal(status.deferred, 1);

    // Execute the real checkpoint SQL, not a mocked compare-and-swap. Simultaneous
    // claims share this isolated PostgreSQL engine, so only one UPDATE may win.
    const claimants = await Promise.all([archive.claimMailboxArchiveScan(inboxId, 'inbox'), archive.claimMailboxArchiveScan(inboxId, 'inbox')]);
    assert.equal(claimants.filter(Boolean).length, 1, 'Only one scan can acquire a folder lease');
    const firstClaim = claimants.find(Boolean);
    assert.equal(firstClaim.revision, 0); assert.equal(firstClaim.afterCursor, null);
    assert.equal(firstClaim.emailCursor, null); assert.equal(firstClaim.completedAt, null);
    assert.equal(firstClaim.threadIds.length, 0); assert.match(firstClaim.leaseToken, /^[0-9a-f-]{36}$/i);
    assert.equal(await archive.claimMailboxArchiveScan(inboxId, 'inbox'), null, 'Unexpired lease is busy');
    const otherFolder = await archive.claimMailboxArchiveScan(inboxId, 'sent');
    const otherInbox = await archive.claimMailboxArchiveScan('another-isolated-inbox', 'inbox');
    assert.ok(otherFolder && otherInbox, 'Lease ownership is scoped by inbox and folder');
    await archive.releaseMailboxArchiveScan(otherFolder); await archive.releaseMailboxArchiveScan(otherInbox);

    let checkpoint = await archive.saveMailboxArchiveScan(firstClaim, { threadIds: ['scan-thread1','scan-thread2'], nextCursor: 'scan-thread2', emailCursor: 'scan-email300' });
    assert.equal(checkpoint.revision, 1); assert.ok(checkpoint.lastAttemptAt);
    await assert.rejects(() => archive.saveMailboxArchiveScan(firstClaim, { afterCursor: 'skipped-thread' }), error => error.code === 'ARCHIVE_SCAN_LEASE', 'An old revision cannot overwrite the durable page snapshot');
    checkpoint = await archive.saveMailboxArchiveScan(checkpoint, { emailCursor: 'scan-email600' });
    const nestedSaved = (await query(`SELECT after_cursor,next_cursor,thread_ids,email_cursor,revision,lease_until>now() AS active FROM nextlevel_mailbox_archive_scans WHERE inbox_id=$1 AND folder='inbox'`, [inboxId])).rows[0];
    assert.equal(nestedSaved.after_cursor, null); assert.equal(nestedSaved.next_cursor, 'scan-thread2');
    assert.deepEqual(nestedSaved.thread_ids, ['scan-thread1','scan-thread2']); assert.equal(nestedSaved.email_cursor, 'scan-email600');
    assert.equal(Number(nestedSaved.revision), 2); assert.equal(nestedSaved.active, true);
    await archive.releaseMailboxArchiveScan(checkpoint);
    const released = (await query(`SELECT lease_token,lease_until,email_cursor FROM nextlevel_mailbox_archive_scans WHERE inbox_id=$1 AND folder='inbox'`, [inboxId])).rows[0];
    assert.equal(released.lease_token, null); assert.equal(released.lease_until, null); assert.equal(released.email_cursor, 'scan-email600');

    let resumed = await archive.claimMailboxArchiveScan(inboxId, 'inbox');
    assert.notEqual(resumed.leaseToken, firstClaim.leaseToken); assert.equal(resumed.emailCursor, 'scan-email600');
    assert.deepEqual(Array.from(resumed.threadIds), ['scan-thread1','scan-thread2']); assert.equal(resumed.nextCursor, 'scan-thread2');
    await archive.releaseMailboxArchiveScan(checkpoint);
    assert.equal(await archive.claimMailboxArchiveScan(inboxId, 'inbox'), null, 'Release from an old lease cannot release its replacement');
    await assert.rejects(() => archive.saveMailboxArchiveScan(checkpoint, { emailCursor: 'stale-email' }), error => error.code === 'ARCHIVE_SCAN_LEASE');
    await assert.rejects(() => archive.saveMailboxArchiveScan(resumed, { threadIds: [], emailCursor: 'orphaned-email' }), error => error.code === 'ARCHIVE_SCAN_STATE');
    resumed = await archive.saveMailboxArchiveScan(resumed, { threadIds: ['scan-thread2'], emailCursor: null });
    assert.equal(resumed.afterCursor, null, 'Thread-page cursor stays put while any snapshotted thread remains');
    resumed = await archive.saveMailboxArchiveScan(resumed, { afterCursor: resumed.nextCursor, nextCursor: null, threadIds: [], emailCursor: null });
    assert.equal(resumed.afterCursor, 'scan-thread2'); assert.equal(resumed.threadIds.length, 0);

    // Expire a lease using isolated SQL rather than waiting five real minutes.
    await query(`UPDATE nextlevel_mailbox_archive_scans SET lease_until=now()-interval '1 second' WHERE inbox_id=$1 AND folder='inbox'`, [inboxId]);
    await assert.rejects(() => archive.saveMailboxArchiveScan(resumed, { afterCursor: 'expired-writer' }), error => error.code === 'ARCHIVE_SCAN_LEASE', 'Expired leases cannot save even before another claim');
    let recoveredLease = await archive.claimMailboxArchiveScan(inboxId, 'inbox');
    assert.ok(recoveredLease); assert.notEqual(recoveredLease.leaseToken, resumed.leaseToken);
    assert.equal(recoveredLease.afterCursor, 'scan-thread2', 'Crash recovery preserves the last durable cursor');
    await archive.releaseMailboxArchiveScan(resumed);
    assert.equal(await archive.claimMailboxArchiveScan(inboxId, 'inbox'), null);
    const completedAt = new Date().toISOString();
    recoveredLease = await archive.saveMailboxArchiveScan(recoveredLease, { afterCursor: null, nextCursor: null, threadIds: [], emailCursor: null, completedAt });
    await archive.releaseMailboxArchiveScan(recoveredLease);
    const nextCycle = await archive.claimMailboxArchiveScan(inboxId, 'inbox');
    assert.equal(nextCycle.afterCursor, null); assert.equal(nextCycle.completedAt, completedAt, 'Completed scans retain their completion timestamp when a new cycle acquires them');
    await archive.releaseMailboxArchiveScan(nextCycle);
    await assert.rejects(() => query(`INSERT INTO nextlevel_mailbox_archive_scans(inbox_id,folder) VALUES ('invalid-folder-fixture','trash')`), /check constraint/i);
    await assert.rejects(() => query(`INSERT INTO nextlevel_mailbox_archive_scans(inbox_id,folder,thread_ids,email_cursor) VALUES ('invalid-state-fixture','inbox','[]'::jsonb,'orphan')`), /check constraint/i);

    const read = await webhook.readMailboxWebhookBody(new Request('https://isolated.invalid', { method: 'POST', body: rawEvent }));
    assert.equal(read, rawEvent);
    await assert.rejects(() => webhook.readMailboxWebhookBody(new Request('https://isolated.invalid', { method: 'POST', body: 'x', headers: { 'content-length': String(3 * 1024 * 1024) } })), /mare/);
    console.log('Mailbox archive passed: isolated PostgreSQL, official Svix signatures, durable retries, AES-GCM/checksums/CID, concurrent mark-read, trusted URLs, real checkpoint SQL/CAS, exclusive/expired leases, stale-writer rejection and nested-cursor recovery. No live database, real API, email sends or ANAF calls.');
  } finally { await engine.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
