import PublicPageTransition from "@/components/PublicPageTransition";
import { pageMetadata } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientsSection from "@/components/ClientsSection";
import WebDevelopment from "@/components/WebDevelopment";
import Link from "@/components/IntentLink";
import { webProjects } from "@/lib/data";
import "./portfolio.css";

export const metadata = pageMetadata("Portofoliu web design și dezvoltare | Next Level", "Vezi site-urile realizate de Next Level și brandurile cu care lucrăm. Explorează proiectele web pentru un site nou, o aplicație sau un redesign.", "/portofoliu");

export default function PortofoliuPage() {
  return (
    <>
      <Header />
      <PublicPageTransition><main className="nl-portfolio-page">
        {/* HERO — dark */}
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Portofoliu</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Site-uri și experiențe digitale
            </h1>
            <p className="mt-5 text-base text-white/60">
              Branduri cu care lucrăm și site-uri pe care le-am construit.
              Explorează proiectele pentru a discuta mai concret despre ce ai nevoie în proiectul tău.
            </p>
          </div>
        </section>

        <ClientsSection />
        <WebDevelopment layout="compact" />
        <section className="border-t border-line-light bg-paper py-16 text-slate-900">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-extrabold tracking-tight">De la exemple la proiectul tău</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">Portofoliul web include {new Intl.ListFormat("ro-RO", { type: "conjunction" }).format(webProjects.map(project => project.title))}. Legăturile din prezentări te ajută să vezi proiectele; cerințele, conținutul și funcțiile potrivite afacerii tale se stabilesc printr-un brief separat.</p>
            <p className="mt-4 leading-relaxed text-ink-soft">Folosește exemplele pentru a ne arăta ce structură sau stil ți se potrivește. În brief clarificăm publicul, obiectivul și ce trebuie să poată face vizitatorul pe site, astfel încât propunerea să răspundă nevoilor afacerii tale.</p>
            <div className="mt-6 flex flex-wrap gap-5"><Link href="/servicii#web-development" className="font-semibold text-blue hover:underline">Ce poate include un proiect de web design →</Link><Link href="/chestionar-site-prezentare" className="font-semibold text-blue hover:underline">Pregătește brief-ul pentru un site de prezentare →</Link><Link href="/contact" className="font-semibold text-blue hover:underline">Discută un proiect de conținut sau promovare →</Link></div>
          </div>
        </section>
      </main></PublicPageTransition>
      <Footer />
    </>
  );
}
