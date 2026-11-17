import { after, NextResponse } from "next/server";
import { queueMailboxArchiveEvent, processMailboxArchiveJobs } from "@/lib/mailbox/archive";
import { MailboxError } from "@/lib/mailbox/config";
import { readMailboxWebhookBody, verifyMailboxWebhook } from "@/lib/mailbox/webhook";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Resend cannot carry a browser session. Authenticate this POST with the signed
// raw payload, then acknowledge only after the archive job is durable in SQL.
export async function POST(request: Request) {
  try {
    const payload = await readMailboxWebhookBody(request);
    const verified = verifyMailboxWebhook(payload, request.headers);
    const result = await queueMailboxArchiveEvent(verified.eventId, verified.event, payload);
    if (result.queued) after(async () => { try { await processMailboxArchiveJobs(5, 20_000); } catch { /* Durable jobs remain pending for the protected retry runner. */ } });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof MailboxError ? error.status : 503;
    return NextResponse.json({ ok: false }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
