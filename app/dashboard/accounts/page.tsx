import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { AccountsList } from "@/app/components/accounts/accounts-list";
import { PlatformKey } from "@/lib/platform-meta";

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Conturi conectate</h1>
        <p className="text-sm text-mist-500 mt-1">
          Conectează-ți paginile și conturile de business ca să poți publica din Signal.
        </p>
      </header>

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
        }))}
      />
    </div>
  );
}
