import Link from "next/link";
import { BrandLogo, IconFacebook, IconInstagram, IconTiktok } from "./Icons";
import { siteConfig } from "@/lib/data";
import CookieSettingsLink from "./CookieSettingsLink";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo className="h-9" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Agenție de advertising ce creează branduri puternice și generează
              rezultate reale prin marketing digital, design și automatizări.
            </p>
            <div className="mt-5 flex items-center gap-4">
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
                <span title="În curând" className="cursor-default text-white/20">
                  <IconTiktok />
                </span>
              )}
            </div>

            <div className="mt-7">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Partener tehnologic
              </p>
              <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.25)] ring-1 ring-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/meta-tech-provider.png"
                  alt="Next Level este Meta Tech Provider"
                  className="h-auto w-56 rounded-xl"
                />
              </div>
            </div>
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
              <li><Link href="/chestionar-audit" className="hover:text-white">Ofertă</Link></li>
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

        {/* Sigle obligatorii conform legislației (OUG 34/2014, Reg. UE 524/2013):
            SAL - Soluționarea Alternativă a Litigiilor (ANPC)
            SOL - Soluționarea Online a Litigiilor (Comisia Europeană) */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-8">
          <a
            href="https://anpc.ro/ce-este-sal/"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="rounded-lg bg-white p-2 transition hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/legal/anpc-sal.png"
              alt="Soluționarea Alternativă a Litigiilor"
              className="h-10 w-auto sm:h-12"
            />
          </a>
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="rounded-lg bg-white p-2 transition hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/legal/anpc-sol.png"
              alt="Soluționarea Online a Litigiilor"
              className="h-10 w-auto sm:h-12"
            />
          </a>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <div className="text-center sm:text-left">
            <p>
              Copyright © {new Date().getFullYear()} {siteConfig.legalName}. Toate drepturile rezervate.
            </p>
            <p className="mt-1 text-white/30">
              CUI {siteConfig.cui} · {siteConfig.tradeRegistryNumber}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            <Link href="/termeni-si-conditii" className="hover:text-white/70">Termeni și Condiții</Link>
            <Link href="/politica-de-confidentialitate" className="hover:text-white/70">Politica de Confidențialitate</Link>
            <Link href="/politica-de-cookies" className="hover:text-white/70">Politica de Cookies</Link>
            <CookieSettingsLink className="hover:text-white/70">Setări Cookies</CookieSettingsLink>
            <Link href="/declaratie-de-accesibilitate" className="hover:text-white/70">Declarație de Accesibilitate</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
