import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { MailboxError, mailboxConfig, providerId } from "./config";
import { getEmail, getThread, normalizeEmail, normalizeThread, resendRequest, resolveInbox } from "./provider";

type Json = Record<string, unknown>;
type StoredEmail = { payload: Json; encrypted_payload: string; body_sha256: string; thread_id: string; attachments_complete: boolean; stored_files?: Json[] };
type ArchiveJob = { inbox_id: string; email_id: string; thread_id: string; attempts: number };
declare global { var __nextlevelMailboxArchiveSchema: Promise<void> | undefined; }

const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024;
const MAX_EMAIL_BYTES = 40 * 1024 * 1024;
const folders = new Set(["inbox", "sent", "archive", "spam", "trash"]);
const list = (value: unknown): Json[] => Array.isArray(value) ? value.filter((item): item is Json => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

function packEmail(email: Json) {
  const body = JSON.stringify(email);
  const metadata = Object.fromEntries(["id", "direction", "from", "to", "cc", "bcc", "reply_to", "subject", "message_id", "attachments", "read", "received_at"].map(key => [key, email[key]]));
  return { metadata: JSON.stringify(metadata), encrypted: encrypt(body), checksum: hash(body) };
}

function packAttachment(content: Buffer) {
  const [iv, tag, encrypted] = encrypt(JSON.stringify({ base64: content.toString("base64") })).split(":");
  // Keep the existing AES-GCM format, packed into bytes rather than storing
  // hexadecimal text in BYTEA. This halves ciphertext storage and transfer.
  return Buffer.concat([Buffer.from("NLMA1"), Buffer.from(iv, "hex"), Buffer.from(tag, "hex"), Buffer.from(encrypted, "hex")]);
}

function unpackAttachment(content: Uint8Array) {
  const bytes = Buffer.from(content);
  const encoded = bytes.subarray(0, 5).toString("ascii") === "NLMA1"
    ? `${bytes.subarray(5, 17).toString("hex")}:${bytes.subarray(17, 33).toString("hex")}:${bytes.subarray(33).toString("hex")}`
    : bytes.toString("utf8");
  const decoded = JSON.parse(decrypt(encoded)) as { base64: string };
  if (typeof decoded.base64 !== "string") throw new MailboxError("Atașament arhivat invalid.", 503, "ARCHIVE_CHECKSUM");
  return Buffer.from(decoded.base64, "base64");
}

function unpackEmail(row: StoredEmail): Json {
  const body = decrypt(row.encrypted_payload);
  if (hash(body) !== row.body_sha256) throw new MailboxError("Integritatea mesajului arhivat nu a putut fi verificată.", 503, "ARCHIVE_CHECKSUM");
  const email = JSON.parse(body) as Json;
  return { ...email, read: typeof row.payload.read === "boolean" ? row.payload.read : email.read,
    attachments: list(email.attachments).map(file => ({ ...file, ...(row.stored_files?.find(saved => saved.id === file.id) || {}) })) };
}

const storedAttachmentMetadata = `(SELECT jsonb_agg(jsonb_build_object('id',a.attachment_id,'filename',a.filename,'content_type',a.content_type,'content_id',a.content_id,'content_disposition',a.content_disposition,'size',a.byte_size)) FROM nextlevel_mailbox_archive_attachments a WHERE a.inbox_id=e.inbox_id AND a.email_id=e.email_id) AS stored_files`;

async function schema() {
  if (!globalThis.__nextlevelMailboxArchiveSchema) {
    globalThis.__nextlevelMailboxArchiveSchema = prisma.$transaction(async transaction => {
      await transaction.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
      await transaction.$executeRawUnsafe("SELECT pg_advisory_xact_lock(74002,1)");
      const sql = await readFile(path.join(process.cwd(), "prisma", "mailbox-archive.sql"), "utf8");
      for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await transaction.$executeRawUnsafe(statement);
    }).catch(error => { globalThis.__nextlevelMailboxArchiveSchema = undefined; throw error; });
  }
  return globalThis.__nextlevelMailboxArchiveSchema;
}

export type MailboxArchiveScan = {
  inboxId: string; folder: string; afterCursor: string | null; nextCursor: string | null;
  threadIds: string[]; emailCursor: string | null; completedAt: string | null;
  lastAttemptAt: string | null; revision: number; leaseToken: string;
};
type ScanRow = { inbox_id: string; folder: string; after_cursor: string | null; next_cursor: string | null; thread_ids: string[]; email_cursor: string | null; completed_at: Date | string | null; last_attempt_at: Date | string | null; revision: bigint | number; lease_token: string };
const scanFolders = new Set(["inbox", "sent", "archive"]);

function scanState(row: ScanRow): MailboxArchiveScan {
  const revision = Number(row.revision);
  if (!Number.isSafeInteger(revision) || revision < 0 || !Array.isArray(row.thread_ids)) throw new MailboxError("Checkpointul arhivei nu este valid.", 503, "ARCHIVE_SCAN_STATE");
  return { inboxId: row.inbox_id, folder: row.folder, afterCursor: row.after_cursor, nextCursor: row.next_cursor,
    threadIds: row.thread_ids.map(id => providerId(id)), emailCursor: row.email_cursor,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : null,
    revision, leaseToken: row.lease_token };
}

/** A renewable lease, never a transaction held across provider requests. */
export async function claimMailboxArchiveScan(inboxId: string, folder: string): Promise<MailboxArchiveScan | null> {
  providerId(inboxId); if (!scanFolders.has(folder)) throw new MailboxError("Dosar invalid.");
  await schema();
  await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_scans(inbox_id,folder) VALUES ($1,$2) ON CONFLICT DO NOTHING`, inboxId, folder);
  const rows = await prisma.$queryRawUnsafe<ScanRow[]>(`UPDATE nextlevel_mailbox_archive_scans SET lease_token=$3::uuid,lease_until=now()+interval '5 minutes'
    WHERE inbox_id=$1 AND folder=$2 AND (lease_until IS NULL OR lease_until<now()) RETURNING *`, inboxId, folder, randomUUID());
  return rows[0] ? scanState(rows[0]) : null;
}

/** Page IDs are durable before work starts; a cursor advances only after enqueue. */
export async function saveMailboxArchiveScan(state: MailboxArchiveScan, update: Partial<Pick<MailboxArchiveScan, "afterCursor" | "nextCursor" | "threadIds" | "emailCursor" | "completedAt">>): Promise<MailboxArchiveScan> {
  const next = { ...state, ...update };
  next.threadIds.forEach(id => providerId(id));
  for (const cursor of [next.afterCursor, next.nextCursor, next.emailCursor]) if (cursor !== null) providerId(cursor);
  if (next.threadIds.length > 100 || (!next.threadIds.length && next.emailCursor) || (next.completedAt && !Number.isFinite(Date.parse(next.completedAt)))) throw new MailboxError("Checkpointul arhivei nu este valid.", 503, "ARCHIVE_SCAN_STATE");
  const rows = await prisma.$queryRawUnsafe<ScanRow[]>(`UPDATE nextlevel_mailbox_archive_scans SET after_cursor=$4,next_cursor=$5,thread_ids=$6::jsonb,email_cursor=$7,completed_at=$8::timestamptz,
      revision=revision+1,last_attempt_at=now(),lease_until=now()+interval '5 minutes',updated_at=now()
    WHERE inbox_id=$1 AND folder=$2 AND lease_token=$3::uuid AND revision=$9 AND lease_until>now() RETURNING *`,
    state.inboxId, state.folder, state.leaseToken, next.afterCursor, next.nextCursor, JSON.stringify(next.threadIds), next.emailCursor, next.completedAt, state.revision);
  if (!rows[0]) throw new MailboxError("Scanarea arhivei este preluată de altă rulare și va continua.", 409, "ARCHIVE_SCAN_LEASE");
  return scanState(rows[0]);
}

export async function releaseMailboxArchiveScan(state: MailboxArchiveScan) {
  await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_scans SET lease_token=NULL,lease_until=NULL WHERE inbox_id=$1 AND folder=$2 AND lease_token=$3::uuid`, state.inboxId, state.folder, state.leaseToken);
}

