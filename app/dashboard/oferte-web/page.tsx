import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/app/components/ui/page-header";
import { BriefStatusBadge } from "@/app/components/website-briefs/brief-status-badge";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function OferteWebPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const briefs = await prisma.websiteBrief.findMany({
    orderBy: { createdAt: "desc" },
  });

  const newCount = briefs.filter((b) => b.status === "NEW").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oferte Web"
        description="Chestionarele de audit trimise din formularul public de pe nextlevel-agency.ro."
      />

      {briefs.length === 0 ? (
        <div className="glass-card rounded-2xl border border-ink-700 bg-ink-800 p-10 text-center">
          <p className="text-sm text-mist-500">
            Nu a fost trimis niciun chestionar încă. Când cineva completează formularul de pe
            site, apare aici automat.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl border border-ink-700 bg-ink-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-xs uppercase tracking-wide text-mist-500">
                <th className="px-5 py-3.5 font-semibold">Firmă</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Buget</th>
                <th className="px-5 py-3.5 font-semibold">Primit</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => (
                <tr key={b.id} className="border-b border-ink-700 last:border-0 hover:bg-ink-700/40">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/oferte-web/${b.id}`} className="font-semibold text-mist-100 hover:text-signal-bright">
                      {b.companyName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-mist-500">
                    <div>{b.contactName}</div>
                    <div className="text-xs">{b.contactPhone || b.contactEmail}</div>
                  </td>
                  <td className="px-5 py-4 text-mist-500">{b.budget || "—"}</td>
                  <td className="px-5 py-4 text-mist-500">{formatDate(b.createdAt)}</td>
                  <td className="px-5 py-4">
                    <BriefStatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newCount > 0 && (
        <p className="text-xs text-mist-500">
          {newCount} {newCount === 1 ? "ofertă nouă" : "oferte noi"} necitite.
        </p>
      )}
    </div>
  );
}
