import "server-only";
import { MAILBOX_ADDRESS, MailboxError, mailboxConfig, providerId } from "./config";
import { attachmentInfo, listThreads, mailboxStatus, normalizeEmail, ProviderError, resolveInbox, threadDetails, updateThread } from "./provider";
import { archiveEmail, archiveThreadSummary, claimMailboxArchiveScan, enqueueThreadArchive, getArchivedAttachment, getArchivedThread, listArchivedThreads, mailboxArchiveStatus, processMailboxArchiveJobs, releaseMailboxArchiveScan, saveMailboxArchiveScan, updateArchivedThread, type MailboxArchiveScan } from "./archive";

async function readInbox() {
  try { return { ...(await resolveInbox()), online: true }; }
  catch (error) {
    const id = mailboxConfig().inboxId;
    if (!id || (error instanceof MailboxError && error.code === "INBOX_ADDRESS_MISMATCH")) throw error;
    return { id: providerId(id), online: false };
  }
}

export async function mailboxThreads(folder: string, after?: string | null) {
  if (!["inbox", "sent", "archive"].includes(folder)) throw new MailboxError("Dosarul nu este valid.");
  const inbox = await readInbox();
  const localOnly = after?.startsWith("l_") || !inbox.online;
  const cursor = after ? providerId(after.replace(/^[pl]_/, ""), "Cursorul") : null;
  let remote: Awaited<ReturnType<typeof listThreads>> | null = null;
  let warning = inbox.online ? "" : "Resend nu este disponibil. Sunt afișate mesajele arhivate local.";
  if (!localOnly) {
    try {
      remote = await listThreads(folder, cursor, inbox.id);
      for (const thread of remote.rawThreads) {
        const id = providerId(thread.id);
        await archiveThreadSummary(inbox.id, id, { ...thread, ...(folder === "sent" ? { has_sent: true } : {}) });
      }
    } catch (error) {
      warning = "Sincronizarea Resend nu a reușit. Sunt afișate datele arhivate local.";
      if (!(error instanceof MailboxError)) throw error;
    }
  }
  const local = await listArchivedThreads(inbox.id, folder, cursor);
  const byId = new Map(local.items.map(item => [item.id, item]));
  for (const item of remote?.items || []) byId.set(item.id, item);
  const items = [...byId.values()].sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt) || right.id.localeCompare(left.id)).slice(0, 30);
  const nextCursor = remote?.nextCursor ? `p_${remote.nextCursor}` : local.nextCursor ? `l_${local.nextCursor}` : null;
  return { items, nextCursor, ...(warning ? { warning } : {}) };
}

export async function mailboxThread(id: string, after?: string | null) {
  const inbox = await readInbox();
  if (id.startsWith("legacy_")) {
    const cached = await getArchivedThread(inbox.id, id, after);
    if (!cached) throw new MailboxError("Mesajul recuperat nu există în arhiva locală.", 404, "THREAD_NOT_FOUND");
    return { ...cached, warning: "Mesaj recuperat din istoricul ofertelor Resend, fără retrimitere. Continuarea sau redirecționarea creează un mesaj nou." };
  }
  if (inbox.online) {
    try {
      const data = await threadDetails(id, after, inbox.id);
      await archiveThreadSummary(inbox.id, id, { id, subject: data.thread.subject, read: !data.thread.unread, folder: data.thread.folder, from: data.thread.from, to: data.thread.to, received_at: data.thread.lastMessageAt, email_count: data.thread.messageCount });
      const emails = [];
      for (const email of data.rawEmails) emails.push(normalizeEmail(await archiveEmail(inbox.id, id, email)));
      return { thread: data.thread, emails, nextCursor: data.nextCursor, archived: true };
    } catch (error) {
      const cached = await getArchivedThread(inbox.id, id, after);
      if (cached) return { ...cached, warning: "Resend nu este disponibil; este afișată copia arhivată local." };
      throw error;
    }
  }
  const cached = await getArchivedThread(inbox.id, id, after);
  if (!cached) throw new MailboxError("Conversația nu este disponibilă în arhiva locală.", 404, "THREAD_NOT_FOUND");
  return { ...cached, warning: "Este afișată copia arhivată local." };
}

export async function mailboxUpdate(id: string, input: unknown) {
  providerId(id, "Conversația");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MailboxError("Modificarea conversației nu este validă.");
  const value = input as { archived?: boolean; unread?: boolean };
  if ((value.archived !== undefined && typeof value.archived !== "boolean") || (value.unread !== undefined && typeof value.unread !== "boolean") || (value.archived === undefined && value.unread === undefined)) throw new MailboxError("Starea conversației nu este validă.");
  const inbox = await readInbox();
  let remote: Awaited<ReturnType<typeof updateThread>> | null = null;
  if (inbox.online && !id.startsWith("legacy_")) {
    try { remote = await updateThread(id, input); }
    catch (error) { if (!(error instanceof ProviderError)) throw error; }
  }
  const local = await updateArchivedThread(inbox.id, id, { ...(value.archived === undefined ? {} : { folder: value.archived ? "archive" : "inbox" }), ...(value.unread === undefined ? {} : { read: !value.unread }) });
  if (remote) return remote;
  if (!local) throw new MailboxError("Conversația nu este disponibilă în arhiva locală.", 404, "THREAD_NOT_FOUND");
  return { thread: local.thread, warning: "Modificarea a fost salvată în arhiva locală; Resend nu a confirmat actualizarea." };
}

