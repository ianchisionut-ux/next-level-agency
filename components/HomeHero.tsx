import Link from "@/components/IntentLink";
import { ArrowUpRight, Orbit } from "lucide-react";
import InteractiveCore from "@/components/InteractiveCore";

export default function HomeHero() {
  return (
    <section className="nl-hero" aria-labelledby="hero-title">
      {/* React hoists these hints into head; only the matching viewport loads. */}
      <link rel="preload" as="image" href="/hero/hero-circuit-background-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/hero/hero-circuit-background-tablet.avif" type="image/avif" media="(min-width: 768px) and (max-width: 1023px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/hero/hero-circuit-background.avif" type="image/avif" media="(min-width: 1024px)" fetchPriority="high" />
      <picture className="nl-hero-grid" aria-hidden="true">
        <source media="(max-width: 767px)" type="image/avif" srcSet="/hero/hero-circuit-background-mobile.avif" />
        <source media="(max-width: 767px)" type="image/webp" srcSet="/hero/hero-circuit-background-mobile.webp" />
        <source media="(max-width: 1023px)" type="image/avif" srcSet="/hero/hero-circuit-background-tablet.avif" />
        <source media="(max-width: 1023px)" type="image/webp" srcSet="/hero/hero-circuit-background-tablet.webp" />
        <source type="image/avif" srcSet="/hero/hero-circuit-background.avif" />
        <source type="image/webp" srcSet="/hero/hero-circuit-background.webp" />
        {/* Pre-encoded art direction keeps the original centered circuit crop. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/hero-circuit-background.jpg" alt="" width={1408} height={768} fetchPriority="high" loading="eager" decoding="async" />
      </picture>
      <div className="nl-hero-main">
        <div className="nl-hero-art">
          <div className="nl-orbit-halo" aria-hidden="true" />
          <InteractiveCore />
          <div className="nl-art-caption"><Orbit size={15} aria-hidden="true" /><span>Web. Automatizări. Performanță.</span></div>
        </div>
        <div className="nl-hero-content">
        <div className="nl-hero-copy">
          <p className="nl-live-badge"><span aria-hidden="true" /> Next Level · Digital growth studio</p>
          <h1 id="hero-title">Marketing digital.<br />Web design.<br /><span className="nl-gradient-text">Totul, la alt nivel.</span></h1>
          <p className="nl-hero-description">Conectăm strategia, designul și automatizările într-un singur ecosistem. Pentru afaceri din Zalău, Sălaj și din toată România care vor să crească online.</p>
          <div className="nl-hero-actions">
            <Link href="/chestionar-audit" data-magnetic className="nl-primary-cta">Hai să construim ceva <ArrowUpRight size={19} aria-hidden="true" /></Link>
            <Link href="/portofoliu" data-magnetic className="nl-secondary-cta">Explorează proiectele <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="nl-hero-disciplines" aria-label="Serviciile agenției"><span>Strategie & branding</span><span>Web & SEO</span><span>AI & automatizări</span></div>
        </div>
        </div>
      </div>
      <div className="nl-hero-bottom"><span>CREĂM. OPTIMIZĂM. SCALĂM.</span><a href="#servicii">Descoperă ce putem construi <span aria-hidden="true">↓</span></a></div>
    </section>
  );
}
