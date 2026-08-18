import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Blog | Next Level Advertising Agency",
  description: "Articole despre marketing digital, branding și creșterea afacerilor.",
};

// Articole placeholder — adaugă/editează direct aici, fără CMS sau admin.
const posts = [
  {
    title: "5 greșeli frecvente în campaniile de Performance Marketing",
    excerpt: "Cele mai comune greșeli care îți consumă bugetul de ads și cum le eviți.",
    date: "12 Iulie 2026",
  },
  {
    title: "De ce brandingul contează mai mult decât crezi",
    excerpt: "Cum o identitate vizuală puternică îți crește rata de conversie.",
    date: "3 Iulie 2026",
  },
  {
    title: "Automatizări AI care îți economisesc ore întregi pe săptămână",
    excerpt: "Trei fluxuri de automatizare pe care le implementăm des la clienți.",
    date: "24 Iunie 2026",
  },
];

export default function BlogPage() {
  return (
    <>
      <Header />
      <main>
        {/* HERO — dark */}
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Blog</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Idei despre marketing și creștere
            </h1>
            <p className="mt-5 text-base text-white/60">
              Gânduri, studii de caz și recomandări din activitatea noastră
              zilnică de agenție.
            </p>
          </div>
        </section>

        {/* POSTS — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.title}
                  className="rounded-2xl border border-line-light bg-paper-soft p-6 transition hover:border-blue/40 hover:shadow-lg hover:shadow-blue/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {post.date}
                  </p>
                  <h2 className="mt-2 text-lg font-bold leading-snug">{post.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                </article>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-ink-soft">
              Adaugă articole noi direct în <code className="rounded bg-slate-100 px-1.5 py-0.5">app/blog/page.tsx</code>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
