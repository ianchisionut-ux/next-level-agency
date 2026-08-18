import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const account = await prisma.connectedAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Cont inexistent" }, { status: 404 });

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId: account.workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest cont" }, { status: 403 });

    await prisma.connectedAccount.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Eroare la deconectarea contului:", err);
    return NextResponse.json({ error: "Nu am putut deconecta contul" }, { status: 500 });
  }
}
