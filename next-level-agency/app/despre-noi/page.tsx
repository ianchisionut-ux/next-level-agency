import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { process, stats } from "@/lib/data";

export const metadata: Metadata = {
  title: "Despre noi | Next Level Advertising Agency",
  description: "Cine suntem, cum lucrăm și de ce alegem rezultate în locul promisiunilor.",
};

export default function DespreNoiPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO — dark */}
        <section className="grain bg-navy py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="eyebrow text-blue-bright">Despre noi</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              O echipă obsedată de rezultate
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/60">
              Next Level Advertising Agency ajută afaceri să crească printr-o
              combinație de branding puternic, marketing performant și
              tehnologie modernă. Nu vindem promisiuni — livrăm cifre.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-6 px-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-blue-bright">{s.value}</div>
                <div className="mt-1 text-xs text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* MISSION / VALUES — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-blue">Misiunea noastră</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                Creștere reală, măsurabilă, sustenabilă
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Fiecare proiect pe care îl preluăm are un singur scop: să
                aducă rezultate reale afacerii clientului. Combinăm strategia
                cu execuția, iar datele ne ghidează fiecare decizie.
              </p>
            </div>
            <div>
              <p className="eyebrow text-blue">Cum lucrăm</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                Transparență și comunicare constantă
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Ai acces direct la echipa care lucrează pe proiectul tău,
                rapoarte clare și decizii bazate pe rezultate, nu pe presupuneri.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {process.map((p) => (
                <div key={p.step} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue/10 text-sm font-extrabold text-blue">
                    {p.step}
                  </div>
                  <h3 className="mt-4 text-sm font-bold uppercase tracking-wide">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
