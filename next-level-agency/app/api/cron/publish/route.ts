import { NextRequest, NextResponse } from "next/server";
import { processScheduledVariants } from "@/lib/publish-orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron trimite automat header-ul Authorization cu CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await processScheduledVariants();
    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error("Eroare in cron publish:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" },
      { status: 500 }
    );
  }
}
