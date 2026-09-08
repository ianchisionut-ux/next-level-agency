import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuditForm from "./AuditForm";

export const metadata: Metadata = {
  title: "Chestionar & Audit Proiect Site Web | Next Level Advertising Agency",
  description:
    "Completează chestionarul de audit pentru proiectul tău de site web. Ne ajută să înțelegem afacerea ta și să pregătim o propunere personalizată.",
};

export default function ChestionarAuditPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO — dark, la fel ca restul paginilor site-ului */}
        <section className="grain bg-navy py-8 text-center sm:py-10">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Chestionar &amp; Audit</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Proiectul tău de site web, pas cu pas
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Acest chestionar ne ajută să înțelegem afacerea ta și să construim un site
              aliniat cu obiectivele tale. Durează 3–5 minute, iar răspunsurile devin
              baza propunerii pregătite de echipa Next Level.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="rounded-full bg-blue px-5 py-2.5 text-sm font-bold text-white">
                Chestionar avansat
              </span>
              <Link
                href="/chestionar-site-prezentare"
                className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition hover:border-blue-bright hover:text-blue-bright"
              >
                Vreau un site simplu de prezentare
              </Link>
            </div>
          </div>
        </section>

        {/* FORM — light, la fel ca pagina de contact */}
        <section className="bg-paper py-8 text-slate-900 sm:py-10">
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6">
            <AuditForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
