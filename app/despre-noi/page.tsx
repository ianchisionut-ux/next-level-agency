import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { process, stats } from "@/lib/data";
import {
  IconDiscovery,
  IconStrategy,
  IconExecution,
  IconOptimization,
  IconGrowth,
} from "@/components/Icons";

const processIcons = {
  discovery: IconDiscovery,
  strategy: IconStrategy,
  execution: IconExecution,
  optimization: IconOptimization,
  growth: IconGrowth,
};

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
  Credem că marketingul trebuie să genereze rezultate, nu doar impresii.
  Fiecare proiect începe cu o analiză atentă a afacerii, a pieței și a
  obiectivelor, pentru a construi o strategie adaptată nevoilor reale ale
  fiecărui client.
</p>

<p className="mt-4 text-sm leading-relaxed text-ink-soft">
  Îmbinăm creativitatea cu analiza datelor, brandingul cu performanța și
  conținutul cu publicitatea digitală. Monitorizăm constant fiecare campanie,
  optimizăm fiecare etapă și luăm decizii bazate pe rezultate concrete, nu pe
  presupuneri.
</p>

<p className="mt-4 text-sm leading-relaxed text-ink-soft">
  Obiectivul nostru este să dezvoltăm branduri puternice, să atragem clienți
  relevanți și să construim o creștere sustenabilă, care continuă și după
  încheierea unei campanii.
</p>
            </div>
            <div>
              <p className="eyebrow text-blue">Cum lucrăm</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                Transparență și comunicare constantă
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
  Credem că cele mai bune rezultate apar atunci când clientul este implicat și
  informat pe tot parcursul colaborării. De aceea, punem accent pe comunicare
  deschisă, răspunsuri rapide și o relație bazată pe încredere, nu pe promisiuni.
</p>

<p className="mt-4 text-sm leading-relaxed text-ink-soft">
  Ai acces direct la echipa care dezvoltă proiectul tău, primești actualizări
  periodice, rapoarte clare și explicații ușor de înțeles pentru fiecare
  acțiune implementată. Fiecare decizie este susținută de date, analize și
  obiective măsurabile, astfel încât să știi în orice moment unde se află
  proiectul și ce rezultate generează.
</p>

<p className="mt-4 text-sm leading-relaxed text-ink-soft">
  Nu ascundem procese, nu folosim termeni complicați și nu luăm decizii fără
  consultare. Analizăm performanța campaniilor, optimizăm continuu strategiile
  și adaptăm direcția în funcție de evoluția pieței și comportamentul
  publicului.
</p>

<p className="mt-4 text-sm leading-relaxed text-ink-soft">
  Pentru noi, o colaborare de succes înseamnă mai mult decât livrarea unui
  serviciu. Înseamnă un parteneriat pe termen lung, construit pe transparență,
  responsabilitate și obiective comune, în care fiecare investiție este
  orientată către creșterea reală a afacerii.
</p>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-6xl px-6">
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
                    <h3 className="mt-4 text-sm font-bold uppercase tracking-wide">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
