import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { processScheduledVariants } from "@/lib/publish-orchestrator";

// Publicarea imediata ("Publică acum") face apeluri reale catre Meta/TikTok/Google
// in cadrul acestei cereri - le dam timp suficient sa raspunda.
export const maxDuration = 60;

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
  campaignId?: string;
  title?: string;
  useSameContent: boolean;
  scheduledAt?: string;
  variants: Array<{
    accountId: string;
    platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "GOOGLE_BUSINESS";
    content: string;
    mediaUrls: string[];
    hashtags?: string[];
    contentTags?: string[];
    scheduledAt?: string;
    postAsReel?: boolean;
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

    // daca e specificata o campanie, verificam ca apartine aceluiasi workspace
    if (body.campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: body.campaignId } });
      if (!campaign || campaign.workspaceId !== body.workspaceId) {
        return NextResponse.json({ error: "Campania specificată nu este validă" }, { status: 400 });
      }
    }

    const post = await prisma.post.create({
      data: {
        workspaceId: body.workspaceId,
        campaignId: body.campaignId ?? null,
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
            contentTags: v.contentTags ?? [],
            scheduledAt: v.scheduledAt ? new Date(v.scheduledAt) : null,
            postAsReel: v.postAsReel ?? true,
          })),
        },
      },
      include: { variants: true },
    });

    // Daca postarea e programata pentru acum sau in trecut ("Publică acum"),
    // o publicam imediat, in cadrul acestei cereri - nu asteptam cronul.
    // Cronul (/api/cron/publish) ramane doar plasa de siguranta pentru
    // postarile programate cu adevarat pentru mai tarziu.
    const isDueNow = post.scheduledAt && post.scheduledAt <= new Date();
    if (isDueNow) {
      try {
        await processScheduledVariants();
      } catch (err) {
        console.error("Eroare la publicarea imediata:", err);
        // Nu blocam raspunsul - postarea ramane SCHEDULED, cronul o va relua.
      }
    }

    const finalPost = await prisma.post.findUnique({
      where: { id: post.id },
      include: { variants: { include: { account: true } } },
    });

    return NextResponse.json({ post: finalPost }, { status: 201 });
  } catch (err) {
    console.error("Eroare la crearea postarii:", err);
    return NextResponse.json({ error: "Nu am putut crea postarea" }, { status: 500 });
  }
}
