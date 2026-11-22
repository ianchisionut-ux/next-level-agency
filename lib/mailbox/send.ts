import "server-only";
import { MAILBOX_ADDRESS, MailboxError, messageInput, providerId } from "./config";
import { getEmail, ProviderError, resendRequest, resolveInbox } from "./provider";
import { completeOperation, failOperation, rememberDraft, requestHash, reserveOperation } from "./store";

function address(value: string) { return (/<([^<>]+)>/.exec(value)?.[1] || value).trim().toLowerCase(); }

export async function sendMessage(input: unknown, threadId?: string, forward = false, sourceDraftId?: string) {
  if (threadId?.startsWith("legacy_")) throw new MailboxError("Pentru acest mesaj recuperat, continuă printr-un mesaj nou.", 400, "LEGACY_THREAD_NEW_MESSAGE");
  const body = messageInput(input, Boolean(threadId));
  if (threadId) providerId(threadId, "Conversația");
  const kind = forward ? "FORWARD" : threadId ? "REPLY" : "SEND";
  const hash = requestHash({ address: MAILBOX_ADDRESS, kind, threadId: threadId || null, sourceDraftId: sourceDraftId || null, ...body });
  const operation = await reserveOperation(body.operationKey, hash, kind);
  if (operation.result) return operation.result;
  let mayHaveSent = false;
  try {
    const inbox = await resolveInbox();
    let original: Record<string, unknown> | null = null;
    if (threadId) {
      original = await getEmail(inbox.id, threadId, providerId(body.emailId));
      const targets = original.direction === "outbound" ? original.to : Array.isArray(original.reply_to) && original.reply_to.length ? original.reply_to : [original.from];
      const expected = Array.isArray(targets) ? targets.filter((item): item is string => typeof item === "string").map(address).sort() : [];
      if (!forward && body.to.length && JSON.stringify([...body.to].sort()) !== JSON.stringify(expected)) throw new MailboxError("Destinatarul răspunsului este stabilit de mesajul inițial. Pentru alt destinatar, compune un mesaj nou.", 400, "REPLY_RECIPIENT_MISMATCH");
      if (forward && !body.to.length) throw new MailboxError("Completează destinatarul redirecționării.", 400, "INVALID_RECIPIENTS");
    }
    const content = { ...(body.text ? { text: body.text } : {}), ...(body.html ? { html: body.html } : {}), ...(body.subject ? { subject: body.subject } : {}), cc: body.cc, bcc: body.bcc, ...(body.attachments.length ? { attachments: body.attachments.map(file => ({ filename: file.filename, content: file.content, content_type: file.contentType })) } : {}) };
    let sent: Record<string, unknown>;
    if (threadId && original) {
      mayHaveSent = true;
      sent = await resendRequest(`/inboxes/${inbox.id}/threads/${threadId}/emails/${body.emailId}/${forward ? "forward" : "reply"}`, {
        method: "POST", operationKey: `mailbox:${body.operationKey}:${forward ? "forward" : "reply"}`,
        body: { ...content, ...(forward ? { to: body.to } : {}), headers: { "X-Nextlevel-Operation": body.operationKey } },
      });
    } else {
      let draftId = operation.draftId;
      if (!draftId) {
        const draft = await resendRequest(`/inboxes/${inbox.id}/drafts`, { method: "POST", operationKey: `mailbox:${body.operationKey}:draft`, body: { ...content, to: body.to } });
        draftId = providerId(draft.id, "Ciorna");
        await rememberDraft(body.operationKey, draftId);
      }
      mayHaveSent = true;
      sent = await resendRequest(`/inboxes/${inbox.id}/drafts/${draftId}/send`, { method: "POST", operationKey: `mailbox:${body.operationKey}:send`, body: { headers: { "X-Nextlevel-Operation": body.operationKey } } });
    }
    const result = { id: providerId(sent.id, "Mesajul trimis"), threadId: threadId || null, accepted: true as const, operationKey: body.operationKey, ...(sourceDraftId ? { sourceDraftId } : {}) };
    await completeOperation(body.operationKey, result);
    return result;
  } catch (error) {
    const uncertain = mayHaveSent && !(error instanceof ProviderError && error.definitive);
    await failOperation(body.operationKey, uncertain, error instanceof MailboxError ? error.code : "SEND_STORAGE_ERROR").catch(() => undefined);
    if (uncertain) throw new MailboxError("Rezultatul trimiterii nu a putut fi confirmat. Verifică dosarul Trimise înainte de o nouă trimitere; această operațiune nu este repetată automat.", 502, "SEND_REQUIRES_REVIEW");
    // Reached only after this operation was reserved and this attempt is known
    // not to have sent. Conflicts/old uncertain attempts never receive this flag.
    const rejected = error instanceof MailboxError ? error : new MailboxError("Mesajul nu a fost trimis. Operațiunea s-a oprit înainte de trimitere.", 503, "SEND_NOT_STARTED", true);
    throw Object.assign(rejected, { definiteNoSend: true });
  }
}
