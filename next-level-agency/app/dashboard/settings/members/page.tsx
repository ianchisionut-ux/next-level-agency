import { getActiveWorkspace } from "@/lib/session";
import { MembersPanel } from "@/app/components/settings/members-panel";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const workspace = await getActiveWorkspace();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Membri</h1>
        <p className="text-sm text-mist-500 mt-1">
          Gestionează cine are acces la {workspace!.name}.
        </p>
      </header>

      <MembersPanel workspaceId={workspace!.id} />
    </div>
  );
}
