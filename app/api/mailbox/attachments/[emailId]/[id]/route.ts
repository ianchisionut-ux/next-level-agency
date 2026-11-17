import { mailboxApi } from "@/lib/mailbox/access";
import { providerId } from "@/lib/mailbox/config";
import { mailboxAttachment } from "@/lib/mailbox/service";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = mailboxApi(async (request: Request, { params }: { params: Promise<{ emailId: string; id: string }> }) => {
  const { emailId, id } = await params;
  const query = new URL(request.url).searchParams;
  const threadId = providerId(query.get("threadId"), "Conversația");
  return mailboxAttachment(threadId, emailId, id, query.get("inline") === "1");
});
