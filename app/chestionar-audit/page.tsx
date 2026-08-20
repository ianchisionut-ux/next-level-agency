import type { Metadata } from "next";
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
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Chestionar &amp; Audit</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Proiectul tău de site web, pas cu pas
            </h1>
            <p className="mt-5 text-base text-white/60">
              Acest chestionar ne ajută să înțelegem afacerea ta și să construim un site
              și o prezență digitală aliniate cu obiectivele tale. Durează 3–5 minute —
              răspunsurile tale devin baza propunerii pe care echipa Next Level o
              pregătește pentru tine.
            </p>
          </div>
        </section>

        {/* FORM — light, la fel ca pagina de contact */}
        <section className="bg-paper py-16 text-slate-900">
          <div className="mx-auto max-w-3xl px-6">
            <AuditForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
