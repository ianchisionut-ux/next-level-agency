import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SimplePresentationForm from "./SimplePresentationForm";

export const metadata: Metadata = {
  title: "Chestionar site de prezentare | Next Level Advertising Agency",
  description: "Un chestionar scurt pentru firmele care doresc un site simplu, modern și convingător.",
};

export default function SimplePresentationQuestionnairePage() {
  return (
    <>
      <Header />
      <main>
        <section className="grain bg-navy py-9 text-center sm:py-12">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Site de prezentare</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Spune-ne pe scurt ce site îți dorești
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Varianta rapidă pentru un site de firmă clar, modern și ușor de folosit.
              Durează aproximativ 2 minute.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="rounded-full bg-blue px-5 py-2.5 text-sm font-bold text-white">
                Site simplu de prezentare
              </span>
              <Link
                href="/chestionar-audit"
                className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition hover:border-blue-bright hover:text-blue-bright"
              >
                Am nevoie de o soluție avansată
              </Link>
            </div>
          </div>
        </section>
        <section className="bg-paper py-8 text-slate-900 sm:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SimplePresentationForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
