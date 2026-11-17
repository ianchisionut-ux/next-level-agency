import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MailboxError } from "./config";

const MAX_WEBHOOK_BYTES = 2 * 1024 * 1024;

/** Svix verification follows the provider's documented raw-body HMAC format. */
export function verifyMailboxWebhook(payload: string, headers: Headers, secret = process.env.RESEND_WEBHOOK_SECRET || "", now = Date.now()) {
  if (!secret.startsWith("whsec_")) throw new MailboxError("Semnarea webhookului nu este configurată.", 503, "WEBHOOK_NOT_CONFIGURED");
  const encoded = secret.slice(6);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new MailboxError("Semnarea webhookului nu este configurată.", 503, "WEBHOOK_NOT_CONFIGURED");
  const key = Buffer.from(encoded, "base64");
  if (key.length < 16 || key.length > 128) throw new MailboxError("Semnarea webhookului nu este configurată.", 503, "WEBHOOK_NOT_CONFIGURED");
  const id = headers.get("svix-id") || "", timestamp = headers.get("svix-timestamp") || "", signatures = headers.get("svix-signature") || "";
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id) || !/^\d{1,12}$/.test(timestamp) || signatures.length > 4096 || Buffer.byteLength(payload, "utf8") > MAX_WEBHOOK_BYTES) throw new MailboxError("Webhook invalid.", 400, "INVALID_WEBHOOK");
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(now / 1000) - seconds) > 300) throw new MailboxError("Webhook expirat.", 400, "INVALID_WEBHOOK");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`, "utf8").digest();
  let verified = false;
  for (const signature of signatures.split(" ")) {
    const [version, value] = signature.split(",");
    if (version !== "v1" || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) continue;
    const candidate = Buffer.from(value, "base64");
    if (candidate.length === expected.length && timingSafeEqual(expected, candidate)) verified = true;
  }
  if (!verified) throw new MailboxError("Webhook invalid.", 400, "INVALID_WEBHOOK");
  let event: unknown;
  try { event = JSON.parse(payload); } catch { throw new MailboxError("Webhook invalid.", 400, "INVALID_WEBHOOK"); }
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new MailboxError("Webhook invalid.", 400, "INVALID_WEBHOOK");
  return { eventId: id, event: event as Record<string, unknown> };
}

export async function readMailboxWebhookBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_WEBHOOK_BYTES) throw new MailboxError("Webhook prea mare.", 413, "WEBHOOK_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new MailboxError("Webhook invalid.", 400, "INVALID_WEBHOOK");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_WEBHOOK_BYTES) { await reader.cancel(); throw new MailboxError("Webhook prea mare.", 413, "WEBHOOK_TOO_LARGE"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString("utf8");
}
