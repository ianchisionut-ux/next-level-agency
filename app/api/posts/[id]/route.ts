import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertAccess(userId: string, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { variants: { include: { account: true } } },
  });
  if (!post) return { post: null, error: NextResponse.json({ error: "Postare inexistentă" }, { status: 404 }) };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: post.workspaceId } },
  });
  if (!member) {
    return { post: null, error: NextResponse.json({ error: "Nu ai acces la această postare" }, { status: 403 }) };
  }
  return { post, error: null, role: member.role };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { post, error } = await assertAccess(user.userId, id);
    if (error) return error;

    return NextResponse.json({ post });
  } catch (err) {
    console.error("Eroare la incarcarea postarii:", err);
    return NextResponse.json({ error: "Nu am putut încărca postarea" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { post, error } = await assertAccess(user.userId, id);
    if (error) return error;

    if (post!.status === "PUBLISHED" || post!.status === "PUBLISHING") {
      return NextResponse.json(
        { error: "Nu poți șterge o postare deja publicată sau în curs de publicare" },
        { status: 409 }
      );
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Eroare la stergerea postarii:", err);
    return NextResponse.json({ error: "Nu am putut șterge postarea" }, { status: 500 });
  }
}

interface UpdatePostBody {
  scheduledAt?: string | null;
  variants?: Array<{ id: string; content: string; mediaUrls: string[]; scheduledAt?: string | null; publishFormat?: "POST" | "STORY" | "REEL" }>;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { post, error } = await assertAccess(user.userId, id);
    if (error) return error;

    if (post!.status === "PUBLISHED" || post!.status === "PUBLISHING") {
      return NextResponse.json(
        { error: "Nu poți edita o postare deja publicată sau în curs de publicare" },
        { status: 409 }
      );
    }

    const body: UpdatePostBody = await req.json();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (body.scheduledAt !== undefined) {
        await tx.post.update({
          where: { id },
          data: {
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
            status: body.scheduledAt ? "SCHEDULED" : "DRAFT",
          },
        });
      }

      for (const v of body.variants ?? []) {
        await tx.postVariant.update({
          where: { id: v.id },
          data: {
            content: v.content,
            mediaUrls: v.mediaUrls,
            scheduledAt: v.scheduledAt ? new Date(v.scheduledAt) : null,
            ...(v.publishFormat !== undefined ? { publishFormat: v.publishFormat } : {}),
            status: "PENDING", // resetam orice eroare anterioara odata ce s-a editat
            errorLog: null,
          },
        });
      }
    });

    const updated = await prisma.post.findUnique({
      where: { id },
      include: { variants: { include: { account: true } } },
    });
    return NextResponse.json({ post: updated });
  } catch (err) {
    console.error("Eroare la editarea postarii:", err);
    return NextResponse.json({ error: "Nu am putut edita postarea" }, { status: 500 });
  }
}
