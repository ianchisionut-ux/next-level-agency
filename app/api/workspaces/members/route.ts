import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId lipsește" }, { status: 400 });

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!membership) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    const [members, invitations] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { name: true, email: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.workspaceInvitation.findMany({
        where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      currentUserRole: membership.role,
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email ?? (m.user.username ? `@${m.user.username}` : "—"),
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    console.error("Eroare la incarcarea membrilor:", err);
    return NextResponse.json({ error: "Nu am putut încărca membrii" }, { status: 500 });
  }
}
