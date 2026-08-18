import { NextRequest, NextResponse } from "next/server";
import { collectInsights, collectSentiment, collectKeywordSnapshots, collectAudienceDemographics } from "@/lib/insights-collector";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const insightsResult = await collectInsights();
    const sentimentResult = await collectSentiment();

    const workspaces = await prisma.workspace.findMany();
    const keywordResults = [];
    const demographicsResults = [];
    for (const ws of workspaces) {
      keywordResults.push({ workspaceId: ws.id, ...(await collectKeywordSnapshots(ws.id)) });
      demographicsResults.push({ workspaceId: ws.id, ...(await collectAudienceDemographics(ws.id)) });
    }

    return NextResponse.json({
      success: true,
      insights: insightsResult,
      sentiment: sentimentResult,
      keywords: keywordResults,
      demographics: demographicsResults,
    });
  } catch (err) {
    console.error("Eroare in cron insights:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" },
      { status: 500 }
    );
  }
}
