export type MailboxStatus = { configured: boolean; address: string; inboxId?: string; sendingReady: boolean; receivingReady: boolean; domainStatus?: string; message?: string; setupRequired?: string[]; archiveReady?: boolean; archive?: { emails?: number; attachments?: number; pending?: number; deferred?: number } };
export type MailFolder = "inbox" | "sent" | "archive" | "drafts";
export type MailThread = { id: string; subject: string; from: string; to: string[]; preview: string; lastMessageAt: string; unread: boolean; messageCount: number; archived?: boolean };
export type MailEmail = { id: string; from: string; to: string[]; cc?: string[]; bcc?: string[]; replyTo?: string[]; subject: string; text: string; html?: string; createdAt: string; direction: string; deliveryStatus?: string; attachments?: { id: string; filename: string; contentType: string; size: number; contentId?: string; inline?: boolean }[] };
export type MailDetail = { thread: MailThread; emails: MailEmail[]; nextCursor?: string | null; warning?: string };
export type DraftAttachment = { filename: string; contentType: string; content: string; size: number };
export type MailDraft = { to: string; cc: string; bcc: string; subject: string; text: string; html: string; attachments: DraftAttachment[]; operationKey: string; threadId?: string; emailId?: string; kind?: "new" | "reply" | "forward"; serverId?: string; attempted: boolean; updatedAt?: string };
export type ServerDraft = { id: string; to?: string[]; cc?: string[]; bcc?: string[]; subject?: string; text?: string; html?: string; attachments?: DraftAttachment[]; operationKey?: string; threadId?: string; emailId?: string; kind?: "new" | "reply" | "forward"; updatedAt?: string; createdAt?: string };

export function emailAddress(value: string) {
  return (value.match(/<([^<>]+)>/)?.[1] || value).trim();
}

export function recipients(value: string): string[] {
  if (!value.trim()) return [];
  const result = [...new Set(value.split(/[;,]/).map(emailAddress).filter(Boolean))];
  if (result.some(address => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))) throw new Error("Verifică adresele de e-mail. Separă destinatarii prin virgulă.");
  return result;
}

export function mailDate(value: string, full = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("ro-RO", full ? { dateStyle: "medium", timeStyle: "short" } : { day: "2-digit", month: "short" });
}

export function mailSize(size: number) {
  return size >= 1_048_576 ? `${(size / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function sanitizeMailBody(html: string, images = true, cidImages: Record<string, string> = {}) {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.head.querySelectorAll("style").forEach(style => document.body.prepend(style));
  document.querySelectorAll("script,iframe,frame,object,embed,link,meta,base,form,input,button,textarea,select,video,audio,source,svg,math").forEach(node => node.remove());
  document.querySelectorAll("img").forEach(node => {
    let src = node.getAttribute("src") || "";
    if (/^cid:/i.test(src)) src = cidImages[src.slice(4).replace(/^<|>$/g, "")] || "";
    if (!images || !/^(https:\/\/|blob:|data:image\/(?:png|jpe?g|gif|webp|avif);base64,)/i.test(src)) {
      const placeholder = document.createElement("span");
      placeholder.textContent = node.getAttribute("alt") ? `[${node.getAttribute("alt")}]` : "";
      node.replaceWith(placeholder);
    } else { node.setAttribute("src", src); node.setAttribute("referrerpolicy", "no-referrer"); }
  });
  document.body.querySelectorAll("*").forEach(node => {
    [...node.attributes].forEach(attribute => {
      if (!["style", "class", "id", "colspan", "rowspan", "align", "valign", "width", "height", "cellpadding", "cellspacing", "border", "alt", "title", "src", "href", "referrerpolicy"].includes(attribute.name.toLowerCase())) node.removeAttribute(attribute.name);
    });
    if (node.tagName === "A") {
      if (!/^(https?:\/\/|mailto:)/i.test(node.getAttribute("href") || "")) node.removeAttribute("href");
      node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer");
    } else if (node.tagName !== "IMG") { node.removeAttribute("src"); node.removeAttribute("href"); }
  });
  return document.body.innerHTML;
}

/** Email content lives in an opaque sandbox, with no scripts/forms/frames. */
export function safeMailHtml(html: string, images = true, cidImages: Record<string, string> = {}) {
  const body = sanitizeMailBody(html, images, cidImages);
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${images ? "https: data: blob:" : "'none'"}; style-src 'unsafe-inline'; font-src data:; frame-src 'none'; form-action 'none'; base-uri 'none'"><style>body{margin:16px;font:14px/1.7 system-ui,sans-serif;color:#20344b;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}a{color:#2563eb}</style></head><body>${body}</body></html>`;
}

export function textMailHtml(text: string) {
  return text.split("\n").map(line => `<div>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</div>`).join("");
}

export class MailboxRequestError extends Error {
  constructor(message: string, public status: number, public code?: string, public definiteNoSend = false) { super(message); this.name = "MailboxRequestError"; }
}

export function mergeMailPage(current: MailDetail, page: MailDetail): MailDetail {
  if (current.thread.id !== page.thread.id) return page;
  const emails = [...new Map([...current.emails, ...page.emails].map(email => [email.id, email])).values()];
  return { ...current, ...page, thread: { ...page.thread, messageCount: Math.max(current.thread.messageCount, page.thread.messageCount, emails.length) }, emails };
}

export function editableAfterRejectedSend(draft: MailDraft, error: unknown, nextKey: string): MailDraft | null {
  if (!(error instanceof MailboxRequestError) || !error.definiteNoSend) return null;
  return { ...draft, operationKey: nextKey, attempted: false };
}

export async function mailboxRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  let result: T & { error?: string; code?: string; definiteNoSend?: boolean };
  try { result = await response.json(); } catch { throw new Error("Serverul nu a returnat un răspuns valid. Reîncearcă."); }
  if (!response.ok) throw new MailboxRequestError(result.error || "Operațiunea nu a putut fi finalizată.", response.status, result.code, result.definiteNoSend === true);
  return result;
}
