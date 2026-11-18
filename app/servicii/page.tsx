import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  IconTarget,
  IconChart,
  IconCode,
  IconBot,
  IconSearch,
} from "@/components/Icons";
import { siteConfig } from "@/lib/data";
import { serviceContent, serviceQuestions } from "@/lib/service-content";
import { posts } from "@/lib/blog";

export const metadata = pageMetadata("Servicii de marketing digital, web design și SEO | Next Level", "Branding, campanii Google și Meta, web design, SEO și automatizări. Află cui se adresează, ce poate include un proiect și cum începem colaborarea.", "/servicii");

const serviceIcons = {
  target: IconTarget,
  chart: IconChart,
  code: IconCode,
  bot: IconBot,
  search: IconSearch,
};

export default function ServiciiPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO — dark */}
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Serviciile noastre</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Marketing digital, web design și automatizări
            </h1>
            <p className="mt-5 text-base text-white/60">
              Alegem serviciile în funcție de nevoia afacerii, nu un pachet identic pentru toată lumea.
              Aici poți vedea ce poate include fiecare direcție și ce clarificăm înainte de ofertă.
            </p>
            <p className="mt-4 text-sm text-white/60">Sediul nostru este în Mirșid, Sălaj. Colaborăm cu afaceri din Zalău și cu proiecte din România, inclusiv online.</p>
            <nav aria-label="Categorii de servicii" className="mt-8 flex flex-wrap justify-center gap-3">
              {serviceContent.map(service => <a key={service.id} href={`#${service.id}`} className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-blue-bright hover:text-white">{service.shortTitle}</a>)}
            </nav>
          </div>
        </section>

        {/* SERVICES GRID — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="space-y-8">
              {serviceContent.map((service) => {
                const Icon = serviceIcons[service.icon];
                return (
                  <article
                    key={service.title}
                    id={service.id}
                    aria-labelledby={`${service.id}-title`}
                    className="scroll-mt-28 rounded-2xl border border-line-light bg-paper-soft p-6 sm:p-9"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue/10 text-blue">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 id={`${service.id}-title`} className="mt-5 text-2xl font-extrabold tracking-tight">{service.title}</h2>
                    <p className="mt-3 max-w-4xl leading-relaxed text-ink-soft">
                      {service.introduction}
                    </p>
                    <div className="mt-5 max-w-4xl"><h3 className="font-bold">Ce nevoie poate rezolva</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.problem}</p></div>
                    <div className="mt-7 grid gap-8 md:grid-cols-2">
                      <div>
                        <h3 className="font-bold">Cui se adresează</h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.suitableFor}</p>
                        <h3 className="mt-6 font-bold">Cum abordăm proiectul</h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.approach}</p>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">{service.steps.map(step => <li key={step}>{step}</li>)}</ol>
                      </div>
                      <div>
                        <h3 className="font-bold">Ce poate include</h3>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">{service.deliverables.map(deliverable => <li key={deliverable}>{deliverable}</li>)}</ul>
                        <p className="mt-4 text-sm leading-relaxed text-ink-soft">Livrabilele exacte sunt cele agreate în oferta proiectului.</p>
                      </div>
                    </div>
                    <div className="mt-7 rounded-xl border border-line-light p-5"><h3 className="font-bold">Ce clarificăm înainte de ofertă</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">{service.beforeQuote.map(question => <li key={question}>{question}</li>)}</ul></div>
                    <p className="mt-7 rounded-xl border border-line-light bg-paper p-4 text-sm leading-relaxed text-ink-soft">{service.expectation}</p>
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                      <Link href={service.id === "web-development" ? "/chestionar-site-prezentare" : "/contact"} className="font-semibold text-blue hover:underline">{service.id === "web-development" ? "Descrie site-ul de care ai nevoie" : `Discută despre ${service.shortTitle.toLocaleLowerCase("ro-RO")}`} →</Link>
                      <Link href="/portofoliu" className="text-sm font-semibold text-blue hover:underline">Vezi proiectele din portofoliu →</Link>
                    </div>
                    <div className="mt-6 border-t border-line-light pt-5">
                      <h3 className="text-sm font-bold">Ghiduri pentru decizia ta</h3>
                      <ul className="mt-2 space-y-2 text-sm">{service.relatedSlugs.map(slug => posts.find(post => post.slug === slug)).filter((post): post is (typeof posts)[number] => Boolean(post)).map(post => <li key={post.slug}><Link href={`/blog/${post.slug}`} className="text-blue hover:underline">{post.title}</Link></li>)}</ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-line-light bg-paper py-16 text-slate-900" aria-labelledby="service-questions-title">
          <div className="mx-auto max-w-4xl px-6">
            <h2 id="service-questions-title" className="text-3xl font-extrabold tracking-tight">Întrebări înainte de colaborare</h2>
            <div className="mt-7 space-y-3">{serviceQuestions.map(item => <details key={item.question} className="rounded-xl border border-line-light bg-paper-soft p-5"><summary className="cursor-pointer font-bold">{item.question}</summary><p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.answer}</p></details>)}</div>
          </div>
        </section>

        {/* CTA — dark */}
        <section className="bg-navy py-20 text-center">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Nu știi de unde să începi?
            </h2>
            <p className="mt-3 text-sm text-white/50">
              Spune-ne ce vrei să îmbunătățești, ce ai deja și care sunt limitele proiectului. Alegem împreună ce merită făcut mai întâi.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-glow px-6 py-3.5 text-sm font-bold tracking-wide text-[#ffffff] transition hover:bg-blue-800"
              >
                PROGRAMEAZĂ O DISCUȚIE
              </a>
              <Link
                href="/contact"
                className="rounded-lg border border-white/25 px-6 py-3.5 text-sm font-bold tracking-wide transition hover:border-white/50"
              >
                VEZI CONTACT
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
