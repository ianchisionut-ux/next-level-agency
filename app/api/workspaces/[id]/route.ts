import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireOwner(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!membership) return { error: NextResponse.json({ error: "Nu ai acces la acest spațiu" }, { status: 403 }) };
  if (membership.role !== "OWNER") {
    return { error: NextResponse.json({ error: "Doar proprietarul poate modifica spațiul" }, { status: 403 }) };
  }
  return { membership };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

  const { id } = await params;
  const check = await requireOwner(user.userId, id);
  if (check.error) return check.error;

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Numele spațiului de lucru este obligatoriu" }, { status: 400 });
  }

  const workspace = await prisma.workspace.update({
    where: { id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ workspace });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

  const { id: workspaceId } = await params;
  const check = await requireOwner(user.userId, workspaceId);
  if (check.error) return check.error;

  // Nu lasam userul fara niciun spatiu de lucru - ar ramane blocat afara din dashboard.
  const remainingWorkspaces = await prisma.workspaceMember.count({
    where: { userId: user.userId, workspaceId: { not: workspaceId } },
  });
  if (remainingWorkspaces === 0) {
    return NextResponse.json(
      { error: "Nu poți șterge singurul spațiu de lucru la care ai acces. Creează altul înainte." },
      { status: 400 }
    );
  }

  // Stergere in cascada, in ordinea corecta a dependentelor (nu toate relatiile
  // au onDelete: Cascade definit la nivel de schema, deci curatam manual, intr-o
  // singura tranzactie, ca sa nu ramana date orfane sau erori de foreign key).
  await prisma.$transaction([
    prisma.postSentiment.deleteMany({ where: { variant: { post: { workspaceId } } } }),
    prisma.platformInsight.deleteMany({
      where: { OR: [{ variant: { post: { workspaceId } } }, { account: { workspaceId } }] },
    }),
    prisma.audienceDemographic.deleteMany({ where: { account: { workspaceId } } }),
    prisma.postVariant.deleteMany({ where: { post: { workspaceId } } }),
    prisma.post.deleteMany({ where: { workspaceId } }),
    prisma.campaign.deleteMany({ where: { workspaceId } }),
    prisma.connectedAccount.deleteMany({ where: { workspaceId } }),
    prisma.keywordSnapshot.deleteMany({ where: { workspaceId } }),
    prisma.workspaceInvitation.deleteMany({ where: { workspaceId } }),
    prisma.workspaceMember.deleteMany({ where: { workspaceId } }),
    prisma.workspace.delete({ where: { id: workspaceId } }),
  ]);

  return NextResponse.json({ success: true });
}