function ids(inboxId: string, threadId: string, emailId?: string) {
  providerId(inboxId, "Inboxul"); providerId(threadId, "Conversația");
  if (emailId !== undefined) providerId(emailId, "Mesajul");
}

export async function archiveThreadSummary(inboxId: string, threadId: string, summary: Json, observedAt = new Date().toISOString()) {
  ids(inboxId, threadId);
  if (summary.id !== threadId) throw new MailboxError("Conversația nu corespunde arhivei.", 400, "ARCHIVE_ID_MISMATCH");
  await schema();
  if (!Number.isFinite(Date.parse(observedAt))) throw new MailboxError("Data arhivei este invalidă.");
  await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_threads(inbox_id,thread_id,summary,summary_at) VALUES ($1,$2,$3::jsonb,$4::timestamptz)
    ON CONFLICT (inbox_id,thread_id) DO UPDATE SET summary=nextlevel_mailbox_archive_threads.summary||EXCLUDED.summary,summary_at=EXCLUDED.summary_at,updated_at=now()
    WHERE nextlevel_mailbox_archive_threads.summary_at<=EXCLUDED.summary_at`, inboxId, threadId, JSON.stringify(summary), observedAt);
}

async function enqueue(inboxId: string, threadId: string, emailId: string) {
  await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_jobs(inbox_id,thread_id,email_id) VALUES ($1,$2,$3)
    ON CONFLICT (inbox_id,email_id) DO NOTHING`, inboxId, threadId, emailId);
}

