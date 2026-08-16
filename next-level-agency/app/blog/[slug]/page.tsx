import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { posts } from "@/lib/blog";

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
  if (!post) return {};
  return {
    title: `${post.title} | Blog Next Level`,
    description: post.excerpt,
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

  return (
    <>
      <Header />
      <main>
        <section className="grain bg-navy py-20">
          <div className="mx-auto max-w-3xl px-6">
            <Link href="/blog" className="text-sm font-semibold text-blue-bright hover:underline">
              ← Înapoi la blog
            </Link>
            <p className="eyebrow mt-6 text-blue-bright">{post.date}</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {post.title}
            </h1>
          </div>
        </section>

        <section className="bg-paper py-16 text-slate-900">
          <article className="mx-auto max-w-2xl px-6 text-base leading-relaxed text-ink-soft [&>p]:mb-5">
            {post.content.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </article>

          <div className="mx-auto mt-12 max-w-2xl px-6">
            <div className="rounded-2xl border border-line-light bg-paper-soft p-6 text-center">
              <p className="text-sm text-ink-soft">
                Vrei rezultate similare pentru afacerea ta?
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-block rounded-lg bg-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-glow"
              >
                PROGRAMEAZĂ O DISCUȚIE
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
