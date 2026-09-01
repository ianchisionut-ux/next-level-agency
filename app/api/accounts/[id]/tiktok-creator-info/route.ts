import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ensureFreshToken } from "@/lib/token-refresh";
import { getTikTokCreatorInfo } from "@/lib/publishers/tiktok";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { id } = await params;
    const account = await prisma.connectedAccount.findFirst({
      where: { id, platform: "TIKTOK", isActive: true, workspace: { members: { some: { userId: user.userId } } } },
    });
    if (!account) return NextResponse.json({ error: "Cont TikTok indisponibil" }, { status: 404 });

    const accessToken = await ensureFreshToken(account);
    return NextResponse.json({ creator: await getTikTokCreatorInfo(accessToken) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Nu am putut citi opțiunile TikTok" },
      { status: 502 }
    );
  }
}