async function attachmentMetadata(email: Json) {
  const expected = list(email.attachments);
  if (!expected.length) return [];
  const direction = email.direction === "inbound" ? "receiving/" : email.direction === "outbound" ? "" : null;
  if (direction === null) throw new MailboxError("Direcția mesajului nu este validă.", 502, "ARCHIVE_INVALID_EMAIL");
  const found = new Map<string, Json>();
  let after = "";
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ limit: "100" });
    if (after) query.set("after", after);
    const result = await resendRequest(`/emails/${direction}${providerId(email.id)}/attachments?${query}`);
    const files = list(result.data);
    for (const file of files) found.set(providerId(file.id), file);
    if (result.has_more !== true) break;
    const cursor = files.at(-1)?.id;
    if (!cursor || cursor === after) throw new MailboxError("Paginarea atașamentelor nu a putut fi încheiată.", 502, "ARCHIVE_PAGINATION");
    after = providerId(cursor);
    if (page === 99) throw new MailboxError("Lista atașamentelor depășește limita de arhivare.", 502, "ARCHIVE_PAGINATION");
  }
  if (expected.some(file => !found.has(providerId(file.id)))) throw new MailboxError("Unele atașamente nu au putut fi identificate.", 502, "ARCHIVE_ATTACHMENT_MISSING");
  return expected.map(file => found.get(providerId(file.id))!);
}

