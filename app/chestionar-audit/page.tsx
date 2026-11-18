import { pageMetadata } from "@/lib/seo";
import Link from "@/components/IntentLink";
import { ArrowRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuditForm from "./AuditForm";
import "./audit-form.css";

export const metadata = pageMetadata("Spune-ne despre site-ul tău | Next Level", "Alege ce îți dorești de la noul site și spune-ne despre afacerea ta. Un chestionar simplu pentru o propunere personalizată.", "/chestionar-audit");

export default function ChestionarAuditPage() {
  return (
    <>
      <Header />
      <main className="questionnaire-page audit-page">
        <section className="audit-hero">
          <p className="audit-hero-kicker"><Sparkles size={17} aria-hidden="true" /> Pornim de la ideea ta</p>
          <h1>Hai să pregătim <span>site-ul tău.</span></h1>
          <p className="audit-hero-description">Spune-ne ce ai în minte. Alegi variantele potrivite, iar detaliile le stabilim împreună.</p>
          <Link href="/chestionar-site-prezentare" className="audit-simple-link">Vrei doar un site simplu de prezentare? <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <section className="audit-form-section" aria-label="Chestionar pentru noul site"><AuditForm /></section>
      </main>
      <Footer />
    </>
  );
}
