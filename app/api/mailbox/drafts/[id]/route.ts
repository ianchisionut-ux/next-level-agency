import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { readJson } from "@/lib/mailbox/config";
import { deleteDraft, getDraft, saveDraft } from "@/lib/mailbox/drafts";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = mailboxApi(async (_request: Request, { params }: Context) => NextResponse.json(await getDraft((await params).id)));
export const PATCH = mailboxApi(async (request: Request, { params }: Context) => NextResponse.json(await saveDraft(await readJson(request), (await params).id)));
export const DELETE = mailboxApi(async (_request: Request, { params }: Context) => NextResponse.json(await deleteDraft((await params).id)));
