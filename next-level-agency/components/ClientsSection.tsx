import { clients } from "@/lib/data";

export default function ClientsSection() {
  return (
    <section className="bg-paper py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="eyebrow text-blue">Parteneri</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            OUR CLIENTS
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-soft">
            Branduri alături de care construim rezultate. Click pe orice logo
            pentru a vizita site-ul partenerului.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {clients.map((client) => (
            <a
              key={client.name}
              href={client.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-line-light bg-paper-soft p-6 transition hover:-translate-y-1 hover:border-blue/40 hover:shadow-lg hover:shadow-blue/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={client.logo}
                alt={client.name}
                className="h-10 w-full object-contain grayscale transition group-hover:grayscale-0"
              />
              <span className="text-xs font-semibold text-ink-soft group-hover:text-slate-900">
                {client.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
