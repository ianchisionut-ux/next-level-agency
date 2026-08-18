import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ACTIVE_WORKSPACE_COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Trebuie să fii autentificat" }, { status: 401 });

    const { token } = await req.json();
    const invitation = await prisma.workspaceInvitation.findUnique({ where: { token } });

    if (!invitation) return NextResponse.json({ error: "Invitație inexistentă" }, { status: 404 });
    if (invitation.acceptedAt) return NextResponse.json({ error: "Invitația a fost deja folosită" }, { status: 409 });
    if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "Invitația a expirat" }, { status: 410 });
    if (invitation.email !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: `Această invitație e pentru ${invitation.email}. Autentifică-te cu acel email.` },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.workspaceMember.upsert({
        where: { userId_workspaceId: { userId: user.userId, workspaceId: invitation.workspaceId } },
        update: {},
        create: { userId: user.userId, workspaceId: invitation.workspaceId, role: invitation.role },
      }),
      prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    const res = NextResponse.json({ success: true, workspaceId: invitation.workspaceId });
    res.cookies.set(ACTIVE_WORKSPACE_COOKIE_NAME, invitation.workspaceId, { path: "/" });
    return res;
  } catch (err) {
    console.error("Eroare la acceptarea invitatiei:", err);
    return NextResponse.json({ error: "Nu am putut accepta invitația" }, { status: 500 });
  }
}
