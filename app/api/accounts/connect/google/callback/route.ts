import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, listBusinessAccounts, listBusinessLocations } from "@/lib/oauth/google";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthError = searchParams.get("error");

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

    const tokens = await exchangeGoogleCode(code);
    if (!tokens.refresh_token) {
      redirectBase.searchParams.set(
        "error",
        "Google nu a returnat refresh token. Deconectează accesul aplicației din contul Google și încearcă din nou."
      );
      return NextResponse.redirect(redirectBase);
    }
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const accounts = await listBusinessAccounts(tokens.access_token);
    if (accounts.length === 0) {
      redirectBase.searchParams.set("error", "Nu ai niciun cont Google Business Profile");
      return NextResponse.redirect(redirectBase);
    }

    let connectedCount = 0;

    for (const account of accounts) {
      const locations = await listBusinessLocations(account.name, tokens.access_token);

      for (const location of locations) {
        await prisma.connectedAccount.upsert({
          where: {
            workspaceId_platform_externalId: {
              workspaceId,
              platform: "GOOGLE_BUSINESS",
              externalId: location.name,
            },
          },
          update: {
            accountName: location.title,
            accessToken: encrypt(tokens.access_token),
            refreshToken: encrypt(tokens.refresh_token),
            tokenExpiresAt: expiresAt,
            isActive: true,
          },
          create: {
            workspaceId,
            platform: "GOOGLE_BUSINESS",
            externalId: location.name,
            accountName: location.title,
            accessToken: encrypt(tokens.access_token),
            refreshToken: encrypt(tokens.refresh_token),
            tokenExpiresAt: expiresAt,
          },
        });
        connectedCount++;
      }
    }

    if (connectedCount === 0) {
      redirectBase.searchParams.set("error", "Contul Google Business nu are nicio locație vizibilă");
      return NextResponse.redirect(redirectBase);
    }

    redirectBase.searchParams.set("connected", String(connectedCount));
    return NextResponse.redirect(redirectBase);
  } catch (err) {
    redirectBase.searchParams.set(
      "error",
      err instanceof Error ? err.message : "Eroare necunoscuta la conectare"
    );
    return NextResponse.redirect(redirectBase);
  }
}
