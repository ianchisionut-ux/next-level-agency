import { NextRequest, NextResponse } from "next/server";
import { exchangeMetaCode, getLongLivedToken, getManagedPages, getInstagramUsername } from "@/lib/oauth/meta";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

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

    // 1. schimba code -> short-lived token -> long-lived token
    const shortLived = await exchangeMetaCode(code);
    const longLived = await getLongLivedToken(shortLived.access_token);
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);

    // 2. preia paginile de Facebook gestionate (fiecare are propriul access_token, care mosteneste durata)
    const pages = await getManagedPages(longLived.access_token);

    if (pages.length === 0) {
      redirectBase.searchParams.set("error", "Nu ai nicio pagina de Facebook administrata");
      return NextResponse.redirect(redirectBase);
    }

    let connectedCount = 0;

    for (const page of pages) {
      // Salveaza pagina de Facebook
      await prisma.connectedAccount.upsert({
        where: {
          workspaceId_platform_externalId: {
            workspaceId,
            platform: "FACEBOOK",
            externalId: page.id,
          },
        },
        update: {
          accountName: page.name,
          accessToken: encrypt(page.access_token),
          tokenExpiresAt: expiresAt,
          isActive: true,
        },
        create: {
          workspaceId,
          platform: "FACEBOOK",
          externalId: page.id,
          accountName: page.name,
          accessToken: encrypt(page.access_token),
          tokenExpiresAt: expiresAt,
        },
      });
      connectedCount++;

      // Daca pagina are un cont de Instagram Business conectat, il salvam si pe acela
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        const username = await getInstagramUsername(igId, page.access_token);

        await prisma.connectedAccount.upsert({
          where: {
            workspaceId_platform_externalId: {
              workspaceId,
              platform: "INSTAGRAM",
              externalId: igId,
            },
          },
          update: {
            accountName: `@${username}`,
            accessToken: encrypt(page.access_token), // IG publishing foloseste token-ul paginii FB
            tokenExpiresAt: expiresAt,
            isActive: true,
          },
          create: {
            workspaceId,
            platform: "INSTAGRAM",
            externalId: igId,
            accountName: `@${username}`,
            accessToken: encrypt(page.access_token),
            tokenExpiresAt: expiresAt,
          },
        });
        connectedCount++;
      }
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
