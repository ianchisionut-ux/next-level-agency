import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PostDetail } from "@/app/components/posts/post-detail";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const post = await prisma.post.findUnique({
    where: { id },
    include: { variants: { include: { account: true } } },
  });
  if (!post) notFound();

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.userId, workspaceId: post.workspaceId } },
  });
  if (!member) notFound();

  return (
    <PostDetail
      post={{
        id: post.id,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        variants: post.variants.map((v) => ({
          id: v.id,
          platform: v.platform as PlatformKey,
          content: v.content,
          mediaUrls: v.mediaUrls,
          status: v.status,
          errorLog: v.errorLog,
          scheduledAt: v.scheduledAt?.toISOString() ?? null,
          publishedAt: v.publishedAt?.toISOString() ?? null,
          accountName: v.account.accountName,
        })),
      }}
    />
  );
}
