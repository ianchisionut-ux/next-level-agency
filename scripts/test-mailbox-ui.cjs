const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const api = {};
let reply = { error: 'Unknown transport result', code: 'SEND_REQUIRES_REVIEW', definiteNoSend: false };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/mailbox/mailbox-utils.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api, fetch: async () => new Response(JSON.stringify(reply), { status: 502 }) });
const { mergeMailPage, editableAfterRejectedSend, mailboxRequest, MailboxRequestError } = api;
const thread = { id: 'thread1', subject: 'Long conversation', from: 'fixture@example.com', to: ['contact@nextlevel-agency.ro'], preview: '', unread: false, messageCount: 1200, lastMessageAt: '2026-11-17T12:00:00Z' };
const email = index => ({ id: `email-${index}`, from: 'fixture@example.com', to: ['contact@nextlevel-agency.ro'], text: `Message ${index}`, subject: 'Long conversation', createdAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(), direction: 'inbound', attachments: [] });
let history = { thread, emails: Array.from({ length: 100 }, (_, index) => email(index)), nextCursor: 'cursor-100' };
for (let page = 1; page < 12; page++) {
  assert.ok(history.nextCursor, 'Reply must remain gated while newer pages exist');
  const incoming = Array.from({ length: 100 }, (_, index) => email(page * 100 + index));
  incoming.unshift({ ...email(page * 100 - 1), text: 'Refreshed overlapping message' });
  history = mergeMailPage(history, { thread: { ...thread, messageCount: 100 }, emails: incoming, nextCursor: page === 11 ? null : `cursor-${(page + 1) * 100}` });
  assert.equal(history.emails.length, (page + 1) * 100, 'Pagination must preserve every earlier email and deduplicate overlaps');
  assert.equal(history.thread.messageCount, 1200);
}
assert.equal(history.nextCursor, null);
assert.equal(history.emails[1199].id, 'email-1199', 'Latest message must be available after the final page');
assert.equal(history.emails[0].id, 'email-0');
assert.equal(new Set(history.emails.map(item => item.id)).size, 1200);

const original = { to: 'client@example.com', cc: '', bcc: '', subject: 'Fixture', text: 'Important unsent edits', html: '<p>Important unsent edits</p>', attachments: [{ filename: 'fixture.txt', content: 'U0FGRQ==', contentType: 'text/plain', size: 4 }], operationKey: 'original-key', serverId: 'existing-draft', kind: 'reply', threadId: 'thread1', emailId: 'email1', attempted: true };
assert.equal(editableAfterRejectedSend(original, new Error('Connection lost'), 'new-key'), null);
assert.equal(editableAfterRejectedSend(original, new MailboxRequestError('Generic 502', 502), 'new-key'), null);
assert.equal(editableAfterRejectedSend(original, new MailboxRequestError('Unknown send result', 502, 'SEND_REQUIRES_REVIEW', false), 'new-key'), null);
assert.equal(editableAfterRejectedSend(original, new MailboxRequestError('Stored unknown operation', 409, 'SEND_REQUIRES_REVIEW'), 'new-key'), null);
const editable = editableAfterRejectedSend(original, new MailboxRequestError('Provider rejected before acceptance', 502, 'RESEND_422', true), 'new-key');
assert.equal(editable.attempted, false); assert.equal(editable.operationKey, 'new-key');
for (const field of ['to', 'cc', 'bcc', 'subject', 'text', 'html', 'serverId', 'kind', 'threadId', 'emailId']) assert.equal(editable[field], original[field]);
assert.equal(editable.attachments, original.attachments);
assert.equal(original.attempted, true, 'Recovery must not mutate the retained pending snapshot');

(async () => {
  await assert.rejects(() => mailboxRequest('/mock'), error => error instanceof MailboxRequestError && error.code === 'SEND_REQUIRES_REVIEW' && error.definiteNoSend === false);
  reply = { error: 'Confirmed rejection', code: 'RESEND_422', definiteNoSend: true };
  await assert.rejects(() => mailboxRequest('/mock'), error => error.definiteNoSend === true);
  reply = { error: 'Malformed certainty value', definiteNoSend: 'true' };
  await assert.rejects(() => mailboxRequest('/mock'), error => error.definiteNoSend === false);
  const loaded = new Map();
  function component(file) {
    const absolute = path.resolve(file);
    if (loaded.has(absolute)) return loaded.get(absolute);
    const exports = {}; loaded.set(absolute, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
      exports, console,
      require(id) {
        if (id.endsWith('.module.css')) return new Proxy({}, { get: (_target, key) => key === '__esModule' ? false : String(key) });
        if (id.startsWith('.')) return component(path.resolve(path.dirname(absolute), id + (id.endsWith('utils') ? '.ts' : '.tsx')));
        if (['react', 'react/jsx-runtime', 'lucide-react'].includes(id)) return require(id);
        throw new Error(`Unexpected UI dependency ${id}`);
      },
    });
    return exports;
  }
  const markup = renderToStaticMarkup(React.createElement(component('components/mailbox/Mailbox.tsx').default));
  assert.match(markup, /contact@nextlevel-agency\.ro/);
  assert.match(markup, /Căsuța poștală/);
  assert.match(markup, /Conversații/);
  assert.ok(!markup.includes('RESEND_API_KEY'));
  console.log('Mailbox UI tests passed: 1,200-email pagination without loss/duplicates, newest-page gating data, preserved draft recovery, explicit rejection unlock only, unknown/generic failures remain protected. No real email, network or database access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