function safeFileHeaders(filename: string, contentType: string, inline: boolean) {
  const image = /^image\/(png|jpeg|gif|webp|avif|bmp|x-icon)$/i.test(contentType);
  const name = filename.replace(/[\u0000-\u001f"\\]/g, "_").slice(0, 255) || "atasament";
  return { "Content-Type": inline && !image ? "application/octet-stream" : contentType || "application/octet-stream", "Content-Disposition": `${inline && image ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Content-Security-Policy": "sandbox; default-src 'none'" };
}

export async function mailboxAttachment(threadId: string, emailId: string, attachmentId: string, inline: boolean) {
  const inbox = await readInbox();
  const cached = await getArchivedAttachment(inbox.id, threadId, emailId, attachmentId);
  if (cached) return new Response(new Uint8Array(cached.data), { headers: safeFileHeaders(cached.filename, cached.contentType, inline) });
  if (!inbox.online) throw new MailboxError("Atașamentul nu este disponibil în arhiva locală.", 404, "ATTACHMENT_NOT_ARCHIVED");
  const file = await attachmentInfo(threadId, emailId, attachmentId);
  const response = await fetch(file.url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (!response.ok || Number(response.headers.get("content-length") || 0) > 40 * 1024 * 1024) throw new MailboxError("Atașamentul nu poate fi descărcat.", 502, "ATTACHMENT_UNAVAILABLE");
  const reader = response.body?.getReader();
  if (!reader) throw new MailboxError("Atașamentul nu poate fi descărcat.", 502, "ATTACHMENT_UNAVAILABLE");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 40 * 1024 * 1024) { await reader.cancel(); throw new MailboxError("Atașamentul depășește limita de 40 MB.", 413, "ATTACHMENT_TOO_LARGE"); } chunks.push(part.value); }
  } finally { reader.releaseLock(); }
  const data = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  if (file.size > 0 && file.size !== data.length) throw new MailboxError("Dimensiunea atașamentului nu corespunde răspunsului Resend.", 502, "ATTACHMENT_SIZE_MISMATCH");
  return new Response(new Uint8Array(data), { headers: safeFileHeaders(file.filename, file.contentType, inline) });
}

export async function synchronizeMailbox(options: { maxScanSteps?: number; scanBudgetMs?: number; recoverLegacyOffers?: boolean } = {}) {
  const inbox = await resolveInbox();
  const legacy = options.recoverLegacyOffers ? await (await import("./legacy-offers")).synchronizeLegacyOffers(inbox.id) : null;
  const deadline = Date.now() + Math.max(1000, Math.min(options.scanBudgetMs ?? 15_000, 45_000));
  const maximum = Math.max(1, Math.min(Number.isInteger(options.maxScanSteps) ? options.maxScanSteps! : 36, 100));
  type FolderScan = { folder: string; checkpoint: MailboxArchiveScan | null; finished: boolean; blocked: boolean; error?: string; rows: Map<string, Record<string, unknown>> };
  const scans: FolderScan[] = [];
  let threads = 0, queued = 0, steps = 0;
  try {
    for (const folder of ["inbox", "sent", "archive"]) scans.push({ folder, checkpoint: await claimMailboxArchiveScan(inbox.id, folder), finished: false, blocked: false, rows: new Map() });
    // Least-recently attempted folders go first, so a long or failing inbox
    // cannot starve Sent/Archive when the shared request budget expires.
    scans.sort((left, right) => Date.parse(left.checkpoint?.lastAttemptAt || "1970-01-01") - Date.parse(right.checkpoint?.lastAttemptAt || "1970-01-01"));
    while (steps < maximum && Date.now() < deadline) {
      const runnable = scans.filter(scan => scan.checkpoint && !scan.finished && !scan.blocked);
      if (!runnable.length) break;
      for (const scan of runnable) {
        if (steps >= maximum || Date.now() >= deadline) break;
        steps++;
        try {
          // A timestamp-only checkpoint attempt also preserves scheduling
          // fairness after a provider error, without advancing any cursor.
          scan.checkpoint = await saveMailboxArchiveScan(scan.checkpoint!, {});
          let checkpoint = scan.checkpoint;
          if (!checkpoint.threadIds.length) {
            const page = await listThreads(scan.folder, checkpoint.afterCursor, inbox.id);
            const threadIds = page.rawThreads.map(thread => providerId(thread.id));
            const next = page.nextCursor ? providerId(page.nextCursor, "Cursorul") : null;
            if (new Set(threadIds).size !== threadIds.length || (next && (!threadIds.length || next === checkpoint.afterCursor))) throw new MailboxError("Paginarea conversațiilor nu poate continua.", 502, "ARCHIVE_SCAN_PAGINATION");
            scan.rows = new Map(page.rawThreads.map(thread => [providerId(thread.id), thread]));
            if (!threadIds.length) {
              scan.checkpoint = await saveMailboxArchiveScan(checkpoint, { afterCursor: null, nextCursor: null, threadIds: [], emailCursor: null, completedAt: new Date().toISOString() });
              scan.finished = true;
              continue;
            }
            // The entire page ID snapshot survives restarts and new mail at
            // the head; its provider cursor has not advanced yet.
            scan.checkpoint = await saveMailboxArchiveScan(checkpoint, { threadIds, nextCursor: next, emailCursor: null });
            checkpoint = scan.checkpoint;
            if (Date.now() >= deadline) break;
          }
          const id = checkpoint.threadIds[0];
          await archiveThreadSummary(inbox.id, id, { ...(scan.rows.get(id) || { id }), ...(scan.folder === "sent" ? { has_sent: true } : {}) });
          const page = await enqueueThreadArchive(inbox.id, id, checkpoint.emailCursor);
          queued += page.queued;
          if (page.nextCursor) {
            const next = providerId(page.nextCursor, "Cursorul mesajelor");
            if (next === checkpoint.emailCursor) throw new MailboxError("Paginarea mesajelor nu poate continua.", 502, "ARCHIVE_SCAN_PAGINATION");
            scan.checkpoint = await saveMailboxArchiveScan(checkpoint, { emailCursor: next });
          } else {
            threads++;
            const remaining = checkpoint.threadIds.slice(1);
            if (remaining.length) scan.checkpoint = await saveMailboxArchiveScan(checkpoint, { threadIds: remaining, emailCursor: null });
            else if (checkpoint.nextCursor) scan.checkpoint = await saveMailboxArchiveScan(checkpoint, { afterCursor: checkpoint.nextCursor, nextCursor: null, threadIds: [], emailCursor: null });
            else {
              scan.checkpoint = await saveMailboxArchiveScan(checkpoint, { afterCursor: null, nextCursor: null, threadIds: [], emailCursor: null, completedAt: new Date().toISOString() });
              scan.finished = true;
            }
          }
        } catch (error) {
          // Enqueue is idempotent. A failed batch/checkpoint is replayed from
          // the last durable state instead of skipping an unopened thread.
          scan.blocked = true;
          scan.error = error instanceof MailboxError ? error.code : "ARCHIVE_SCAN_FAILED";
        }
      }
    }
  } finally {
    await Promise.allSettled(scans.flatMap(scan => scan.checkpoint ? [releaseMailboxArchiveScan(scan.checkpoint)] : []));
  }
  const processed = await processMailboxArchiveJobs(25, 20_000);
  const archive = await mailboxArchiveStatus(inbox.id);
  const scanPartial = scans.some(scan => !scan.finished);
  const cursors = scans.map(scan => ({ folder: scan.folder, after: scan.checkpoint?.afterCursor ?? null, thread: scan.checkpoint?.threadIds[0] ?? null, emailAfter: scan.checkpoint?.emailCursor ?? null, remaining: scan.checkpoint?.threadIds.length ?? null, next: scan.checkpoint?.nextCursor ?? null, complete: scan.finished, busy: !scan.checkpoint, lastCompletedAt: scan.checkpoint?.completedAt ?? null, ...(scan.error ? { error: scan.error } : {}) }));
  return { threads, queued, ...processed, partial: Boolean(legacy?.partial) || scanPartial || processed.pending > 0 || processed.deferred > 0 || archive.pending > 0 || archive.deferred > 0, scanPartial, cursors, archive, ...(legacy ? { legacy } : {}) };
}

export async function mailboxOverview() {
  const status = await mailboxStatus();
  if (!status.configured || !("inboxId" in status) || !status.inboxId) return status;
  if (!/^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY || "")) return { ...status, archiveReady: false, message: "Inboxul este conectat, dar cheia pentru arhivarea criptată trebuie configurată înainte de utilizare." };
  try {
    return { ...status, archiveReady: true, archive: await mailboxArchiveStatus(status.inboxId) };
  } catch {
    return { ...status, archiveReady: false, message: "Inboxul este conectat, dar arhiva locală nu poate fi verificată. Verifică configurația bazei de date și cheia de criptare înainte de utilizare." };
  }
}

export { MAILBOX_ADDRESS };
