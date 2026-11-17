import { NextResponse } from "next/server";
import { mailboxConfig } from "@/lib/mailbox/config";
import { synchronizeMailbox } from "@/lib/mailbox/service";
import { processMailboxArchiveJobs } from "@/lib/mailbox/archive";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  if (!mailboxConfig().apiKey) return NextResponse.json({ skipped: true, reason: "NOT_CONFIGURED" });
  try {
    // Incoming webhooks enqueue immediately. This daily recovery run also
    // collects unopened conversations and retries interrupted archive jobs.
    const sync = await synchronizeMailbox();
    const archive = await processMailboxArchiveJobs(100, 45_000);
    return NextResponse.json({ sync, archive, ok: !sync.partial && archive.pending === 0 && archive.deferred === 0 });
  } catch {
    return NextResponse.json({ ok: false, error: "Arhivarea e-mailurilor necesită verificare." }, { status: 503 });
  }
}
