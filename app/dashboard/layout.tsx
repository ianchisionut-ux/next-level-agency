import { redirect } from "next/navigation";
import { Sidebar } from "@/app/components/ui/sidebar";
import { getCurrentUser, getActiveWorkspace, getUserWorkspaces } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let workspaces, activeWorkspace;
  try {
    [workspaces, activeWorkspace] = await Promise.all([
      getUserWorkspaces(user.userId),
      getActiveWorkspace(),
    ]);
  } catch (err) {
    // Cel mai probabil: schema.prisma are un camp/tabel nou care nu exista
    // inca in baza de date reala (nu s-a rulat "npx prisma db push").
    console.error("Eroare la incarcarea workspace-ului in dashboard layout:", err);
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center px-6 text-mist-100">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold mb-2">
            Baza de date nu e sincronizată cu ultima versiune a codului
          </h1>
          <p className="text-sm text-mist-500">
            Rulează <code className="rounded bg-ink-800 px-1.5 py-0.5">npx prisma db push</code> local
            (cu <code className="rounded bg-ink-800 px-1.5 py-0.5">DATABASE_URL</code> real în{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5">.env</code>), sau adaugă manual coloana/tabelul
            lipsă direct din Neon SQL Editor, apoi reîncarcă pagina.
          </p>
        </div>
      </div>
    );
  }

  if (!activeWorkspace) redirect("/login");

  return (
    <div className="min-h-screen bg-ink-900 relative overflow-hidden">
      {/* Pete decorative, blurate, in fundal - dau adancime reala efectului
          de sticla al cardurilor (fara ele, blur-ul n-ar avea ce sa reflecte). */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-signal/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full bg-state-success/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[320px] rounded-full bg-signal/10 blur-[110px]" />
      </div>

      <Sidebar
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, role: w.role }))}
        activeWorkspaceId={activeWorkspace.id}
        userName={user.name}
      />
      <div className="ml-60">
        <div className="max-w-6xl mx-auto px-8 py-8 text-mist-100">{children}</div>
      </div>
    </div>
  );
}
