import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId este obligatoriu" }, { status: 400 });

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    // Luam ultimele 100 de variante cu media, ca sa extragem toate URL-urile
    // deja incarcate anterior in acest workspace - fara duplicate.
    const variants = await prisma.postVariant.findMany({
      where: { post: { workspaceId }, mediaUrls: { isEmpty: false } },
      select: { mediaUrls: true },
      orderBy: { id: "desc" },
      take: 100,
    });

    const seen = new Set<string>();
    const media: string[] = [];
    for (const v of variants) {
      for (const url of v.mediaUrls) {
        if (!seen.has(url)) {
          seen.add(url);
          media.push(url);
        }
      }
    }

    return NextResponse.json({ media: media.slice(0, 60) });
  } catch (err) {
    console.error("Eroare la incarcarea bibliotecii media:", err);
    return NextResponse.json({ error: "Nu am putut încărca biblioteca media" }, { status: 500 });
  }
}
