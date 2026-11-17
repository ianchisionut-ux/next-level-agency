import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { readJson } from "@/lib/mailbox/config";
import { sendDraft } from "@/lib/mailbox/drafts";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = mailboxApi(async (request: Request, { params }: { params: Promise<{ id: string }> }) => NextResponse.json(await sendDraft((await params).id, await readJson(request))));
