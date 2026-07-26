import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientsSection from "@/components/ClientsSection";

export const metadata: Metadata = {
  title: "Portofoliu | Next Level Advertising Agency",
  description: "Brandurile alături de care lucrăm și rezultatele pe care le construim împreună.",
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
              Branduri cu care construim rezultate
            </h1>
            <p className="mt-5 text-base text-white/60">
              O parte dintre partenerii alături de care lucrăm zi de zi.
            </p>
          </div>
        </section>

        <ClientsSection />
      </main>
      <Footer />
    </>
  );
}
