import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId este obligatoriu" }, { status: 400 });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    const posts = await prisma.post.findMany({
      where: { workspaceId },
      include: { variants: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Eroare la incarcarea postarilor:", err);
    return NextResponse.json({ error: "Nu am putut încărca postările" }, { status: 500 });
  }
}

interface CreatePostBody {
  workspaceId: string;
  title?: string;
  useSameContent: boolean;
  scheduledAt?: string;
  variants: Array<{
    accountId: string;
    platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "GOOGLE_BUSINESS";
    content: string;
    mediaUrls: string[];
    hashtags?: string[];
    scheduledAt?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const body: CreatePostBody = await req.json();

    if (!body.workspaceId || !body.variants?.length) {
      return NextResponse.json(
        { error: "workspaceId si cel putin o varianta sunt obligatorii" },
        { status: 400 }
      );
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId: body.workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    // verifica ca toate conturile folosite apartin chiar acestui workspace
    const accountIds = body.variants.map((v) => v.accountId);
    const validAccounts = await prisma.connectedAccount.count({
      where: { id: { in: accountIds }, workspaceId: body.workspaceId },
    });
    if (validAccounts !== new Set(accountIds).size) {
      return NextResponse.json({ error: "Unul dintre conturi nu aparține acestui workspace" }, { status: 403 });
    }

    const post = await prisma.post.create({
      data: {
        workspaceId: body.workspaceId,
        title: body.title,
        useSameContent: body.useSameContent,
        status: body.scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        variants: {
          create: body.variants.map((v) => ({
            accountId: v.accountId,
            platform: v.platform,
            content: v.content,
            mediaUrls: v.mediaUrls,
            hashtags: v.hashtags ?? [],
            scheduledAt: v.scheduledAt ? new Date(v.scheduledAt) : null,
          })),
        },
      },
      include: { variants: true },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("Eroare la crearea postarii:", err);
    return NextResponse.json({ error: "Nu am putut crea postarea" }, { status: 500 });
  }
}
