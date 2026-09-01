import { NextRequest, NextResponse } from "next/server";
import { exchangeTikTokCode, getTikTokUserInfo } from "@/lib/oauth/tiktok";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  const redirectBase = new URL("/dashboard/accounts", req.url);

  if (oauthError) {
    redirectBase.searchParams.set("error", oauthError);
    return NextResponse.redirect(redirectBase);
  }
  if (!code || !stateRaw) {
    redirectBase.searchParams.set("error", "Lipsesc parametrii OAuth");
    return NextResponse.redirect(redirectBase);
  }

  try {
    const { workspaceId } = JSON.parse(Buffer.from(stateRaw, "base64url").toString());

    const tokens = await exchangeTikTokCode(code);
    const user = await getTikTokUserInfo(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.connectedAccount.upsert({
      where: {
        workspaceId_platform_externalId: {
          workspaceId,
          platform: "TIKTOK",
          externalId: user.open_id,
        },
      },
      update: {
        accountName: user.display_name,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: expiresAt,
        isActive: true,
      },
      create: {
        workspaceId,
        platform: "TIKTOK",
        externalId: user.open_id,
        accountName: user.display_name,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: expiresAt,
      },
    });

    redirectBase.searchParams.set("connected", "1");
    return NextResponse.redirect(redirectBase);
  } catch (err) {
    console.error("TikTok OAuth callback failed", err);
    redirectBase.searchParams.set(
      "error",
      err instanceof Error
        ? err.message
        : "Eroare necunoscuta la conectare. Verifica daca aplicatia TikTok e aprobata pentru Content Posting API."
    );
    return NextResponse.redirect(redirectBase);
  }
}
