"use client";

import { useRef, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

export default function PublicMobileMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details ref={menu} className="public-mobile-menu" onKeyDown={event => {
    if (event.key === "Escape" && menu.current?.open) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
  }} onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && menu.current) menu.current.open = false; }}>
    <summary aria-label="Meniul principal"><Menu className="public-menu-open" size={21} aria-hidden="true" /><X className="public-menu-close" size={21} aria-hidden="true" /><span>Meniu</span></summary>
    <nav aria-label="Navigare mobilă" onClick={event => { if (event.target instanceof Element && event.target.closest("a") && menu.current) menu.current.open = false; }}>{children}</nav>
  </details>;
}
