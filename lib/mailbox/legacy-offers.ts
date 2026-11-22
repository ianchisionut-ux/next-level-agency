import "server-only";
import { prisma } from "@/lib/prisma";
import { archiveEmail, archiveThreadSummary, getArchivedThread } from "./archive";
import { MAILBOX_ADDRESS, providerId } from "./config";
import { resendRequest } from "./provider";
import { mailboxSchema } from "./store";

type Json = Record<string, unknown>;
const MAX_PAGES = 3;
const MAX_IMPORTS = 5;

function address(value: unknown): string | null {
  if (typeof value !== "string" || /[\r\n]/.test(value)) return null;
  const trimmed = value.trim();
  const display = /^[^<>]*<([^<>]+)>$/.exec(trimmed);
  const email = (display ? display[1] : trimmed).trim().toLowerCase();
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ? email : null;
}

function offerReference(row: Json) {
  if (address(row.from) !== MAILBOX_ADDRESS || typeof row.subject !== "string" || /[\r\n]/.test(row.subject)) return null;
  const match = /^Propunere Next Level (.{1,100}?) – .+$/.exec(row.subject);
  if (!match || !Array.isArray(row.to) || row.to.length !== 1) return null;
  const recipient = address(row.to[0]);
  return recipient ? { number: match[1], recipient } : null;
}

async function matchesSavedOffer(reference: { number: string; recipient: string }) {
  const briefs = await prisma.websiteBrief.findMany({
    where: { offerEmailSentAt: { not: null }, offerData: { path: ["offerNumber"], equals: reference.number } },
    select: { offerData: true }, take: 10,
  });
  return briefs.some(brief => {
    const offer = brief.offerData && typeof brief.offerData === "object" && !Array.isArray(brief.offerData) ? brief.offerData as Json : {};
    return offer.offerNumber === reference.number && address(offer.customerEmail) === reference.recipient;
  });
}

/** Read-only provider recovery. Never send, draft or reconstruct an offer body. */
export async function synchronizeLegacyOffers(inboxId: string) {
  providerId(inboxId, "Inboxul");
  let imported = 0, skipped = 0, scanned = 0, after: string | null = null;
  const deadline = Date.now() + 8_000;
  const warning = "Unele oferte trimise anterior nu au fost încă importate. Sincronizează din nou; mesajele nu sunt retrimise.";
  try {
    await mailboxSchema();
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      if (Date.now() >= deadline) return { imported, skipped, scanned, partial: true, warning };
      const query = new URLSearchParams({ limit: "100" });
      if (after) query.set("after", after);
      const page = await resendRequest(`/emails?${query}`);
      if (!Array.isArray(page.data) || typeof page.has_more !== "boolean") throw new Error("Invalid sent listing");
      const rows = page.data as unknown[];
      const seen = new Set<string>();
      for (const value of rows) {
        if (Date.now() >= deadline) return { imported, skipped, scanned, partial: true, warning };
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid sent row");
        const summary = value as Json, id = providerId(summary.id);
        if (seen.has(id)) throw new Error("Repeated sent identifier");
        seen.add(id); scanned++;
        const reference = offerReference(summary);
        if (!reference) { skipped++; continue; }
        const threadId = providerId(`legacy_${id}`);
        if (await getArchivedThread(inboxId, threadId)) { skipped++; continue; }
        // A native Inbox send can appear in /emails before its webhook archive.
        // Do not create a competing synthetic thread for that same message.
        const known = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id::text FROM nextlevel_mailbox_operations WHERE mailbox=$1 AND status='SENT' AND result->>'id'=$2 LIMIT 1`, MAILBOX_ADDRESS, id);
        if (known.length || !(await matchesSavedOffer(reference))) { skipped++; continue; }
        if (imported >= MAX_IMPORTS) return { imported, skipped, scanned, partial: true, warning };
        const email = await resendRequest(`/emails/${encodeURIComponent(id)}`);
        const original = offerReference(email);
        if (email.id !== id || !original || original.number !== reference.number || original.recipient !== reference.recipient || email.subject !== summary.subject) throw new Error("Original sent message does not match listing");
        if (![email.html, email.text].every(body => body === null || typeof body === "string") || (!email.html && !email.text)) throw new Error("Original body unavailable");
        if (typeof email.created_at !== "string" || !Number.isFinite(Date.parse(email.created_at))) throw new Error("Original date unavailable");
        if (typeof email.last_event !== "string" || !["sent", "delivered", "delivery_delayed", "complained", "bounced", "opened", "clicked", "failed", "suppressed"].includes(email.last_event)) throw new Error("Send acceptance unavailable");
        // This send path never had attachments. Decline a different message
        // shape rather than silently claim to have archived all its contents.
        if (email.attachments !== undefined && (!Array.isArray(email.attachments) || email.attachments.length)) throw new Error("Unexpected legacy attachments");
        const receivedAt = new Date(email.created_at).toISOString();
        const payload = { ...email, direction: "outbound", received_at: receivedAt, attachments: [], read: true, source: "legacy-offer", delivery_status: email.last_event };
        await archiveEmail(inboxId, threadId, payload);
        await archiveThreadSummary(inboxId, threadId, { id: threadId, subject: email.subject, from: email.from, to: email.to, received_at: receivedAt, folder: "sent", has_sent: true, read: true, email_count: 1, source: "legacy-offer", delivery_status: email.last_event, provider_email_id: id });
        imported++;
      }
      if (!page.has_more) return { imported, skipped, scanned, partial: false };
      const last = rows.at(-1) as Json | undefined;
      const next = providerId(last?.id);
      if (next === after || !rows.length) throw new Error("Sent pagination stalled");
      after = next;
    }
    return { imported, skipped, scanned, partial: true, warning };
  } catch {
    return { imported, skipped, scanned, partial: true, warning };
  }
}
