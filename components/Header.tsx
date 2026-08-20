import Link from "next/link";
import { BrandMark, IconWhatsapp, IconFacebook, IconInstagram, IconTiktok } from "./Icons";
import { siteConfig } from "@/lib/data";

const navItems = [
  { href: "/servicii", label: "Servicii" },
  { href: "/portofoliu", label: "Portofoliu" },
  { href: "/despre-noi", label: "Despre noi" },
  { href: "/blog", label: "Blog" },
  { href: "/chestionar-audit", label: "Chestionar Audit" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark className="h-9 w-9" />
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-wide text-white">
              NEXT LEVEL
            </span>
            <span className="block text-[10px] font-medium tracking-[0.2em] text-white/50">
              ADVERTISING AGENCY
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              {item.label.toUpperCase()}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-semibold text-white/70 transition hover:text-white"
          >
            Login
          </Link>
          <div className="hidden items-center gap-4 lg:flex">
            <a
              href={siteConfig.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-white/50 transition hover:text-white"
            >
              <IconFacebook />
            </a>
            <a
              href={siteConfig.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/50 transition hover:text-white"
            >
              <IconInstagram />
            </a>
            {siteConfig.socials.tiktok ? (
              <a
                href={siteConfig.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-white/50 transition hover:text-white"
              >
                <IconTiktok />
              </a>
            ) : (
              <span
                aria-label="TikTok - în curând"
                title="În curând"
                className="cursor-default text-white/20"
              >
                <IconTiktok />
              </span>
            )}
          </div>
        </div>

        <a
          href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-2 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-glow sm:flex"
        >
          Programează o discuție
        </a>

        {/* Mobile: compact WhatsApp icon link */}
        <a
          href={`https://wa.me/${siteConfig.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue text-white sm:hidden"
          aria-label="Scrie-ne pe WhatsApp"
        >
          <IconWhatsapp className="h-5 w-5" />
        </a>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center justify-center gap-5 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap text-xs font-medium text-white/70 hover:text-white"
          >
            {item.label.toUpperCase()}
          </Link>
        ))}
        <Link
          href="/login"
          className="whitespace-nowrap text-xs font-semibold text-blue-bright hover:text-white"
        >
          LOGIN
        </Link>
      </nav>
    </header>
  );
}
