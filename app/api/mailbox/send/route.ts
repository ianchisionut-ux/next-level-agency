import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { readJson } from "@/lib/mailbox/config";
import { sendMessage } from "@/lib/mailbox/send";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = mailboxApi(async (request: Request) => NextResponse.json(await sendMessage(await readJson(request))));
