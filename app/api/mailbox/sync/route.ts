import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { synchronizeMailbox } from "@/lib/mailbox/service";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = mailboxApi(async () => NextResponse.json(await synchronizeMailbox()));
