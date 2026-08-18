import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserWorkspaces, ACTIVE_WORKSPACE_COOKIE_NAME } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const workspaces = await getUserWorkspaces(user.userId);
    return NextResponse.json({ workspaces });
  } catch (err) {
    console.error("Eroare la listarea workspace-urilor:", err);
    return NextResponse.json({ error: "Nu am putut încărca spațiile de lucru" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Numele spațiului de lucru este obligatoriu" }, { status: 400 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        members: { create: { userId: user.userId, role: "OWNER" } },
      },
    });

    const res = NextResponse.json({ workspace }, { status: 201 });
    res.cookies.set(ACTIVE_WORKSPACE_COOKIE_NAME, workspace.id, { path: "/" });
    return res;
  } catch (err) {
    console.error("Eroare la crearea workspace-ului:", err);
    return NextResponse.json({ error: "Nu am putut crea spațiul de lucru" }, { status: 500 });
  }
}
