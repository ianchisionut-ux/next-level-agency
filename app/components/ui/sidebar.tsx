"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceSwitcher, WorkspaceOption } from "@/app/components/ui/workspace-switcher";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Timeline", icon: TimelineIcon },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/dashboard/compose", label: "Postare nouă", icon: ComposeIcon },
  { href: "/dashboard/campaigns", label: "Campanii", icon: CampaignIcon },
  { href: "/dashboard/analytics", label: "Analiză", icon: ChartIcon },
  { href: "/dashboard/accounts", label: "Conturi conectate", icon: LinkIcon },
  { href: "/dashboard/settings/members", label: "Membri", icon: UsersIcon },
];

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  userName,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <span className="h-2.5 w-2.5 rounded-full bg-signal shadow-glow" />
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
              <span className="h-2.5 w-2.5 rounded-full bg-signal shadow-glow" />
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

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-signal-soft text-signal-bright font-medium"
                  : "text-nav-text-muted hover:bg-nav-bg-hover hover:text-nav-text"
              }`}
            >
              <Icon active={active} />
              {item.label}
            </Link>
          );
        })}
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
