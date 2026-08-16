import Header from "./Header";
import Footer from "./Footer";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>
        <section className="bg-navy py-16 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-xs text-white/40">Ultima actualizare: {updated}</p>
          </div>
        </section>

        <section className="bg-paper py-16 text-slate-900">
          <div className="prose-legal mx-auto max-w-3xl px-6 text-sm leading-relaxed text-ink-soft [&>h2]:mt-10 [&>h2]:mb-3 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-slate-900 [&>p]:mb-4 [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>li]:mb-1.5 [&>strong]:text-slate-900">
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
