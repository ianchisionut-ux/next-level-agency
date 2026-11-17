import "server-only";
import { configuredMailbox, MAILBOX_ADDRESS, MailboxError, mailboxConfig, providerId } from "./config";

const BASE = "https://api.resend.com";
type Json = Record<string, unknown>;
export class ProviderError extends MailboxError {
  constructor(status: number, readonly definitive: boolean) {
    super(status === 401 || status === 403 ? "Conexiunea Resend necesită o cheie cu acces complet pentru inbox." : status === 404 ? "Inboxul, conversația sau mesajul nu a fost găsit în Resend." : status === 429 ? "Resend limitează temporar cererile. Încearcă din nou mai târziu." : "Resend nu a confirmat operațiunea. Verifică starea e-mailului înainte de retrimitere.", status === 404 ? 404 : status === 429 ? 429 : 502, `RESEND_${status}`, status === 429 || status >= 500);
  }
}

export async function resendRequest(path: string, options?: { method?: "POST" | "PATCH"; body?: unknown; operationKey?: string }) {
  const { apiKey } = configuredMailbox();
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options?.method || "GET", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(options?.operationKey ? { "Idempotency-Key": options.operationKey } : {}) },
      ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch { throw new ProviderError(503, false); }
  if (!response.ok) throw new ProviderError(response.status, response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status));
  const text = await response.text();
  if (text.length > 5_000_000) throw new MailboxError("Mesajul depășește dimensiunea acceptată pentru afișare.", 502, "MESSAGE_TOO_LARGE");
  let result: unknown;
  try { result = JSON.parse(text); } catch { throw new ProviderError(502, false); }
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new ProviderError(502, false);
  return result as Json;
}

function string(value: unknown, limit = 1000) { return typeof value === "string" ? value.slice(0, limit) : ""; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 100) : []; }
function rows(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Json => Boolean(item && typeof item === "object" && !Array.isArray(item))) : []; }

export async function resolveInbox() {
  const config = configuredMailbox();
  const inbox = await resendRequest(`/inboxes/${encodeURIComponent(config.inboxId)}`);
  if (string(inbox.email_address).trim().toLowerCase() !== MAILBOX_ADDRESS) throw new MailboxError("Inboxul Resend configurat nu corespunde adresei contact@nextlevel-agency.ro.", 503, "INBOX_ADDRESS_MISMATCH");
  return { id: providerId(inbox.id, "Inboxul Resend"), domainId: string(inbox.domain_id), receivingAddress: string(inbox.receiving_address) };
}

export async function mailboxStatus() {
  const config = mailboxConfig();
  const base = { configured: false, address: MAILBOX_ADDRESS, sendingReady: false, receivingReady: false };
  if (!config.apiKey) return { ...base, message: "Configurează conexiunea Resend cu o cheie cu acces complet și inboxul contact@nextlevel-agency.ro." };
  try {
    const inbox = await resolveInbox();
    const domain = inbox.domainId ? await resendRequest(`/domains/${encodeURIComponent(providerId(inbox.domainId))}`) : null;
    const capabilities = domain?.capabilities && typeof domain.capabilities === "object" ? domain.capabilities as Json : {};
    const records = rows(domain?.records);
    const sendingRecords = records.filter(record => record.record === "SPF" || record.record === "DKIM");
    const receivingRecords = records.filter(record => record.record === "Receiving" || record.record === "MX" || (record.type === "MX" && !string(record.name).startsWith("send")));
    const sendingReady = capabilities.sending === "enabled" && sendingRecords.length > 0 && sendingRecords.every(record => record.status === "verified");
    const receivingReady = capabilities.receiving === "enabled" && receivingRecords.length > 0 && receivingRecords.every(record => record.status === "verified");
    return { configured: true, address: MAILBOX_ADDRESS, inboxId: inbox.id, sendingReady, receivingReady, domainStatus: string(domain?.status), forwardingAvailable: Boolean(inbox.receivingAddress), message: sendingReady && receivingReady ? "Inboxul și înregistrările DNS necesare sunt confirmate de Resend. Acceptarea unui mesaj nu confirmă livrarea lui." : "Inboxul este conectat. Verifică în Resend înregistrările DNS pentru trimitere și primire; redirecționarea dintr-un furnizor existent necesită configurare separată." };
  } catch (error) { return { ...base, message: error instanceof MailboxError ? error.message : "Conexiunea Resend nu a putut fi verificată." }; }
}

export function normalizeThread(row: Json) {
  return { id: providerId(row.id, "Conversația"), subject: string(row.subject, 500) || "(fără subiect)", from: string(row.from), to: strings(row.to), preview: string(row.preview || row.snippet, 500), lastMessageAt: string(row.received_at || row.updated_at), unread: row.read === false, messageCount: Number.isSafeInteger(row.email_count) ? Number(row.email_count) : 0, folder: string(row.folder) };
}

