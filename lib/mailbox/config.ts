import "server-only";
import { sanitizeOutgoingHtml } from "./html";

export const MAILBOX_ADDRESS = "contact@nextlevel-agency.ro";

export class MailboxError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "MAILBOX_ERROR", readonly retryable = false) {
    super(message);
    this.name = "MailboxError";
  }
}

export function mailboxConfig() {
  return { apiKey: process.env.RESEND_API_KEY || "", inboxId: process.env.RESEND_INBOX_ID || "", address: MAILBOX_ADDRESS };
}

export function providerId(value: unknown, label = "Identificatorul") {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new MailboxError(`${label} nu este valid.`, 400, "INVALID_ID");
  return value;
}

export function configuredMailbox() {
  const config = mailboxConfig();
  if (!config.apiKey) throw new MailboxError("E-mailul necesită configurarea conexiunii Resend.", 503, "NOT_CONFIGURED");
  return { ...config, inboxId: config.inboxId ? providerId(config.inboxId, "Inboxul configurat") : MAILBOX_ADDRESS };
}

export function operationId(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new MailboxError("Cheia operațiunii trebuie să fie un UUID valid.", 400, "INVALID_OPERATION_KEY");
  return value.toLowerCase();
}

export function recipients(input: unknown, required = false): string[] {
  const values = typeof input === "string" ? input.split(/[,;]/) : Array.isArray(input) ? input : [];
  if (values.length > 20 || (!Array.isArray(input) && typeof input !== "string" && input != null)) throw new MailboxError("Lista destinatarilor nu este validă.", 400, "INVALID_RECIPIENTS");
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") throw new MailboxError("Adresa de e-mail nu este validă.", 400, "INVALID_RECIPIENTS");
    const address = value.trim().toLowerCase();
    if (!address) continue;
    if (address.length > 254 || /[\r\n]/.test(value) || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(address)) throw new MailboxError("Adresa de e-mail nu este validă.", 400, "INVALID_RECIPIENTS");
    if (!result.includes(address)) result.push(address);
  }
  if (required && !result.length) throw new MailboxError("Completează destinatarul.", 400, "INVALID_RECIPIENTS");
  return result;
}

export function messageInput(input: unknown, reply = false, draft = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MailboxError("Mesajul nu este valid.");
  const body = input as Record<string, unknown>;
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const rawHtml = typeof body.html === "string" ? body.html.trim() : "";
  if (rawHtml.length > 200_000) throw new MailboxError("HTML-ul mesajului depășește limita de 200.000 de caractere.", 413, "HTML_TOO_LARGE");
  const html = sanitizeOutgoingHtml(rawHtml);
  if ((!draft && !reply && !subject) || subject.length > 300 || /[\r\n\u0000]/.test(subject)) throw new MailboxError("Subiectul trebuie să conțină între 1 și 300 de caractere, pe un singur rând.", 400, "INVALID_SUBJECT");
  if ((!draft && !text && !html) || text.length > 100_000 || text.includes("\u0000") || html.includes("\u0000")) throw new MailboxError("Mesajul depășește limita permisă sau nu conține text/HTML.", 400, "INVALID_BODY");
  const to = recipients(body.to, !reply && !draft), cc = recipients(body.cc), bcc = recipients(body.bcc);
  if (to.length + cc.length + bcc.length > 20) throw new MailboxError("Un mesaj poate avea cel mult 20 de destinatari.", 400, "INVALID_RECIPIENTS");
  if (body.attachments !== undefined && (!Array.isArray(body.attachments) || body.attachments.length > 20)) throw new MailboxError("Lista atașamentelor nu este validă.", 400, "INVALID_ATTACHMENTS");
  let total = 0;
  const attachments = (Array.isArray(body.attachments) ? body.attachments : []).map((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new MailboxError("Atașamentul nu este valid.", 400, "INVALID_ATTACHMENTS");
    const file = value as Record<string, unknown>;
    const filename = typeof file.filename === "string" ? file.filename.trim() : "";
    const content = typeof file.content === "string" ? file.content : "";
    const contentType = typeof file.contentType === "string" ? file.contentType : "application/octet-stream";
    if (!filename || filename.length > 255 || /[\u0000-\u001f/\\]/.test(filename) || !content || content.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(content) || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)) throw new MailboxError("Numele, formatul sau tipul atașamentului nu este valid.", 400, "INVALID_ATTACHMENTS");
    const bytes = Buffer.from(content, "base64"); total += bytes.length;
    if (total > 3 * 1024 * 1024 || bytes.toString("base64") !== content) throw new MailboxError("Atașamentele acceptă maximum 3 MB în total.", 413, "ATTACHMENTS_TOO_LARGE");
    return { filename, content, contentType };
  });
  return { to, cc, bcc, subject, text, html, attachments, operationKey: operationId(body.operationKey), ...(reply ? { emailId: providerId(body.emailId, "Mesajul inițial") } : {}) };
}

export async function readJson(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 4_400_000) throw new MailboxError("Cererea depășește limita de 4,4 MB permisă de server.", 413, "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new MailboxError("Lipsește mesajul JSON.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 4_400_000) { await reader.cancel(); throw new MailboxError("Cererea depășește limita de 4,4 MB permisă de server.", 413, "BODY_TOO_LARGE"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString("utf8")) as unknown; }
  catch { throw new MailboxError("Corpul cererii trebuie să fie JSON valid.", 400, "INVALID_JSON"); }
}
