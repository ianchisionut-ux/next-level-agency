import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/app/components/ui/page-header";
import { RegistryTable } from "@/app/components/registry/registry-table";
import { PaidStatusDonut, MonthlyTotalsBarChart, MonthlyTotal } from "@/app/components/registry/registry-charts";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "ian", "feb", "mar", "apr", "mai", "iun",
  "iul", "aug", "sep", "oct", "noi", "dec",
];

export default async function RegistryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Registrul e vizibil si editabil de orice user autentificat din Signal,
  // nu doar de super admin - e un registru de lucru comun pentru toata echipa.

  const entries = await prisma.registryEntry.findMany({ orderBy: { orderNumber: "desc" } });

  const totalPaid = entries.filter((e) => e.isPaid).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalUnpaid = entries.filter((e) => !e.isPaid).reduce((sum, e) => sum + Number(e.amount), 0);

  // Total pe luna (ultimele 6 luni cu activitate), pentru graficul de bare.
  const byMonth = new Map<string, number>();
  for (const e of entries) {
    const d = e.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(e.amount));
  }
  const monthlyTotals: MonthlyTotal[] = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, total]) => {
      const [, month] = key.split("-");
      return { month: MONTH_LABELS[Number(month) - 1], total };
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registru intern"
        description="Evidența proiectelor și plăților agenției — număr de ordine, denumire, sumă, status. Editabil de toată echipa."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <h2 className="font-display font-semibold text-base mb-4">Achitat vs. neachitat</h2>
          <PaidStatusDonut paid={totalPaid} unpaid={totalUnpaid} />
        </div>
        <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
          <h2 className="font-display font-semibold text-base mb-4">Sumă totală pe lună</h2>
          <MonthlyTotalsBarChart data={monthlyTotals} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-ink-700 bg-ink-800 px-4 py-3">
          <p className="text-xs text-mist-500">Total proiecte</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-mist-100">{entries.length}</p>
        </div>
        <div className="rounded-xl border border-state-success/30 bg-state-success/10 px-4 py-3">
          <p className="text-xs text-mist-500">Total achitat</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-state-success">
            {totalPaid.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei
          </p>
        </div>
        <div className="rounded-xl border border-state-warning/30 bg-state-warning/10 px-4 py-3">
          <p className="text-xs text-mist-500">Total neachitat</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-state-warning">
            {totalUnpaid.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei
          </p>
        </div>
      </div>

      <RegistryTable
        initialEntries={entries.map((e) => ({
          id: e.id,
          orderNumber: e.orderNumber,
          projectName: e.projectName,
          amount: e.amount.toString(),
          isPaid: e.isPaid,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
