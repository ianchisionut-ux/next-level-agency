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

    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId },
      include: { posts: { include: { variants: { include: { insights: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    const withStats = campaigns.map((c) => {
      let engagement = 0;
      let postsCount = c.posts.length;
      let publishedCount = 0;
      for (const post of c.posts) {
        if (post.status === "PUBLISHED") publishedCount++;
        for (const variant of post.variants) {
          for (const insight of variant.insights) {
            engagement += insight.likes + insight.comments + insight.shares + insight.saves;
          }
        }
      }
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        goal: c.goal,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt,
        postsCount,
        publishedCount,
        engagement,
        progressPct: c.goal ? Math.min(100, Math.round((engagement / c.goal) * 100)) : null,
      };
    });

    return NextResponse.json({ campaigns: withStats });
  } catch (err) {
    console.error("Eroare la incarcarea campaniilor:", err);
    return NextResponse.json({ error: "Nu am putut încărca campaniile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { workspaceId, name, description, goal, startDate, endDate } = await req.json();

    if (!workspaceId || !name?.trim()) {
      return NextResponse.json({ error: "workspaceId și numele sunt obligatorii" }, { status: 400 });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal ? Number(goal) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error("Eroare la crearea campaniei:", err);
    return NextResponse.json({ error: "Nu am putut crea campania" }, { status: 500 });
  }
}
