import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  IconTarget,
  IconChart,
  IconCode,
  IconBot,
  IconSearch,
} from "@/components/Icons";
import { services, siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Servicii | Next Level Advertising Agency",
  description: "Branding, performance marketing, web design, AI & automation, SEO & content marketing.",
};

const serviceIcons = {
  target: IconTarget,
  chart: IconChart,
  code: IconCode,
  bot: IconBot,
  search: IconSearch,
};

export default function ServiciiPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO — dark */}
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Serviciile noastre</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Soluții complete pentru creșterea afacerii tale
            </h1>
            <p className="mt-5 text-base text-white/60">
              De la strategie la execuție, ne ocupăm de tot ce are nevoie
              brandul tău ca să crească.
            </p>
          </div>
        </section>

        {/* SERVICES GRID — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {services.map((service) => {
                const Icon = serviceIcons[service.icon];
                return (
                  <div
                    key={service.title}
                    className="rounded-2xl border border-line-light bg-paper-soft p-8 transition hover:border-blue/40 hover:shadow-lg hover:shadow-blue/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue/10 text-blue">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-lg font-bold">{service.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {service.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA — dark */}
        <section className="bg-navy py-20 text-center">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Nu știi de care serviciu ai nevoie?
            </h2>
            <p className="mt-3 text-sm text-white/50">
              Spune-ne despre afacerea ta și îți recomandăm strategia potrivită.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-blue-glow"
              >
                PROGRAMEAZĂ O DISCUȚIE
              </a>
              <Link
                href="/contact"
                className="rounded-lg border border-white/25 px-6 py-3.5 text-sm font-bold tracking-wide transition hover:border-white/50"
              >
                VEZI CONTACT
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
