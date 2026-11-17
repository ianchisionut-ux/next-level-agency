import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { readJson } from "@/lib/mailbox/config";
import { listDrafts, saveDraft } from "@/lib/mailbox/drafts";
export const runtime = "nodejs";
export const GET = mailboxApi(async () => NextResponse.json(await listDrafts()));
export const POST = mailboxApi(async (request: Request) => NextResponse.json(await saveDraft(await readJson(request))));
