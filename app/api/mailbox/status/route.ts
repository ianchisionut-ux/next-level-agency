import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { mailboxOverview } from "@/lib/mailbox/service";
export const runtime = "nodejs";
export const GET = mailboxApi(async () => NextResponse.json(await mailboxOverview()));