/** Saves the untruncated provider body, then enriches metadata. Bytes are queued. */
export async function archiveEmail(inboxId: string, threadId: string, email: Json): Promise<Json> {
  const emailId = providerId(email.id, "Mesajul"); ids(inboxId, threadId, emailId);
  if (!["inbound", "outbound"].includes(String(email.direction)) || ![email.html, email.text].every(value => value === null || typeof value === "string") || !Array.isArray(email.attachments)) throw new MailboxError("Arhivarea necesită corpul complet al mesajului.", 502, "ARCHIVE_INCOMPLETE_EMAIL");
  for (const file of list(email.attachments)) providerId(file.id, "Atașamentul");
  const receivedAt = typeof email.received_at === "string" ? new Date(email.received_at) : new Date(NaN);
  if (!Number.isFinite(receivedAt.getTime())) throw new MailboxError("Data mesajului nu este validă.", 502, "ARCHIVE_INVALID_EMAIL");
  const body = JSON.stringify(email);
  if (Buffer.byteLength(body, "utf8") > MAX_EMAIL_BYTES) throw new MailboxError("Mesajul depășește limita de arhivare.", 502, "ARCHIVE_TOO_LARGE");
  const stored = packEmail(email);
  await schema();
  await prisma.$transaction(async transaction => {
    await transaction.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_threads(inbox_id,thread_id,summary) VALUES ($1,$2,$3::jsonb) ON CONFLICT DO NOTHING`, inboxId, threadId, JSON.stringify({ id: threadId, subject: email.subject, folder: email.direction === "outbound" ? "sent" : "inbox", read: email.read }));
    const changed = await transaction.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_emails(inbox_id,email_id,thread_id,payload,direction,received_at,body_sha256,attachments_complete,encrypted_payload)
      VALUES ($1,$2,$3,$4::jsonb,$5,$6::timestamptz,$7,$8,$9)
      ON CONFLICT (inbox_id,email_id) DO UPDATE SET payload=EXCLUDED.payload,encrypted_payload=EXCLUDED.encrypted_payload,body_sha256=EXCLUDED.body_sha256,updated_at=now()
        ,attachments_complete=NOT EXISTS (SELECT 1 FROM jsonb_array_elements(EXCLUDED.payload->'attachments') file WHERE NOT EXISTS (
          SELECT 1 FROM nextlevel_mailbox_archive_attachments saved WHERE saved.inbox_id=EXCLUDED.inbox_id AND saved.email_id=EXCLUDED.email_id AND saved.attachment_id=file->>'id'))
      WHERE nextlevel_mailbox_archive_emails.thread_id=EXCLUDED.thread_id`, inboxId, emailId, threadId, stored.metadata, email.direction, receivedAt.toISOString(), stored.checksum, list(email.attachments).length === 0, stored.encrypted);
    if (!changed) throw new MailboxError("Mesajul este legat de altă conversație în arhivă.", 409, "ARCHIVE_ID_MISMATCH");
    if (email.direction === "outbound") await transaction.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_threads SET summary=summary||'{"has_sent":true}'::jsonb WHERE inbox_id=$1 AND thread_id=$2`, inboxId, threadId);
    await transaction.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_jobs(inbox_id,thread_id,email_id) VALUES ($1,$2,$3)
      ON CONFLICT (inbox_id,email_id) DO UPDATE SET status='PENDING',next_attempt_at=now(),updated_at=now()
      WHERE nextlevel_mailbox_archive_jobs.status='DONE' AND EXISTS (SELECT 1 FROM nextlevel_mailbox_archive_emails e WHERE e.inbox_id=$1 AND e.email_id=$3 AND NOT e.attachments_complete)`, inboxId, threadId, emailId);
  });
  if (!list(email.attachments).length) return email;
  try {
    const metadata = await attachmentMetadata(email);
    const enriched = { ...email, attachments: metadata.map(file => {
      const { download_url: _url, expires_at: _expires, ...safe } = file;
      return safe;
    }) };
    const storedEnriched = packEmail(enriched);
    await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_emails SET payload=$4::jsonb||jsonb_build_object('read',payload->'read'),encrypted_payload=$5,body_sha256=$6,updated_at=now() WHERE inbox_id=$1 AND thread_id=$2 AND email_id=$3`, inboxId, threadId, emailId, storedEnriched.metadata, storedEnriched.encrypted, storedEnriched.checksum);
    return enriched;
  } catch {
    // The body is already durable. The job retries metadata and bytes; an
    // attachment outage must not discard a message or expose provider details.
    return email;
  }
}

export async function archiveReceivedEmail(inboxId: string, threadId: string, emailId: string) {
  ids(inboxId, threadId, emailId);
  await schema(); await enqueue(inboxId, threadId, emailId);
  const email = await getEmail(inboxId, threadId, emailId);
  const enriched = await archiveEmail(inboxId, threadId, email);
  await archiveThreadSummary(inboxId, threadId, await getThread(inboxId, threadId));
  return enriched;
}

export async function archiveThread(inboxId: string, threadId: string) {
  ids(inboxId, threadId);
  await archiveThreadSummary(inboxId, threadId, await getThread(inboxId, threadId));
  let after = "", archived = 0;
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ limit: "100" }); if (after) query.set("after", after);
    const result = await resendRequest(`/inboxes/${inboxId}/threads/${threadId}/emails?${query}`);
    const emails = list(result.data);
    for (const email of emails) { await archiveEmail(inboxId, threadId, email); archived++; }
    if (result.has_more !== true) return { archived };
    const cursor = emails.at(-1)?.id;
    if (!cursor || cursor === after) throw new MailboxError("Paginarea mesajelor nu a putut fi încheiată.", 502, "ARCHIVE_PAGINATION");
    after = providerId(cursor);
  }
  throw new MailboxError("Conversația necesită o continuare a arhivării.", 502, "ARCHIVE_PAGINATION");
}

/** Queue unopened historical messages too, with a bounded/resumable listing. */
export async function enqueueThreadArchive(inboxId: string, threadId: string, after?: string | null) {
  ids(inboxId, threadId); if (after) providerId(after); await schema();
  await archiveThreadSummary(inboxId, threadId, await getThread(inboxId, threadId));
  let cursor = after || "", queued = 0;
  for (let page = 0; page < 3; page++) {
    const query = new URLSearchParams({ limit: "100" }); if (cursor) query.set("after", cursor);
    const result = await resendRequest(`/inboxes/${inboxId}/threads/${threadId}/emails?${query}`);
    const emailIds = list(result.data).map(email => providerId(email.id));
    if (emailIds.length) queued += await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_jobs(inbox_id,thread_id,email_id)
      SELECT $1,$2,value FROM jsonb_array_elements_text($3::jsonb) ON CONFLICT DO NOTHING`, inboxId, threadId, JSON.stringify(emailIds));
    if (result.has_more !== true) return { queued, nextCursor: null };
    const next = emailIds.at(-1);
    if (!next || next === cursor) throw new MailboxError("Paginarea mesajelor nu a putut fi încheiată.", 502, "ARCHIVE_PAGINATION");
    cursor = next;
  }
  return { queued, nextCursor: cursor };
}

