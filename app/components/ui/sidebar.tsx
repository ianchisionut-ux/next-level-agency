"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceSwitcher, WorkspaceOption } from "@/app/components/ui/workspace-switcher";

const NAV_GROUPS = [
  { label: "Clienți & lucru", items: [
    { href: "/dashboard", label: "Timeline", icon: TimelineIcon },
    { href: "/dashboard/compose", label: "Postare nouă", icon: ComposeIcon },
    { href: "/dashboard/campaigns", label: "Campanii", icon: CampaignIcon },
    { href: "/dashboard/analytics", label: "Analiză", icon: ChartIcon },
    { href: "/dashboard/accounts", label: "Conturi conectate", icon: LinkIcon },
    { href: "/dashboard/oferte-web", label: "Oferte Web", icon: InboxIcon, superAdminOnly: true },
  ]},
  { label: "Intern", items: [
    { href: "/dashboard/calendar", label: "Calendar intern", icon: CalendarIcon },
    { href: "/dashboard/registru", label: "Registru intern", icon: RegistryIcon },
    { href: "/dashboard/registru-acte", label: "Registru acte", icon: RegistryIcon, superAdminOnly: true },
    { href: "/dashboard/contabilitate", label: "Facturare", icon: InvoiceIcon, superAdminOnly: true },
    { href: "/dashboard/settings/members", label: "Membri", icon: UsersIcon },
    { href: "/dashboard/settings/workspace", label: "Spații de lucru", icon: SettingsIcon },
  ]},
];

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  userName,
  isSuperAdmin,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  userName: string;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  }));

  // Inchide automat drawer-ul de mobil la orice navigare intre pagini.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Bara de sus, doar pe mobil/tableta - buton de meniu + wordmark */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-nav-border bg-nav-bg px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Deschide meniul"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-nav-text hover:bg-nav-bg-hover transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark-dark.png" alt="Next Level" className="h-9 w-9 object-contain" />
          <span className="font-display font-semibold text-base tracking-tight text-nav-text">Signal</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Fundal semi-transparent, doar cand drawer-ul de mobil e deschis */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-nav-border bg-nav-bg flex flex-col text-nav-text transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-mark-dark.png" alt="Next Level" className="h-9 w-9 object-contain" />
              <span className="font-display font-semibold text-lg tracking-tight text-nav-text">Signal</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Închide meniul"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-nav-text-muted hover:bg-nav-bg-hover transition-colors lg:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M6 18 18 6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} />
        </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {visibleNavGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-nav-text-muted/60">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-signal-soft text-signal-bright font-medium" : "text-nav-text-muted hover:bg-nav-bg-hover hover:text-nav-text"}`}><Icon active={active}/>{item.label}</Link>;
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-5 border-t border-nav-border space-y-3">
        <Link
          href="/dashboard/compose"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium py-2.5"
        >
          <PlusIcon /> Postare nouă
        </Link>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-nav-text-muted truncate">{userName}</span>
          <button onClick={handleLogout} className="text-xs text-nav-text-muted hover:text-nav-text transition-colors">
            Ieși din cont
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

function TimelineIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ComposeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  );
}
function LinkIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M9 12a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M15 12a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function CampaignIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M3 11v2a2 2 0 0 0 2 2h1l5 4V5L6 9H5a2 2 0 0 0-2 2ZM17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function InvoiceIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
    </svg>
  );
}
function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RegistryIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#7C9CFF" : "#8A8F9C"} strokeWidth="1.8">
      <path d="M9 3h6a2 2 0 0 1 2 2v14l-5-3-5 3V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}
