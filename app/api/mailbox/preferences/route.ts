import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { readJson } from "@/lib/mailbox/config";
import { preferences } from "@/lib/mailbox/drafts";
export const runtime = "nodejs";
export const GET = mailboxApi(async () => NextResponse.json(await preferences()));
export const PATCH = mailboxApi(async (request: Request) => NextResponse.json(await preferences(await readJson(request))));
