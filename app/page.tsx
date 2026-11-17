import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientsSection from "@/components/ClientsSection";
import OurWork from "@/components/OurWork";
import WebDevelopment from "@/components/WebDevelopment";
import TrustMarquee from "@/components/TrustMarquee";
import HomeHero from "@/components/HomeHero";
import HomeMotion from "@/components/HomeMotion";
import JsonLd from "@/components/JsonLd";
import { businessSchema, DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo";
import "./home-motion.css";
import {
  IconTarget,
  IconChart,
  IconCode,
  IconBot,
  IconSearch,
  IconStar,
} from "@/components/Icons";
import {
  trustedBy,
  services,
  differentiators,
  testimonials,
  siteConfig,
} from "@/lib/data";

const serviceIcons = {
  target: IconTarget,
  chart: IconChart,
  code: IconCode,
  bot: IconBot,
  search: IconSearch,
};

export const metadata = pageMetadata("Marketing digital și web design Zalău | Next Level", DEFAULT_DESCRIPTION, "/");

export default function HomePage() {
  return (
    <HomeMotion>
      <JsonLd data={businessSchema} />
      <a className="nl-skip" href="#main-content">Sari la conținut</a>
      <Header />
      <main id="main-content">
        {/* ---------------------------------------------------------------- */}
        {/* HERO — dark, video de fundal în buclă (stil disruptiveadvertising.com) */}
        {/* ---------------------------------------------------------------- */}
        <HomeHero />

        {/* ---------------------------------------------------------------- */}
        {/* TRUST BAR — dark                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-white/10 bg-navy py-8">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-5 text-center text-xs font-semibold tracking-widest text-white/40">
              PLATFORME CU CARE LUCRĂM
            </p>
            <TrustMarquee items={trustedBy} />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SERVICES — dark                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section id="servicii" className="bg-navy py-24 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="eyebrow text-blue-bright">Serviciile noastre</p>
                <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Soluții complete pentru creșterea afacerii tale
                </h2>
              </div>
              <p className="max-w-md text-sm text-white/50">
                Oferim servicii integrate, de la strategie la implementare,
                pentru a-ți aduce brandul la nivelul următor.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {services.map((service) => {
                const Icon = serviceIcons[service.icon];
                return (
                  <div
                    key={service.title}
                    data-spotlight data-reveal
                    className="rounded-2xl border border-white/10 bg-navy-soft p-6 transition hover:border-blue/40"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue/15 text-blue-bright">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-sm font-bold uppercase tracking-wide">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                      {service.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/servicii"
                className="inline-block rounded-lg border border-white/25 px-6 py-3 text-sm font-bold tracking-wide transition hover:border-white/50"
              >
                VEZI TOATE SERVICIILE
              </Link>
            </div>
          </div>
        </section>

        {/* DIFFERENTIATORS — dark, closes out the top dark band */}
        <section className="border-t border-white/10 bg-navy pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p className="eyebrow text-blue-bright">De ce Next Level</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ce ne diferențiază de o agenție obișnuită
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {differentiators.map((d) => (
                <div key={d.step} data-spotlight data-reveal className="rounded-2xl border border-white/10 bg-navy-soft p-8">
                  <span className="text-4xl font-extrabold text-blue/40">{d.step}</span>
                  <h3 className="mt-4 text-lg font-bold">{d.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    {d.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* LIGHT BAND START                                                  */}
        {/* ================================================================ */}

        {/* OUR CLIENTS — light (editable in lib/data.ts) */}
        <ClientsSection />

        <OurWork />

        <WebDevelopment />

        {/* ================================================================ */}
        {/* LIGHT BAND END                                                    */}
        {/* ================================================================ */}

        {/* TESTIMONIALS — dark */}
        <section className="bg-navy py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p className="eyebrow text-blue-bright">Ce spun clienții noștri</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Parteneriate. Rezultate. Încredere.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  data-spotlight data-reveal
                  className="rounded-2xl border border-white/10 bg-navy-soft p-6"
                >
                  <div className="flex gap-1 text-blue-bright">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <IconStar key={i} />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/70">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue/20 text-xs font-bold text-blue-bright">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-white/40">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="nl-faq bg-navy pb-24" aria-labelledby="faq-title">
          <div className="mx-auto max-w-4xl px-6">
            <p className="eyebrow text-blue-bright">Înainte să începem</p>
            <h2 id="faq-title" className="mt-3 mb-9 text-3xl font-extrabold tracking-tight">Întrebări despre proiectul tău digital</h2>
            <details><summary>Ce servicii oferă Next Level?</summary><p>Conectăm strategia de brand, campaniile de marketing digital, web designul, SEO și automatizările. Vezi <Link href="/servicii">serviciile noastre</Link> și alegem împreună ce susține obiectivele afacerii tale.</p></details>
            <details><summary>Lucrați doar cu afaceri din Zalău și Sălaj?</summary><p>Suntem în Sălaj și colaborăm și la distanță cu afaceri din România. Putem discuta proiectul online, iar brief-ul și etapele de lucru sunt stabilite împreună.</p></details>
            <details><summary>Cât costă un site sau o campanie de marketing?</summary><p>Costul depinde de pagini, funcționalități, conținut și obiective. Completează <Link href="/chestionar-audit">brief-ul proiectului</Link> pentru o propunere adaptată nevoilor tale; pentru un site simplu există și <Link href="/chestionar-site-prezentare">chestionarul rapid</Link>.</p></details>
            <details><summary>Cum începem colaborarea?</summary><p>Ne spui despre afacerea ta, analizăm obiectivele și stabilim soluția și etapele înainte de implementare. Poți vedea <Link href="/portofoliu">proiectele din portofoliu</Link> sau ne poți scrie din <Link href="/contact">pagina de contact</Link>.</p></details>
          </div>
        </section>

        {/* CTA — dark */}
        <section className="bg-navy pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grain flex flex-col items-center justify-between gap-6 rounded-2xl border border-blue/30 bg-navy-soft p-10 text-center sm:flex-row sm:text-left">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  EȘTI PREGĂTIT SĂ DUCI AFACEREA TA LA NEXT LEVEL?
                </h3>
                <p className="mt-2 text-sm text-white/50">
                  Hai să discutăm despre cum putem obține rezultate reale pentru tine.
                </p>
              </div>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-lg bg-blue px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-blue-glow"
              >
                PROGRAMEAZĂ O DISCUȚIE GRATUITĂ
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </HomeMotion>
  );
}
