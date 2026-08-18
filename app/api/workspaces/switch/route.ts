import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, ACTIVE_WORKSPACE_COOKIE_NAME } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { workspaceId } = await req.json();

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Nu ai acces la acest spațiu de lucru" }, { status: 403 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ACTIVE_WORKSPACE_COOKIE_NAME, workspaceId, { path: "/" });
    return res;
  } catch (err) {
    console.error("Eroare la schimbarea workspace-ului:", err);
    return NextResponse.json({ error: "Nu am putut schimba spațiul de lucru" }, { status: 500 });
  }
}
