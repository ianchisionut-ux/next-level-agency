import { getActiveWorkspace } from "@/lib/session";
import { MembersPanel } from "@/app/components/settings/members-panel";
import { PageHeader } from "@/app/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const workspace = await getActiveWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader title="Membri" description={`Gestionează cine are acces la ${workspace!.name}.`} />

      <MembersPanel workspaceId={workspace!.id} />
    </div>
  );
}
