import Link from "next/link";
import { Logo } from "./Icons";
import { siteConfig } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="text-sm font-extrabold tracking-wide">NEXT LEVEL</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Agenție de advertising ce creează branduri puternice și generează
              rezultate reale prin marketing digital, design și automatizări.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Servicii</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li><Link href="/servicii" className="hover:text-white">Branding &amp; Identity</Link></li>
              <li><Link href="/servicii" className="hover:text-white">Performance Marketing</Link></li>
              <li><Link href="/servicii" className="hover:text-white">Web Design &amp; Development</Link></li>
              <li><Link href="/servicii" className="hover:text-white">AI &amp; Automation</Link></li>
              <li><Link href="/servicii" className="hover:text-white">SEO &amp; Content Marketing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Companie</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li><Link href="/despre-noi" className="hover:text-white">Despre noi</Link></li>
              <li><Link href="/portofoliu" className="hover:text-white">Portofoliu</Link></li>
              <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Contact</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li>{siteConfig.address}</li>
              <li>
                <a href={`mailto:${siteConfig.email}`} className="hover:text-white">{siteConfig.email}</a>
              </li>
              <li>
                <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="hover:text-white">{siteConfig.phone}</a>
              </li>
            </ul>
            <Link
              href="/contact"
              className="mt-4 inline-flex rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold hover:border-white/40"
            >
              PROGRAMEAZĂ O DISCUȚIE
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Next Level Advertising Agency. Toate drepturile rezervate.</p>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-white/70">Politica de confidențialitate</Link>
            <Link href="#" className="hover:text-white/70">Termeni și condiții</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