export async function listThreads(folder: string, after?: string | null, verifiedInboxId?: string) {
  if (!["inbox", "sent", "archive"].includes(folder)) throw new MailboxError("Dosarul selectat nu este valid.", 400, "INVALID_FOLDER");
  const inbox = verifiedInboxId ? { id: verifiedInboxId } : await resolveInbox();
  const query = new URLSearchParams({ folders: folder, limit: "30" });
  if (after) query.set("after", providerId(after, "Cursorul"));
  const result = await resendRequest(`/inboxes/${inbox.id}/threads?${query}`);
  const items = rows(result.data).map(normalizeThread);
  return { items, rawThreads: rows(result.data), nextCursor: result.has_more === true && items.length ? items[items.length - 1].id : null };
}

export async function getThread(inboxId: string, threadId: string) {
  return resendRequest(`/inboxes/${inboxId}/threads/${providerId(threadId, "Conversația")}`);
}

export async function getEmail(inboxId: string, threadId: string, emailId: string) {
  return resendRequest(`/inboxes/${inboxId}/threads/${providerId(threadId, "Conversația")}/emails/${providerId(emailId, "Mesajul")}`);
}

export function normalizeEmail(email: Json) {
  return {
    id: providerId(email.id, "Mesajul"), from: string(email.from), to: strings(email.to), cc: strings(email.cc), bcc: strings(email.bcc), replyTo: strings(email.reply_to),
    subject: string(email.subject, 500), text: string(email.text, 1_000_000), html: string(email.html, 2_000_000), createdAt: string(email.received_at || email.created_at), direction: email.direction === "outbound" ? "outbound" : "inbound",
    attachments: rows(email.attachments).map(file => ({ id: providerId(file.id, "Atașamentul"), filename: string(file.filename, 255) || "atasament", contentType: string(file.content_type) || "application/octet-stream", size: Number.isSafeInteger(file.size) && Number(file.size) >= 0 ? Number(file.size) : 0, contentId: string(file.content_id), inline: file.content_disposition === "inline" || Boolean(file.content_id) })),
  };
}

export async function threadDetails(threadId: string, after?: string | null, verifiedInboxId?: string) {
  const inbox = verifiedInboxId ? { id: verifiedInboxId } : await resolveInbox();
  const thread = await getThread(inbox.id, threadId);
  const query = new URLSearchParams({ limit: "100" });
  if (after) query.set("after", providerId(after, "Cursorul"));
  const emails = await resendRequest(`/inboxes/${inbox.id}/threads/${providerId(threadId)}/emails?${query}`);
  const data = rows(emails.data).map(normalizeEmail);
  return { thread: normalizeThread({ ...thread, from: data.at(-1)?.from, to: data.at(-1)?.to, received_at: data.at(-1)?.createdAt, email_count: Number(thread.email_count || data.length) }), emails: data, rawEmails: rows(emails.data), nextCursor: emails.has_more === true && data.length ? data[data.length - 1].id : null };
}

export async function updateThread(threadId: string, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new MailboxError("Modificarea conversației nu este validă.");
  const input = body as Json, update: Json = {};
  if (input.archived !== undefined) { if (typeof input.archived !== "boolean") throw new MailboxError("Dosarul conversației nu este valid."); update.folder = input.archived ? "archive" : "inbox"; }
  if (input.unread !== undefined) { if (typeof input.unread !== "boolean") throw new MailboxError("Starea de citire nu este validă."); update.read = !input.unread; }
  if (!Object.keys(update).length) throw new MailboxError("Nu a fost selectată nicio modificare.");
  const inbox = await resolveInbox();
  const thread = await resendRequest(`/inboxes/${inbox.id}/threads/${providerId(threadId, "Conversația")}`, { method: "PATCH", body: update });
  return { thread: normalizeThread(thread) };
}

export async function attachmentInfo(threadId: string, emailId: string, attachmentId: string) {
  const inbox = await resolveInbox();
  const email = await getEmail(inbox.id, threadId, emailId);
  if (!rows(email.attachments).some(file => file.id === providerId(attachmentId, "Atașamentul"))) throw new MailboxError("Atașamentul nu aparține mesajului selectat.", 404, "ATTACHMENT_NOT_FOUND");
  const direction = email.direction === "inbound" ? "receiving/" : email.direction === "outbound" ? "" : null;
  if (direction === null) throw new MailboxError("Direcția mesajului nu poate fi verificată.", 502, "INVALID_EMAIL_DIRECTION");
  const file = await resendRequest(`/emails/${direction}${providerId(emailId)}/attachments/${providerId(attachmentId)}`);
  let url: URL;
  try { url = new URL(String(file.download_url || "")); } catch { throw new MailboxError("Linkul atașamentului nu este disponibil.", 502, "ATTACHMENT_UNAVAILABLE"); }
  if (url.protocol !== "https:" || !["inbound-cdn.resend.com", "outbound-cdn.resend.com"].includes(url.hostname) || url.username || url.password || url.port) throw new MailboxError("Linkul atașamentului nu provine de la Resend.", 502, "UNTRUSTED_ATTACHMENT_URL");
  return { url: url.toString(), filename: string(file.filename, 255) || "atasament", contentType: string(file.content_type, 200) || "application/octet-stream", size: Number(file.size || 0) };
}

export async function attachmentUrl(threadId: string, emailId: string, attachmentId: string) { return (await attachmentInfo(threadId, emailId, attachmentId)).url; }
