import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientsSection from "@/components/ClientsSection";
import { portfolio } from "@/lib/data";

export const metadata: Metadata = {
  title: "Portofoliu | Next Level Advertising Agency",
  description: "Proiecte care generează rezultate reale pentru clienții noștri.",
};

export default function PortofoliuPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO — dark */}
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Portofoliu</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Proiecte care generează rezultate
            </h1>
            <p className="mt-5 text-base text-white/60">
              O selecție de proiecte prin care am ajutat afaceri din diverse
              industrii să crească.
            </p>
          </div>
        </section>

        {/* PORTFOLIO GRID — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((item) => (
                <div
                  key={item.title}
                  className="overflow-hidden rounded-2xl border border-line-light bg-paper-soft"
                >
                  <div className={`h-48 bg-gradient-to-br ${item.accent}`} />
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {item.category}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-xl font-extrabold text-blue">
                      {item.result}{" "}
                      <span className="text-sm font-semibold text-ink-soft">
                        {item.resultLabel}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-ink-soft">
              Adaugă proiecte noi direct în <code className="rounded bg-slate-100 px-1.5 py-0.5">lib/data.ts</code> — se afișează automat aici.
            </p>
          </div>
        </section>

        <ClientsSection />
      </main>
      <Footer />
    </>
  );
}
