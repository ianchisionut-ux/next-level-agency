import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getManagedPages, getInstagramUsername, inspectMetaToken } from "@/lib/oauth/meta";
import { encrypt } from "@/lib/crypto";
import { collectAudienceDemographics, collectInsights, collectPageInsights } from "@/lib/insights-collector";

export const maxDuration = 60;

/**
 * Sincronizeaza toate paginile de Facebook (si conturile Instagram Business
 * legate) la care System User-ul din Business Portfolio are acces - inclusiv
 * paginile clientilor, partajate prin Business Portfolio (Partner Access).
 *
 * Nu deschide niciun dialog OAuth - foloseste direct META_SYSTEM_USER_TOKEN,
 * un token long-lived (in mod normal nu expira), generat o singura data din
 * Meta Business Settings > System Users.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { workspaceId } = await req.json();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId este obligatoriu" }, { status: 400 });

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    const systemToken = process.env.META_SYSTEM_USER_TOKEN;
    if (!systemToken) {
      return NextResponse.json(
        { error: "META_SYSTEM_USER_TOKEN nu este configurat în variabilele de mediu." },
        { status: 500 }
      );
    }

    const tokenDiagnostic = await inspectMetaToken(systemToken);
    if (!tokenDiagnostic.isValid || !tokenDiagnostic.appIdMatches) {
      return NextResponse.json(
        { error: "META_SYSTEM_USER_TOKEN este invalid sau aparține altei aplicații Meta.", tokenDiagnostic },
        { status: 422 }
      );
    }

    const pages = await getManagedPages(systemToken);

    let connected = 0;
    const results: { name: string; platform: string }[] = [];

    for (const page of pages) {
      // Pagina de Facebook
      await prisma.connectedAccount.upsert({
        where: {
          workspaceId_platform_externalId: { workspaceId, platform: "FACEBOOK", externalId: page.id },
        },
        update: {
          accountName: page.name,
          accessToken: encrypt(page.access_token),
          isActive: true,
        },
        create: {
          workspaceId,
          platform: "FACEBOOK",
          externalId: page.id,
          accountName: page.name,
          accessToken: encrypt(page.access_token),
        },
      });
      connected++;
      results.push({ name: page.name, platform: "FACEBOOK" });

      // Contul de Instagram Business legat de pagina (daca exista)
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        let igUsername = page.name;
        try {
          igUsername = await getInstagramUsername(igId, page.access_token);
        } catch {
          // daca nu reusim sa luam username-ul, pastram numele paginii ca fallback
        }

        await prisma.connectedAccount.upsert({
          where: {
            workspaceId_platform_externalId: { workspaceId, platform: "INSTAGRAM", externalId: igId },
          },
          update: {
            accountName: `@${igUsername}`,
            accessToken: encrypt(page.access_token),
            isActive: true,
          },
          create: {
            workspaceId,
            platform: "INSTAGRAM",
            externalId: igId,
            accountName: `@${igUsername}`,
            accessToken: encrypt(page.access_token),
          },
        });
        connected++;
        results.push({ name: `@${igUsername}`, platform: "INSTAGRAM" });
      }
    }

    const [postInsights, pageInsights, demographics] = await Promise.all([
      collectInsights(workspaceId),
      collectPageInsights(workspaceId),
      collectAudienceDemographics(workspaceId),
    ]);

    return NextResponse.json({
      success: true,
      connected,
      results,
      tokenDiagnostic,
      analytics: { postInsights, pageInsights, demographics },
    });
  } catch (err) {
    console.error("Eroare la sincronizarea din Business Portfolio:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eroare necunoscută" },
      { status: 500 }
    );
  }
}
