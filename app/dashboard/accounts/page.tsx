import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { AccountsList } from "@/app/components/accounts/accounts-list";
import { PageHeader } from "@/app/components/ui/page-header";
import { PlatformKey } from "@/lib/platform-meta";
import { decrypt } from "@/lib/crypto";
import { getFacebookPageOverview, getInstagramAccountOverview } from "@/lib/publishers/meta";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const workspace = await getActiveWorkspace();
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId: workspace!.id, isActive: true },
    orderBy: { connectedAt: "desc" },
  });

  // Statistici generale de pagina (nume, urmaritori, poza) - live, direct din
  // Graph API, nu se stocheaza in baza de date. Fiecare cerere e izolata -
  // daca una pica (ex. token expirat), restul conturilor tot afiseaza normal.
  const overviewByAccountId = new Map<
    string,
    { followers: number | null; pictureUrl: string | null; extra?: string }
  >();

  await Promise.all(
    accounts.map(async (a) => {
      try {
        if (a.platform === "FACEBOOK") {
          const overview = await getFacebookPageOverview(a.externalId, decrypt(a.accessToken));
          if (overview) {
            overviewByAccountId.set(a.id, {
              followers: overview.followersCount ?? overview.fanCount,
              pictureUrl: overview.pictureUrl,
            });
          }
        } else if (a.platform === "INSTAGRAM") {
          const overview = await getInstagramAccountOverview(a.externalId, decrypt(a.accessToken));
          if (overview) {
            overviewByAccountId.set(a.id, {
              followers: overview.followersCount,
              pictureUrl: overview.pictureUrl,
              extra: overview.mediaCount != null ? `${overview.mediaCount} postări` : undefined,
            });
          }
        }
      } catch {
        // token expirat / permisiune lipsa / etc - lasam pur si simplu fara
        // statistici pentru acest cont, restul paginii functioneaza normal.
      }
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conturi conectate"
        description="Conectează-ți paginile și conturile de business ca să poți publica din Signal."
      />

      {connected && (
        <div className="rounded-xl border border-state-success/30 bg-state-success/10 px-4 py-3 text-sm text-state-success">
          {connected} cont(uri) conectat(e) cu succes.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-3 text-sm text-state-error">
          {error}
        </div>
      )}

      <AccountsList
        workspaceId={workspace!.id}
        accounts={accounts.map((a) => ({
          id: a.id,
          platform: a.platform as PlatformKey,
          accountName: a.accountName,
          connectedAt: a.connectedAt.toISOString(),
          tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
          overview: overviewByAccountId.get(a.id) ?? null,
        }))}
      />
    </div>
  );
}
