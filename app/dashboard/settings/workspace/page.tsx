import { redirect } from "next/navigation";
import { getCurrentUser, getUserWorkspaces } from "@/lib/session";
import { PageHeader } from "@/app/components/ui/page-header";
import { WorkspaceSettingsPanel } from "@/app/components/settings/workspace-settings-panel";

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspaces = await getUserWorkspaces(user.userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spații de lucru"
        description="Redenumește sau șterge spațiile de lucru la care ai acces."
      />

      <WorkspaceSettingsPanel
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, role: w.role }))}
      />
    </div>
  );
}