export async function mailboxArchiveStatus(inboxId: string) {
  providerId(inboxId);
  if (decrypt(encrypt("mailbox-archive-check")) !== "mailbox-archive-check") throw new MailboxError("Criptarea arhivei nu poate fi verificată.", 503, "ARCHIVE_ENCRYPTION");
  await schema();
  const rows = await prisma.$queryRawUnsafe<{ emails: bigint; attachments: bigint; pending: bigint; deferred: bigint }[]>(`SELECT
    (SELECT count(*) FROM nextlevel_mailbox_archive_emails WHERE inbox_id=$1) AS emails,
    (SELECT count(*) FROM nextlevel_mailbox_archive_attachments WHERE inbox_id=$1) AS attachments,
    (SELECT count(*) FROM nextlevel_mailbox_archive_jobs WHERE inbox_id=$1 AND status<>'DONE') AS pending,
    (SELECT count(*) FROM nextlevel_mailbox_archive_jobs WHERE inbox_id=$1 AND status<>'DONE' AND error_code IS NOT NULL) AS deferred`, inboxId);
  const row = rows[0];
  return { emails: Number(row?.emails || 0), attachments: Number(row?.attachments || 0), pending: Number(row?.pending || 0), deferred: Number(row?.deferred || 0) };
}

export async function getArchivedEmail(inboxId: string, threadId: string, emailId: string): Promise<Json | null> {
  ids(inboxId, threadId, emailId); await schema();
  const result = await prisma.$queryRawUnsafe<StoredEmail[]>(`SELECT e.payload,e.encrypted_payload,e.body_sha256,e.thread_id,e.attachments_complete,${storedAttachmentMetadata} FROM nextlevel_mailbox_archive_emails e WHERE e.inbox_id=$1 AND e.thread_id=$2 AND e.email_id=$3`, inboxId, threadId, emailId);
  return result[0] ? unpackEmail(result[0]) : null;
}

export async function getArchivedAttachment(inboxId: string, threadId: string, emailId: string, attachmentId: string) {
  ids(inboxId, threadId, emailId); providerId(attachmentId); await schema();
  const rows = await prisma.$queryRawUnsafe<{ content: Uint8Array; filename: string; content_type: string; byte_size: number; sha256: string; content_id: string | null; content_disposition: string | null }[]>(`SELECT content,filename,content_type,byte_size,sha256,content_id,content_disposition FROM nextlevel_mailbox_archive_attachments WHERE inbox_id=$1 AND thread_id=$2 AND email_id=$3 AND attachment_id=$4`, inboxId, threadId, emailId, attachmentId);
  if (!rows[0]) return null;
  const file = rows[0], data = unpackAttachment(file.content);
  if (data.length !== file.byte_size || hash(data) !== file.sha256) throw new MailboxError("Integritatea atașamentului arhivat nu a putut fi verificată.", 503, "ARCHIVE_CHECKSUM");
  return { data, filename: file.filename, contentType: file.content_type, size: file.byte_size, sha256: file.sha256, contentId: file.content_id, contentDisposition: file.content_disposition };
}

