import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { readJson } from "@/lib/mailbox/config";
import { mailboxThread, mailboxUpdate } from "@/lib/mailbox/service";
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
export const GET = mailboxApi(async (request: Request, { params }: Context) => NextResponse.json(await mailboxThread((await params).id, new URL(request.url).searchParams.get("after"))));
export const PATCH = mailboxApi(async (request: Request, { params }: Context) => NextResponse.json(await mailboxUpdate((await params).id, await readJson(request))));
