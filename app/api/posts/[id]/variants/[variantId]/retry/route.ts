import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { id, variantId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

  const variant = await prisma.postVariant.findUnique({
    where: { id: variantId },
    include: { post: true },
  });
  if (!variant || variant.postId !== id) {
    return NextResponse.json({ error: "Varianta nu a fost găsită" }, { status: 404 });
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.userId, workspaceId: variant.post.workspaceId } },
  });
  if (!member) return NextResponse.json({ error: "Nu ai acces la această postare" }, { status: 403 });

  if (variant.status !== "FAILED") {
    return NextResponse.json({ error: "Doar variantele eșuate pot fi reîncercate" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.postVariant.update({
      where: { id: variantId },
      data: { status: "PENDING", retryCount: 0, errorLog: null, scheduledAt: new Date() },
    }),
    prisma.post.update({
      where: { id },
      data: { status: "SCHEDULED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
