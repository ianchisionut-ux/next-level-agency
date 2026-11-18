import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { blogGuidance, posts } from "@/lib/blog";
import { serviceContent } from "@/lib/service-content";

export const metadata = pageMetadata("Blog marketing digital, SEO și automatizări | Next Level", "Ghiduri despre campanii Google și Meta, SEO local, web design, branding și automatizări. Idei practice pentru dezvoltarea afacerii tale.", "/blog");

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
              Ghiduri despre alegerea canalelor de promovare, structura unui site,
              conținut și automatizări. Idei de verificat în contextul afacerii tale.
            </p>
          </div>
        </section>

        {/* POSTS — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="rounded-2xl border border-line-light bg-paper-soft p-6 transition hover:border-blue/40 hover:shadow-lg hover:shadow-blue/10"
                >
                  <time dateTime={post.publishedAt} className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {post.date}
                  </time>
                  <p className="mt-3 text-xs font-semibold text-blue">{serviceContent.find(service => service.id === blogGuidance[post.slug]?.serviceId)?.shortTitle}</p>
                  <h2 className="mt-2 text-lg font-bold leading-snug">{post.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-blue">
                    Citește articolul →
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-12 rounded-2xl border border-line-light bg-paper-soft p-7">
              <h2 className="text-xl font-extrabold">De la ghid la implementare</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">Dacă vrei să discutăm aplicarea ideilor pe site-ul sau promovarea afacerii tale, vezi ce poate include fiecare serviciu și ce clarificăm înainte de ofertă.</p>
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">{serviceContent.map(service => <li key={service.id}><Link href={`/servicii#${service.id}`} className="text-blue hover:underline">{service.title}</Link></li>)}</ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
