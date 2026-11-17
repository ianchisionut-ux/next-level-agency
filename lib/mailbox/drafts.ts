import "server-only";
import { randomUUID } from "node:crypto";
import { encrypt, decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { MAILBOX_ADDRESS, MailboxError, messageInput, operationId, providerId } from "./config";
import { completedOperation, mailboxSchema } from "./store";
import { sendMessage } from "./send";
import { sanitizeOutgoingHtml } from "./html";

type DraftRow = { id: string; payload: string; summary: string; createdAt: Date; updatedAt: Date };

export async function listDrafts() {
  await mailboxSchema();
  const rows = await prisma.$queryRawUnsafe<DraftRow[]>(`SELECT id,summary,"createdAt","updatedAt" FROM nextlevel_mailbox_drafts WHERE mailbox=$1 ORDER BY "updatedAt" DESC LIMIT 100`, MAILBOX_ADDRESS);
  return { items: rows.map(row => ({ ...JSON.parse(decrypt(row.summary)), id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt })) };
}

async function draftRecord(id: string) {
  await mailboxSchema();
  const rows = await prisma.$queryRawUnsafe<DraftRow[]>(`SELECT id,payload,"createdAt","updatedAt" FROM nextlevel_mailbox_drafts WHERE id=$1::uuid AND mailbox=$2`, operationId(id), MAILBOX_ADDRESS);
  if (!rows[0]) throw new MailboxError("Ciorna nu a fost găsită.", 404, "DRAFT_NOT_FOUND");
  return { data: { ...JSON.parse(decrypt(rows[0].payload)), id: rows[0].id, createdAt: rows[0].createdAt, updatedAt: rows[0].updatedAt } as Record<string, unknown>, token: rows[0].payload };
}

export async function getDraft(id: string) { return (await draftRecord(id)).data; }

export async function saveDraft(input: unknown, id?: string) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MailboxError("Ciorna nu este validă.");
  const value = input as Record<string, unknown>;
  const kind = value.kind === "reply" || value.kind === "forward" ? value.kind : "new";
  const key = operationId(id || value.operationKey || randomUUID());
  const normalized = messageInput({ ...value, operationKey: value.operationKey || key }, kind !== "new", true);
  const data = { ...normalized, kind, ...(kind !== "new" ? { threadId: providerId(value.threadId, "Conversația"), emailId: providerId(value.emailId, "Mesajul inițial") } : {}) };
  const summary = { ...data, text: data.text.slice(0, 150), html: undefined, attachments: data.attachments.map(file => ({ filename: file.filename, contentType: file.contentType })), };
  const payload = encrypt(JSON.stringify(data)), encryptedSummary = encrypt(JSON.stringify(summary));
  await mailboxSchema();
  if (id) {
    const affected = await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_drafts SET payload=$3,summary=$4,"updatedAt"=now() WHERE id=$1::uuid AND mailbox=$2`, key, MAILBOX_ADDRESS, payload, encryptedSummary);
    if (!affected) throw new MailboxError("Ciorna nu a fost găsită.", 404, "DRAFT_NOT_FOUND");
  } else await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_drafts(id,mailbox,payload,summary) VALUES ($1::uuid,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,summary=EXCLUDED.summary,"updatedAt"=now() WHERE nextlevel_mailbox_drafts.mailbox=EXCLUDED.mailbox`, key, MAILBOX_ADDRESS, payload, encryptedSummary);
  return { id: key };
}

export async function deleteDraft(id: string, expectedToken?: string) {
  await mailboxSchema();
  if (expectedToken !== undefined) await prisma.$executeRawUnsafe(`DELETE FROM nextlevel_mailbox_drafts WHERE id=$1::uuid AND mailbox=$2 AND payload=$3`, operationId(id), MAILBOX_ADDRESS, expectedToken);
  else await prisma.$executeRawUnsafe(`DELETE FROM nextlevel_mailbox_drafts WHERE id=$1::uuid AND mailbox=$2`, operationId(id), MAILBOX_ADDRESS);
  return { deleted: true };
}

export async function sendDraft(id: string, input: unknown) {
  if (!input || typeof input !== "object") throw new MailboxError("Operațiunea nu este validă.");
  const key = operationId((input as Record<string, unknown>).operationKey);
  // A successful retry must survive deletion of the already-sent draft.
  const completed = await completedOperation(key);
  if (completed) {
    if (completed.sourceDraftId !== operationId(id)) throw new MailboxError("Cheia trimiterii aparține altei ciorne.", 409, "IDEMPOTENCY_CONFLICT");
    return completed;
  }
  const { data: draft, token } = await draftRecord(id);
  const result = await sendMessage({ ...draft, operationKey: key }, draft.kind === "new" ? undefined : providerId(draft.threadId), draft.kind === "forward", operationId(id));
  // Keep edits saved by another tab/autosave while the provider was sending.
  await deleteDraft(id, token);
  return result;
}

export async function preferences(input?: unknown) {
  await mailboxSchema();
  if (input !== undefined) {
    if (!input || typeof input !== "object" || typeof (input as Record<string, unknown>).signature !== "string") throw new MailboxError("Semnătura nu este validă.");
    const raw = (input as { signature: string }).signature;
    if (raw.length > 10_000 || raw.includes("\u0000")) throw new MailboxError("Semnătura depășește limita permisă.");
    const signature = sanitizeOutgoingHtml(raw);
    await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_preferences(mailbox,signature) VALUES ($1,$2) ON CONFLICT(mailbox) DO UPDATE SET signature=EXCLUDED.signature,"updatedAt"=now()`, MAILBOX_ADDRESS, encrypt(JSON.stringify(signature)));
  }
  const rows = await prisma.$queryRawUnsafe<Array<{ signature: string }>>(`SELECT signature FROM nextlevel_mailbox_preferences WHERE mailbox=$1`, MAILBOX_ADDRESS);
  return { signature: rows[0] ? String(JSON.parse(decrypt(rows[0].signature))) : "" };
}
