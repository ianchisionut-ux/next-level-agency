import { NextResponse } from "next/server";
import { mailboxApi } from "@/lib/mailbox/access";
import { mailboxThreads } from "@/lib/mailbox/service";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = mailboxApi(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  return NextResponse.json(await mailboxThreads(params.get("folder") || "inbox", params.get("after")));
});