export async function listArchivedThreads(inboxId: string, folder: string, after?: string | null) {
  providerId(inboxId); if (!folders.has(folder)) throw new MailboxError("Dosar invalid.");
  if (after) providerId(after); await schema();
  const rows = await prisma.$queryRawUnsafe<{ thread_id: string; summary: Json; last_at: Date; email_count: bigint; last_email: Json }[]>(`
    WITH threads AS (
      SELECT t.thread_id,t.summary,
        COALESCE(GREATEST(max(e.received_at),NULLIF(t.summary->>'received_at','')::timestamptz),t.updated_at) AS last_at,
        GREATEST(count(e.email_id),COALESCE((t.summary->>'email_count')::bigint,0)) AS email_count,
        CASE WHEN max(e.received_at) IS NULL OR NULLIF(t.summary->>'received_at','')::timestamptz>max(e.received_at) THEN t.summary
          ELSE (array_agg(e.payload ORDER BY e.received_at DESC,e.email_id DESC) FILTER (WHERE e.email_id IS NOT NULL))[1] END AS last_email,
        (COALESCE(bool_or(e.direction='outbound'),false) OR t.summary->>'has_sent'='true' OR t.summary->>'folder'='sent') AS has_sent
      FROM nextlevel_mailbox_archive_threads t LEFT JOIN nextlevel_mailbox_archive_emails e ON e.inbox_id=t.inbox_id AND e.thread_id=t.thread_id
      WHERE t.inbox_id=$1 GROUP BY t.thread_id,t.summary,t.updated_at
    ) SELECT * FROM threads WHERE (CASE WHEN $2='sent' THEN has_sent ELSE summary->>'folder'=$2 END)
      AND ($3::text IS NULL OR (last_at,thread_id)<(SELECT last_at,thread_id FROM threads WHERE thread_id=$3))
    ORDER BY last_at DESC,thread_id DESC LIMIT 31`, inboxId, folder, after || null);
  const page = rows.slice(0, 30);
  const items = page.map(row => normalizeThread({ ...row.summary, id: row.thread_id, from: row.last_email.from, to: row.last_email.to, received_at: row.last_at.toISOString(), email_count: Number(row.email_count), snippet: String(row.last_email.text || "").slice(0, 500) }));
  return { items, nextCursor: rows.length > 30 ? page.at(-1)!.thread_id : null };
}

export async function getArchivedThread(inboxId: string, threadId: string, after?: string | null) {
  ids(inboxId, threadId); if (after) providerId(after); await schema();
  const summaries = await prisma.$queryRawUnsafe<{ summary: Json; email_count: bigint; last_email: Json | null }[]>(`SELECT t.summary,
    (SELECT count(*) FROM nextlevel_mailbox_archive_emails e WHERE e.inbox_id=t.inbox_id AND e.thread_id=t.thread_id) AS email_count,
    (SELECT payload FROM nextlevel_mailbox_archive_emails e WHERE e.inbox_id=t.inbox_id AND e.thread_id=t.thread_id ORDER BY received_at DESC,email_id DESC LIMIT 1) AS last_email
    FROM nextlevel_mailbox_archive_threads t WHERE t.inbox_id=$1 AND t.thread_id=$2`, inboxId, threadId);
  if (!summaries[0]) return null;
  const messages = await prisma.$queryRawUnsafe<StoredEmail[]>(`SELECT e.payload,e.encrypted_payload,e.body_sha256,e.thread_id,e.attachments_complete,${storedAttachmentMetadata} FROM nextlevel_mailbox_archive_emails e WHERE e.inbox_id=$1 AND e.thread_id=$2
    AND ($3::text IS NULL OR (e.received_at,e.email_id)>(SELECT received_at,email_id FROM nextlevel_mailbox_archive_emails WHERE inbox_id=$1 AND thread_id=$2 AND email_id=$3))
    ORDER BY e.received_at,e.email_id LIMIT 101`, inboxId, threadId, after || null);
  const emails = messages.slice(0, 100).map(row => normalizeEmail(unpackEmail(row)));
  if (!emails.length && !after) return null;
  const last = emails.at(-1), summary = summaries[0].summary, latest = summaries[0].last_email;
  const latestAt = String(latest?.received_at || ""), summaryAt = String(summary.received_at || "");
  const summaryIsNewer = Date.parse(summaryAt) > Date.parse(latestAt) || !latestAt;
  const newest = summaryIsNewer ? summary : latest;
  return { thread: normalizeThread({ ...summary, id: threadId, from: newest?.from, to: newest?.to,
    received_at: summaryIsNewer ? summaryAt : latestAt, email_count: Math.max(Number(summaries[0].email_count), Number(summary.email_count || 0)) }), emails, nextCursor: messages.length > 100 ? last!.id : null, archived: true };
}

