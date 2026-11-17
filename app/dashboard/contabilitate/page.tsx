import { getDashboardStats, listInvoices } from "@/lib/accounting/repo";
import { requireAccountingPage } from "@/lib/accounting/access";
import Link from "next/link";
import { StatusBadge } from "@/components/accounting/StatusBadge";
import { getAnafConnectionStatus } from "@/lib/accounting/efactura";
import { Plus, TriangleAlert } from "lucide-react";

// This page reads live data straight from Postgres on every request; it must
// never be statically prerendered at build time (which would freeze the
// numbers as of the build, e.g. on Vercel).
export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " RON";
}

function AnafCompactStatus({ status }: { status: string | null }) {
  const meta = status === "VALIDATED"
    ? { color: "#16a34a", label: "Validată ANAF" }
    : ["REJECTED", "ERROR", "UNCERTAIN"].includes(status || "")
      ? { color: "#dc2626", label: "Necesită atenție" }
      : ["UPLOADING", "PROCESSING"].includes(status || "")
        ? { color: "#eab308", label: "În procesare" }
        : { color: "#eab308", label: "Netrimisă" };
  return <span className="inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap"><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: meta.color }} />{meta.label}</span>;
}

export default async function DashboardPage() {
  const [stats, recent, anaf] = await Promise.all([
    getDashboardStats(),
    listInvoices(7),
    getAnafConnectionStatus(),
  ]);

  const cards = [
    { label: "Facturi emise", value: stats.totalInvoices.toString(), accent: "var(--cyan)" },
    { label: "Incasat total", value: fmt(stats.totalCollected), accent: "var(--emerald)" },
    { label: "Neincasat", value: fmt(stats.totalOutstanding), warn: stats.totalOutstanding > 0, accent: "var(--amber)" },
    { label: "Facturat luna asta", value: fmt(stats.monthRevenue), accent: "var(--purple)" },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Panou</div>
          <h1 className="page-title">Bine ai venit</h1>
          <p className="page-subtitle">Situatia curenta a facturarii tale.</p>
        </div>
        <Link href="/dashboard/contabilitate/invoices/new" className="btn-primary">
          <Plus size={15} /> Factura noua
        </Link>
      </div>

      {anaf.environment === "test" && <div className="ef-safety-warning mb-4"><TriangleAlert size={17}/><span><strong>ANAF Test este activ.</strong> Trimiterile nu au efect fiscal real. Activează Producție înainte de folosirea operațională.</span></div>}
      {(!anaf.configured || anaf.needsReconnect) && <Link href="/dashboard/contabilitate/efactura" className="ref-error ef-dashboard-alert"><TriangleAlert size={17}/><span><strong>ANAF necesită configurare sau reconectare.</strong> Transmiterile nu pot continua până la restabilirea accesului SPV.</span></Link>}
      {anaf.tokenStatus === "EXPIRED_REFRESHABLE" && <Link href="/dashboard/contabilitate/efactura" className="ef-safety-warning mb-4"><TriangleAlert size={17}/><span>Tokenul ANAF a expirat. Reînnoirea va fi încercată la următoarea operațiune; accesul SPV trebuie urmărit.</span></Link>}
      {(anaf.backlog.pending > 0 || anaf.backlog.archivePending > 0) && <Link href="/dashboard/contabilitate/efactura" className="ref-error ef-dashboard-alert"><TriangleAlert size={17}/><span><strong>{anaf.backlog.pending} facturi fără validare ANAF · {anaf.backlog.blocked} blocate · {anaf.backlog.overdue} cu termen estimat depășit.</strong> {anaf.backlog.archivePending} răspunsuri așteaptă arhivarea.{anaf.backlog.earliestDueDate ? ` Primul termen estimat de la emitere: ${anaf.backlog.earliestDueDate}.` : ""} Data operațiunii și limita legală de emitere nu sunt incluse în estimare. Deschide lista pentru intervenție.</span></Link>}

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card" style={{ "--accent": c.accent } as React.CSSProperties}>
            <div className="stat-label">{c.label}</div>
            <div className={`stat-value ${c.warn ? "warn" : ""}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="section-label">Facturi recente</div>
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Serie/Nr.</th>
              <th>Client</th>
              <th>Data</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th>e-Factura ANAF</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Nu ai emis inca nicio factura.
                </td>
              </tr>
            )}
            {recent.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link href={`/dashboard/contabilitate/invoices/${inv.id}`} className="doc-chip">
                    {inv.series} {String(inv.number).padStart(4, "0")}
                  </Link>
                </td>
                <td>{inv.clientName}</td>
                <td className="num">{new Date(inv.issueDate).toLocaleDateString("ro-RO")}</td>
                <td className="text-right num">{fmt(inv.total)}</td>
                <td>
                  <StatusBadge status={inv.status} />
                </td>
                <td><Link href={`/dashboard/contabilitate/invoices/${inv.id}#e-factura`}><AnafCompactStatus status={inv.eFacturaStatus} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
