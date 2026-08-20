import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/app/components/ui/page-header";
import { BriefActions } from "./BriefActions";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function Row({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-ink-700 py-3 last:border-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-mist-500">{label}</dt>
      <dd className="text-sm text-mist-100 sm:col-span-2">{display}</dd>
    </div>
  );
}

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 print:border-slate-300 print:shadow-none">
      <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-700/30 px-5 py-3.5 print:bg-slate-100 print:text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-xs font-bold text-white print:bg-slate-900">
          {num}
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-mist-100 print:text-slate-900">{title}</h2>
      </div>
      <dl className="px-5 py-2">{children}</dl>
    </section>
  );
}

export default async function OfertaWebDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const b = await prisma.websiteBrief.findUnique({ where: { id } });
  if (!b) notFound();

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={b.companyName}
          description={`Chestionar primit pe ${formatDate(b.createdAt)}`}
          actions={<BriefActions id={b.id} status={b.status} />}
        />
      </div>

      {/* Antet vizibil doar la print */}
      <div className="hidden print:block">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Chestionar &amp; Audit — Oferte Web</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{b.companyName}</h1>
        <p className="mt-1 text-sm text-slate-500">Primit pe {formatDate(b.createdAt)}</p>
      </div>

      <div className="print:hidden">
        <Link href="/dashboard/oferte-web" className="text-xs font-semibold text-mist-500 hover:text-signal-bright">
          ← Înapoi la Oferte Web
        </Link>
      </div>

      <div className="space-y-5 print:space-y-3">
        <Section num={1} title="Afacerea ta & brand">
          <Row label="Firmă" value={b.companyName} />
          <Row label="Obiect de activitate" value={b.activity} />
          <Row label="Identitate de brand" value={b.brandIdentity} />
          <Row label="Ce vrea vizitatorul să facă" value={b.ctaGoals} />
          <Row label="Campanie de marketing legată" value={b.linkedCampaign} />
        </Section>

        <Section num={2} title="Domeniu & Hosting">
          <Row label="Domeniu" value={b.hasDomain === "Da, îl am deja" ? `Da — ${b.domainName || "nespecificat"}` : b.hasDomain} />
          <Row label="Hosting" value={b.hasHosting === "Da, la o firmă existentă" ? `Da — ${b.hostingProvider || "nespecificat"}` : b.hasHosting} />
          <Row label="Adrese e-mail profesionale" value={b.needsEmail} />
          <Row label="SSL & monitorizare uptime" value={b.wantsSSL} />
        </Section>

        <Section num={3} title="Structură & conținut">
          <Row label="Pagini dorite" value={[...b.pages, ...(b.pagesOther ? [b.pagesOther] : [])]} />
          <Row label="Text / poze / logo" value={b.hasContent} />
          <Row label="Limbi" value={b.languages === "Română + altă limbă" ? `Română + ${b.otherLanguage || "?"}` : b.languages} />
          <Row label="Testimoniale" value={b.wantsTestimonials} />
        </Section>

        <Section num={4} title="Design & funcționalități">
          <Row label="Site-uri de referință" value={[b.likedSite1, b.likedSite2].filter(Boolean) as string[]} />
          <Row label="Stil vizual" value={b.visualStyle} />
          <Row label="Contact rapid" value={b.contactElements} />
          <Row label="Integrare social media pe site" value={b.wantsSocialIntegration} />
          <Row label="Mentenanță post-lansare" value={b.maintenance} />
        </Section>

        <Section num={5} title="Marketing & social media">
          <Row label="Conturi active" value={[...b.socialAccounts, ...(b.socialOther ? [b.socialOther] : [])]} />
          <Row label="Vor management social media" value={b.wantsSocialManagement} />
          <Row label="Buget lunar ads" value={b.adBudget} />
        </Section>

        <Section num={6} title="Termen, buget & contact">
          <Row label="Lansare dorită" value={b.launchDate} />
          <Row label="Buget orientativ" value={b.budget} />
          <Row label="Nume" value={b.contactName} />
          <Row label="Telefon" value={b.contactPhone} />
          <Row label="Email" value={b.contactEmail} />
        </Section>
      </div>
    </div>
  );
}
