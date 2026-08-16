import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { Composer } from "@/app/components/composer/composer";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const workspace = await getActiveWorkspace();
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId: workspace!.id, isActive: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Postare nouă</h1>
        <p className="text-sm text-mist-500 mt-1">
          Scrie o dată, publică peste tot — sau ajustează per platformă.
        </p>
      </header>

      <Composer
        workspaceId={workspace!.id}
        accounts={accounts.map((a) => ({
          id: a.id,
          platform: a.platform as PlatformKey,
          accountName: a.accountName,
        }))}
      />
    </div>
  );
}
