import Link from "@/components/IntentLink";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientsSection from "@/components/ClientsSection";
import WebDevelopment from "@/components/WebDevelopment";
import TrustMarquee from "@/components/TrustMarquee";
import HomeHero from "@/components/HomeHero";
import HomeMotion from "@/components/HomeMotion";
import HomeServices from "@/components/HomeServices";
import HomeProcess from "@/components/HomeProcess";
import JsonLd from "@/components/JsonLd";
import { businessSchema, DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo";
import { trustedBy, siteConfig } from "@/lib/data";
import { Mail, MessageCircle } from "lucide-react";
import "./home-motion.css";
import "./future-landing.css";

export const metadata = pageMetadata("Marketing digital și web design Zalău | Next Level", DEFAULT_DESCRIPTION, "/");

export default function HomePage() {
  return <HomeMotion>
    <JsonLd data={businessSchema} />
    <a className="nl-skip" href="#main-content">Sari la conținut</a>
    <Header />
    <main id="main-content">
      <HomeHero />
      <section className="nl-platforms" aria-label="Platforme cu care lucrăm"><div className="nl-section-shell"><p>Platformele tale.<br /><strong>Un ecosistem conectat.</strong></p><TrustMarquee items={trustedBy} /></div></section>
      <ClientsSection />
      <WebDevelopment />
      <HomeServices />
      <HomeProcess />
      <section className="nl-faq" aria-labelledby="faq-title"><div className="nl-section-shell nl-faq-layout">
        <div><p className="nl-eyebrow">Să clarificăm lucrurile</p><h2 id="faq-title">Întrebări despre proiectul tău digital</h2><p className="nl-faq-intro">Ai o idee, dar nu știi de unde să începi? Începem cu ce contează pentru afacerea ta.</p><Link href="/chestionar-audit" className="nl-text-link">Spune-ne despre proiect</Link></div>
        <div className="nl-faq-list">
          <details><summary>Ce servicii oferă Next Level?</summary><p>Conectăm strategia de brand, campaniile de marketing digital, web designul, SEO și automatizările. Vezi <Link href="/servicii">serviciile noastre</Link> și alegem împreună ce susține obiectivele afacerii tale.</p></details>
          <details><summary>Lucrați doar cu afaceri din Zalău și Sălaj?</summary><p>Suntem în Sălaj și colaborăm și la distanță cu afaceri din România. Putem discuta proiectul online, iar brief-ul și etapele de lucru sunt stabilite împreună.</p></details>
          <details><summary>Cât costă un site sau o campanie de marketing?</summary><p>Costul depinde de pagini, funcționalități, conținut și obiective. Completează <Link href="/chestionar-audit">brief-ul proiectului</Link> pentru o propunere adaptată nevoilor tale; pentru un site simplu există și <Link href="/chestionar-site-prezentare">chestionarul rapid</Link>.</p></details>
          <details><summary>Cum începem colaborarea?</summary><p>Ne spui despre afacerea ta, analizăm obiectivele și stabilim soluția și etapele înainte de implementare. Poți vedea <Link href="/portofoliu">proiectele din portofoliu</Link> sau ne poți scrie din <Link href="/contact">pagina de contact</Link>.</p></details>
        </div>
      </div></section>
      <section className="nl-next-level" aria-labelledby="next-level-title"><div className="nl-section-shell"><div className="nl-next-card" data-spotlight>
        <div className="nl-next-orbits" aria-hidden="true"><i /><i /><i /></div>
        <p className="nl-eyebrow">Ideea ta merită să prindă formă</p><h2 id="next-level-title">Următorul nivel începe<br />cu o conversație.</h2>
        <p>Spune-ne ce ai în minte. Găsim împreună direcția potrivită.</p>
        <div className="nl-next-actions"><Link href="/chestionar-audit" className="nl-primary-cta">Hai să construim ceva</Link><a href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="nl-next-contact"><MessageCircle size={18} aria-hidden="true" />{siteConfig.phone}</a></div>
        <a className="nl-next-mail" href={`mailto:${siteConfig.email}`}><Mail size={16} aria-hidden="true" />{siteConfig.email}</a>
      </div></div></section>
    </main>
    <Footer />
  </HomeMotion>;
}