export async function queueMailboxArchiveEvent(eventId: string, event: Json, rawPayload: string) {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(eventId)) throw new MailboxError("Eveniment invalid.", 400, "INVALID_EVENT");
  const type = String(event.type || "");
  const emailEvent = ["inbox.email.received", "inbox.email.sent", "inbox.thread.created", "inbox.draft.sent"].includes(type);
  if (!emailEvent && !["inbox.thread.folder.updated", "inbox.thread.labels.updated"].includes(type)) return { queued: false };
  const data = event.data && typeof event.data === "object" && !Array.isArray(event.data) ? event.data as Json : {};
  const inboxId = providerId(data.inbox_id), threadId = providerId(data.thread_id);
  const emailId = emailEvent ? providerId(data.email_id) : null;
  const config = mailboxConfig();
  const expectedId = config.inboxId ? providerId(config.inboxId) : (await resolveInbox()).id;
  if (expectedId !== inboxId) return { queued: false };
  await schema();
  await prisma.$transaction(async transaction => {
    const fingerprint = hash(rawPayload);
    const accepted = await transaction.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_webhook_events(event_id,payload_sha256,event_type,inbox_id) VALUES ($1,$2,$3,$4)
      ON CONFLICT (event_id) DO UPDATE SET event_id=EXCLUDED.event_id WHERE nextlevel_mailbox_webhook_events.payload_sha256=EXCLUDED.payload_sha256`, eventId, fingerprint, type, inboxId);
    if (!accepted) throw new MailboxError("Evenimentul nu corespunde primirii inițiale.", 409, "EVENT_CONFLICT");
    if (emailId) await transaction.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_jobs(inbox_id,thread_id,email_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, inboxId, threadId, emailId);
  });
  if (data.thread && typeof data.thread === "object" && !Array.isArray(data.thread) && typeof event.created_at === "string") await archiveThreadSummary(inboxId, threadId, data.thread as Json, event.created_at);
  return { queued: true };
}

export async function updateArchivedThread(inboxId: string, threadId: string, update: { folder?: string; read?: boolean }) {
  ids(inboxId, threadId); await schema();
  if (update.folder !== undefined && !folders.has(update.folder)) throw new MailboxError("Dosar invalid.");
  if (update.read !== undefined && typeof update.read !== "boolean") throw new MailboxError("Stare invalidă.");
  await prisma.$transaction(async transaction => {
    const patch = { ...(update.folder !== undefined ? { folder: update.folder } : {}), ...(update.read !== undefined ? { read: update.read } : {}) };
    await transaction.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_threads SET summary=summary||$3::jsonb,summary_at=now(),updated_at=now() WHERE inbox_id=$1 AND thread_id=$2`, inboxId, threadId, JSON.stringify(patch));
    if (update.read !== undefined) await transaction.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_emails SET payload=jsonb_set(payload,'{read}',$3::jsonb),updated_at=now() WHERE inbox_id=$1 AND thread_id=$2`, inboxId, threadId, JSON.stringify(update.read));
  });
  return getArchivedThread(inboxId, threadId);
}

async function downloadAttachment(urlValue: unknown) {
  let url: URL;
  try { url = new URL(String(urlValue || "")); } catch { throw new MailboxError("Atașamentul nu este disponibil.", 502, "ARCHIVE_ATTACHMENT_URL"); }
  if (url.protocol !== "https:" || !["inbound-cdn.resend.com", "outbound-cdn.resend.com"].includes(url.hostname) || url.username || url.password || url.port) throw new MailboxError("Adresa atașamentului nu este permisă.", 502, "ARCHIVE_ATTACHMENT_URL");
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.body) throw new MailboxError("Atașamentul nu a putut fi descărcat.", 502, "ARCHIVE_ATTACHMENT_FETCH");
  if (Number(response.headers.get("content-length") || 0) > MAX_ATTACHMENT_BYTES) { await response.body.cancel(); throw new MailboxError("Atașament prea mare.", 502, "ARCHIVE_TOO_LARGE"); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_ATTACHMENT_BYTES) { await reader.cancel(); throw new MailboxError("Atașament prea mare.", 502, "ARCHIVE_TOO_LARGE"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
}

async function finishEmailArchive(job: ArchiveJob, deadline: number) {
  const { inbox_id: inboxId, thread_id: threadId, email_id: emailId } = job;
  let email = await getArchivedEmail(inboxId, threadId, emailId);
  if (!email) email = await archiveReceivedEmail(inboxId, threadId, emailId);
  const files = await attachmentMetadata(email);
  let totalBytes = 0;
  for (const file of files) {
    if (Date.now() >= deadline - 1000) throw new MailboxError("Arhivarea continuă la următoarea rulare.", 503, "ARCHIVE_CONTINUE");
    const attachmentId = providerId(file.id);
    const existing = await getArchivedAttachment(inboxId, threadId, emailId, attachmentId);
    if (existing) { totalBytes += existing.size; continue; }
    const content = await downloadAttachment(file.download_url); totalBytes += content.length;
    if (totalBytes > MAX_EMAIL_BYTES) throw new MailboxError("Atașamentele depășesc limita mesajului.", 502, "ARCHIVE_TOO_LARGE");
    if (typeof file.size === "number" && file.size !== content.length) throw new MailboxError("Dimensiunea atașamentului nu corespunde.", 502, "ARCHIVE_ATTACHMENT_SIZE");
    await prisma.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_archive_attachments(inbox_id,email_id,attachment_id,thread_id,filename,content_type,content_id,content_disposition,byte_size,content,sha256)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`, inboxId, emailId, attachmentId, threadId, String(file.filename || "atasament").slice(0, 255), String(file.content_type || "application/octet-stream").slice(0, 200), typeof file.content_id === "string" ? file.content_id : null, typeof file.content_disposition === "string" ? file.content_disposition : null, content.length, packAttachment(content), hash(content));
  }
  const enriched = { ...email, attachments: files.map(file => { const { download_url: _url, expires_at: _expires, ...safe } = file; return safe; }) };
  const stored = packEmail(enriched);
  await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_emails SET payload=$4::jsonb||jsonb_build_object('read',payload->'read'),encrypted_payload=$5,body_sha256=$6,attachments_complete=true,updated_at=now() WHERE inbox_id=$1 AND thread_id=$2 AND email_id=$3`, inboxId, threadId, emailId, stored.metadata, stored.encrypted, stored.checksum);
}

/** Durable leases and retries. No network request holds a database transaction. */
export async function processMailboxArchiveJobs(limit = 5, budgetMs = 20_000) {
  await schema();
  const inbox = await resolveInbox();
  const deadline = Date.now() + Math.max(1000, Math.min(budgetMs, 45_000));
  const maximum = Math.max(1, Math.min(Number.isInteger(limit) ? limit : 5, 100));
  let processed = 0, completed = 0, deferred = 0;
  while (processed < maximum && Date.now() < deadline - 1000) {
    const job = await prisma.$transaction(async transaction => {
      const rows = await transaction.$queryRawUnsafe<ArchiveJob[]>(`SELECT inbox_id,email_id,thread_id,attempts FROM nextlevel_mailbox_archive_jobs
        WHERE inbox_id=$1 AND ((status='PENDING' AND next_attempt_at<=now()) OR (status='PROCESSING' AND lease_until<now()))
        ORDER BY next_attempt_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1`, inbox.id);
      if (!rows[0]) return null;
      await transaction.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_jobs SET status='PROCESSING',attempts=attempts+1,lease_until=now()+interval '2 minutes',updated_at=now() WHERE inbox_id=$1 AND email_id=$2`, inbox.id, rows[0].email_id);
      return rows[0];
    });
    if (!job) break;
    processed++;
    try {
      await finishEmailArchive(job, deadline);
      await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_jobs SET status='DONE',lease_until=NULL,error_code=NULL,updated_at=now() WHERE inbox_id=$1 AND email_id=$2`, job.inbox_id, job.email_id);
      completed++;
    } catch (error) {
      const code = error instanceof MailboxError ? error.code : "ARCHIVE_FAILED";
      const delay = code === "ARCHIVE_CONTINUE" ? 5 : Math.min(21_600, 30 * 2 ** Math.min(job.attempts, 10));
      await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_archive_jobs SET status='PENDING',lease_until=NULL,error_code=$3,next_attempt_at=now()+($4::int*interval '1 second'),updated_at=now() WHERE inbox_id=$1 AND email_id=$2`, job.inbox_id, job.email_id, code.slice(0, 100), delay);
      deferred++;
    }
  }
  const counts = await prisma.$queryRawUnsafe<{ pending: bigint }[]>(`SELECT count(*) AS pending FROM nextlevel_mailbox_archive_jobs WHERE inbox_id=$1 AND status<>'DONE'`, inbox.id);
  return { processed, completed, deferred, pending: Number(counts[0]?.pending || 0) };
}
