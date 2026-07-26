import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientsSection from "@/components/ClientsSection";
import TrustMarquee from "@/components/TrustMarquee";
import {
  BrandMark,
  IconTarget,
  IconChart,
  IconCode,
  IconBot,
  IconSearch,
  IconStar,
  IconDiscovery,
  IconStrategy,
  IconExecution,
  IconOptimization,
  IconGrowth,
} from "@/components/Icons";
import {
  stats,
  trustedBy,
  services,
  process,
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

const processIcons = {
  discovery: IconDiscovery,
  strategy: IconStrategy,
  execution: IconExecution,
  optimization: IconOptimization,
  growth: IconGrowth,
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* ---------------------------------------------------------------- */}
        {/* HERO — dark, video de fundal în buclă (stil disruptiveadvertising.com) */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden bg-navy">
          {/* Fundal video în buclă, central, pe tot ecranul. Pune propriul
              fișier la /public/video/hero-bg.mp4 (mp4, h264, fără sunet,
              ideal sub 8-10MB). Dacă fișierul lipsește, rămâne vizibil
              gradientul de mai jos, deci nimic nu se strică. */}
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-ink to-navy" />
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-50"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          >
            <source src="/video/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/70 to-navy" />
          <div className="grain absolute inset-0" />

          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:py-24">
            <div className="relative mx-auto flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
              <div className="absolute inset-0 rounded-full bg-blue/25 blur-3xl" />
              <BrandMark className="relative h-full w-full drop-shadow-[0_0_40px_rgba(59,130,246,0.45)]" />
            </div>

            <p className="eyebrow mt-6 text-blue-bright">Creăm. Optimizăm. Scalăm.</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              NEXT LEVEL
              <br />
              <span className="text-blue-bright">ADVERTISING</span>
              <br />
              AGENCY
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/60">
              Transformăm afaceri în branduri puternice și generăm rezultate
              reale prin marketing digital, design și automatizări
              inteligente.
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
                href="/portofoliu"
                className="rounded-lg border border-white/25 px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:border-white/50"
              >
                VEZI PORTOFOLIUL
              </Link>
            </div>

            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-white">{s.value}</div>
                  <div className="mt-1 text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* TRUST BAR — dark                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-white/10 bg-navy py-8">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-5 text-center text-xs font-semibold tracking-widest text-white/40">
              AU ÎNCREDERE ÎN NOI
            </p>
            <TrustMarquee items={trustedBy} />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SERVICES — dark                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-navy py-24">
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
                <div key={d.step} className="rounded-2xl border border-white/10 bg-navy-soft p-8">
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

        {/* PROCESS — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p className="eyebrow text-blue">Procesul nostru</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Un proces clar. Rezultate predictibile.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {process.map((p) => {
                const Icon = processIcons[p.icon];
                return (
                  <div key={p.step} className="text-center">
                    <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue/10 text-blue">
                      <Icon className="h-6 w-6" />
                      <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue text-[10px] font-extrabold text-white">
                        {p.step}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold uppercase tracking-wide">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

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
    </>
  );
}
