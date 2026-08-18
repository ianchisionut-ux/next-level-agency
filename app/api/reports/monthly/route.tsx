import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MonthlyReportDocument, ReportData } from "@/lib/reports/monthly-report-document";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export const maxDuration = 30;

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

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return NextResponse.json({ error: "Workspace inexistent" }, { status: 404 });

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const insights = await prisma.platformInsight.findMany({
      where: { account: { workspaceId }, fetchedAt: { gte: since } },
      include: { account: true },
    });

    const totalImpressions = insights.reduce((s, i) => s + i.impressions, 0);
    const totalEngagement = insights.reduce((s, i) => s + i.likes + i.comments + i.shares + i.saves, 0);
    const totalClicks = insights.reduce((s, i) => s + i.clicks, 0);
    const engagementRate = totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : "0";

    const byPlatform = new Map<string, number>();
    for (const i of insights) {
      const p = i.account.platform;
      byPlatform.set(p, (byPlatform.get(p) ?? 0) + i.likes + i.comments + i.shares + i.saves);
    }
    const platformBreakdown = Array.from(byPlatform.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([platform, engagement]) => ({
        platform: PLATFORM_META[platform as PlatformKey]?.label ?? platform,
        engagement,
      }));

    const byVariant = new Map<string, { impressions: number; engagement: number; platform: string }>();
    for (const i of insights) {
      const prev = byVariant.get(i.variantId) ?? { impressions: 0, engagement: 0, platform: i.account.platform };
      byVariant.set(i.variantId, {
        impressions: prev.impressions + i.impressions,
        engagement: prev.engagement + i.likes + i.comments + i.shares + i.saves,
        platform: prev.platform,
      });
    }
    const topVariantIds = Array.from(byVariant.entries())
      .sort((a, b) => b[1].engagement - a[1].engagement)
      .slice(0, 10)
      .map(([id]) => id);
    const topVariantsMeta =
      topVariantIds.length > 0
        ? await prisma.postVariant.findMany({ where: { id: { in: topVariantIds } }, include: { post: true } })
        : [];

    const topPosts = topVariantIds
      .map((id) => {
        const stats = byVariant.get(id)!;
        const variant = topVariantsMeta.find((v) => v.id === id);
        if (!variant) return null;
        return {
          title: variant.post.title || variant.content.slice(0, 50) || "(fără titlu)",
          platform: PLATFORM_META[stats.platform as PlatformKey]?.label ?? stats.platform,
          impressions: stats.impressions,
          engagementRate: stats.impressions > 0 ? ((stats.engagement / stats.impressions) * 100).toFixed(1) : "0",
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const reportData: ReportData = {
      clientName: workspace.name,
      periodLabel: `${since.toLocaleDateString("ro-RO")} – ${new Date().toLocaleDateString("ro-RO")}`,
      totalImpressions,
      totalEngagement,
      totalClicks,
      engagementRate,
      platformBreakdown,
      topPosts,
      generatedAt: new Date().toLocaleString("ro-RO"),
    };

    const pdfBuffer = await renderToBuffer(<MonthlyReportDocument data={reportData} />);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="raport-${workspace.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Eroare la generarea raportului PDF:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eroare la generarea raportului" },
      { status: 500 }
    );
  }
}
