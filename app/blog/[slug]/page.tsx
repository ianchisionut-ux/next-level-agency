import type { Metadata } from "next";
import Link from "@/components/IntentLink";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { blogGuidance, posts } from "@/lib/blog";
import { serviceContent } from "@/lib/service-content";
import { breadcrumbSchema, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: "Articol inexistent", robots: { index: false } };
  const title = `${post.title} | Blog Next Level`;
  const base = pageMetadata(title, post.excerpt, `/blog/${post.slug}`);
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.publishedAt, modifiedTime: post.updatedAt ?? post.publishedAt, authors: [SITE_NAME] },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  const guidance = blogGuidance[post.slug];
  const service = serviceContent.find(item => item.id === guidance?.serviceId);
  const related = (guidance?.relatedSlugs || []).map(relatedSlug => posts.find(item => item.slug === relatedSlug)).filter((item): item is (typeof posts)[number] => Boolean(item));

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: `${post.publishedAt}T00:00:00+03:00`, dateModified: post.updatedAt ?? post.publishedAt, inLanguage: "ro-RO", mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`, image: `${SITE_URL}/opengraph-image`, author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }, publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo-full.png` } } }} />
      <JsonLd data={breadcrumbSchema([{ name: "Acasă", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }])} />
      <Header />
      <main>
        <section className="grain bg-navy py-20">
          <div className="mx-auto max-w-3xl px-6">
            <Link href="/blog" className="text-sm font-semibold text-blue-bright hover:underline">
              ← Înapoi la blog
            </Link>
            <time dateTime={post.publishedAt} className="eyebrow mt-6 block text-blue-bright">{post.date}</time>
            {post.updatedAt && <p className="mt-2 text-xs text-white/60">Actualizat la <time dateTime={post.updatedAt}>{new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(`${post.updatedAt}T12:00:00Z`))}</time></p>}
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-sm text-white/60">Un ghid Next Level{service ? ` despre ${service.shortTitle.toLocaleLowerCase("ro-RO")}` : ""}.</p>
          </div>
        </section>

        <section className="bg-paper py-16 text-slate-900">
          <article className="mx-auto max-w-2xl px-6 text-base leading-relaxed text-ink-soft">
            <p>{post.content[0]}</p>
            {guidance ? <>
              {guidance.sections.map(section => <section key={section.heading} className="mt-9"><h2 className="mb-4 text-2xl font-extrabold leading-snug text-slate-900">{section.heading}</h2>{section.paragraphs.map(index => <p key={index} className="mt-4">{post.content[index]}</p>)}</section>)}
              <section className="mt-9 rounded-2xl border border-line-light bg-paper-soft p-6"><h2 className="text-xl font-extrabold text-slate-900">Ce poți verifica acum</h2><ul className="mt-4 list-disc space-y-2 pl-5">{guidance.checklist.map(item => <li key={item}>{item}</li>)}</ul></section>
              {guidance.note && <p className="mt-6 text-sm leading-relaxed">{guidance.note}</p>}
              {guidance.references && <section className="mt-8"><h2 className="text-lg font-bold text-slate-900">Resurse pentru aprofundare</h2><ul className="mt-3 space-y-2 text-sm">{guidance.references.map(reference => <li key={reference.url}><a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">{reference.title}</a></li>)}</ul></section>}
            </> : post.content.slice(1).map((paragraph, index) => <p key={index} className="mt-5">{paragraph}</p>)}
          </article>

          <div className="mx-auto mt-12 max-w-2xl px-6">
            <div className="rounded-2xl border border-line-light bg-paper-soft p-6 text-center">
              <p className="text-sm text-ink-soft">
                {service ? `Vrei să discuți un proiect de ${service.shortTitle.toLocaleLowerCase("ro-RO")}?` : "Vrei să discutăm cum se aplică aceste idei afacerii tale?"}
              </p>
              {service && <Link href={`/servicii#${service.id}`} className="mt-3 block text-sm font-semibold text-blue hover:underline">Vezi ce poate include serviciul și cum lucrăm →</Link>}
              <Link
                href="/contact"
                className="mt-3 inline-block rounded-lg bg-blue-glow px-6 py-3 text-sm font-bold text-[#ffffff] transition hover:bg-blue-800"
              >
                PROGRAMEAZĂ O DISCUȚIE
              </Link>
            </div>
          </div>
          {related.length > 0 && <section className="mx-auto mt-12 max-w-2xl px-6" aria-labelledby="related-articles-title"><h2 id="related-articles-title" className="text-2xl font-extrabold text-slate-900">Ghiduri pe teme apropiate</h2><ul className="mt-5 space-y-4">{related.map(item => <li key={item.slug}><Link href={`/blog/${item.slug}`} className="font-semibold text-blue hover:underline">{item.title}</Link><p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.excerpt}</p></li>)}</ul></section>}
        </section>
      </main>
      <Footer />
    </>
  );
}
