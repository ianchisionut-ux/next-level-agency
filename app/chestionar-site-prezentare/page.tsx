import { pageMetadata } from "@/lib/seo";
import Link from "@/components/IntentLink";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SimplePresentationForm from "./SimplePresentationForm";
import { Sparkles } from "lucide-react";
import "../chestionar-audit/audit-form.css";

export const metadata = pageMetadata("Ofertă site de prezentare pentru firmă | Next Level", "Spune-ne ce site de prezentare îți dorești. Un chestionar rapid despre afacerea, paginile și obiectivele tale, pentru o ofertă personalizată.", "/chestionar-site-prezentare");

export default function SimplePresentationQuestionnairePage() {
  return (
    <>
      <Header />
      <main className="questionnaire-page audit-page">
        <section className="audit-hero">
          <p className="audit-hero-kicker"><Sparkles size={17} aria-hidden="true" /> Un site simplu. Un început bun.</p>
          <h1>Hai să prezentăm <span>afacerea ta.</span></h1>
          <p className="audit-hero-description">Câteva întrebări despre firmă, pagini și stil. Alegi ce ți se potrivește, iar detaliile le stabilim împreună.</p>
          <Link href="/chestionar-audit" className="audit-simple-link">Ai nevoie de magazin, rezervări sau alte funcții? Vezi chestionarul complet.</Link>
        </section>
        <section className="audit-form-section" aria-label="Chestionar pentru site de prezentare">
          <SimplePresentationForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
