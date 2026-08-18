import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact | Next Level Advertising Agency",
  description: "Hai să discutăm despre proiectul tău. Telefon, WhatsApp, email și locație.",
};

export default function ContactPage() {
  const waHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`;

  return (
    <>
      <Header />
      <main>
        {/* HERO — dark */}
        <section className="grain bg-navy py-20 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <p className="eyebrow text-blue-bright">Contact</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Hai să discutăm despre afacerea ta
            </h1>
            <p className="mt-5 text-base text-white/60">
              Completează un mesaj, sună-ne sau scrie-ne direct pe WhatsApp —
              răspundem de obicei în câteva ore.
            </p>
          </div>
        </section>

        {/* CONTACT CARDS — light */}
        <section className="bg-paper py-20 text-slate-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border-2 border-blue bg-paper-soft p-8 text-center shadow-lg shadow-blue/10 transition hover:-translate-y-1"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-blue">WhatsApp</p>
                <p className="mt-2 text-lg font-extrabold">Scrie-ne acum</p>
                <p className="mt-1 text-sm text-ink-soft">{siteConfig.phone}</p>
                <span className="mt-5 inline-block rounded-lg bg-blue px-5 py-2.5 text-sm font-bold text-white">
                  Deschide WhatsApp
                </span>
              </a>

              <a
                href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                className="rounded-2xl border border-line-light bg-paper-soft p-8 text-center transition hover:-translate-y-1 hover:border-blue/40"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Telefon</p>
                <p className="mt-2 text-lg font-extrabold">Sună-ne direct</p>
                <p className="mt-1 text-sm text-ink-soft">{siteConfig.phone}</p>
                <span className="mt-5 inline-block rounded-lg border border-line-light px-5 py-2.5 text-sm font-bold">
                  Apelează
                </span>
              </a>

              <a
                href={`mailto:${siteConfig.email}`}
                className="rounded-2xl border border-line-light bg-paper-soft p-8 text-center transition hover:-translate-y-1 hover:border-blue/40"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Email</p>
                <p className="mt-2 text-lg font-extrabold">Trimite un mesaj</p>
                <p className="mt-1 text-sm text-ink-soft">{siteConfig.email}</p>
                <span className="mt-5 inline-block rounded-lg border border-line-light px-5 py-2.5 text-sm font-bold">
                  Scrie un email
                </span>
              </a>
            </div>

            {/* Simple contact form (mailto fallback - no backend/admin) */}
            <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2">
              <div className="rounded-2xl border border-line-light bg-paper-soft p-8">
                <h2 className="text-xl font-extrabold">Trimite-ne un mesaj</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Formularul deschide clientul tău de email cu mesajul precompletat.
                </p>
                <form
                  action={`mailto:${siteConfig.email}`}
                  method="post"
                  encType="text/plain"
                  className="mt-6 space-y-4"
                >
                  <input
                    name="Nume"
                    placeholder="Numele tău"
                    required
                    className="w-full rounded-lg border border-line-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
                  />
                  <input
                    name="Email"
                    type="email"
                    placeholder="Adresa de email"
                    required
                    className="w-full rounded-lg border border-line-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
                  />
                  <textarea
                    name="Mesaj"
                    placeholder="Spune-ne despre proiectul tău"
                    rows={5}
                    required
                    className="w-full rounded-lg border border-line-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-glow"
                  >
                    TRIMITE MESAJUL
                  </button>
                </form>
              </div>

              <div className="overflow-hidden rounded-2xl border border-line-light">
                <iframe
                  title="Locație Next Level Advertising Agency"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address)}&output=embed`}
                  className="h-full min-h-[380px] w-full"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
