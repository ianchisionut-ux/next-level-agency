import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import Mailbox from "@/components/mailbox/Mailbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "E-mail | Next Level", robots: { index: false, follow: false } };

export default async function EmailPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(user.userId))) redirect("/dashboard");
  const { folder } = await searchParams;
  return <Mailbox initialFolder={folder === "sent" ? "sent" : "inbox"} />;
}
