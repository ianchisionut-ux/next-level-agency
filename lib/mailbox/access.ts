import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import { MailboxError } from "./config";

export function mailboxApi<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Neautorizat.", code: "UNAUTHENTICATED" }, { status: 401 });
      if (!(await isSuperAdmin(user.userId))) return NextResponse.json({ error: "Acces interzis.", code: "FORBIDDEN" }, { status: 403 });
      const response = await handler(...args);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      const known = error instanceof MailboxError;
      const definiteNoSend = known && (error as MailboxError & { definiteNoSend?: boolean }).definiteNoSend === true;
      return NextResponse.json({ error: known ? error.message : "Operațiunea de e-mail nu a putut fi finalizată.", code: known ? error.code : "MAILBOX_UNAVAILABLE", retryable: known ? error.retryable : false, definiteNoSend }, { status: known ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
    }
  };
}
