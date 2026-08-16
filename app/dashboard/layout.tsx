import { redirect } from "next/navigation";
import { Sidebar } from "@/app/components/ui/sidebar";
import { getCurrentUser, getActiveWorkspace, getUserWorkspaces } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workspaces, activeWorkspace] = await Promise.all([
    getUserWorkspaces(user.userId),
    getActiveWorkspace(),
  ]);

  if (!activeWorkspace) redirect("/login");

  return (
    <div className="min-h-screen bg-ink-900">
      <Sidebar
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, role: w.role }))}
        activeWorkspaceId={activeWorkspace.id}
        userName={user.name}
      />
      <div className="pl-60">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </div>
    </div>
  );
}
