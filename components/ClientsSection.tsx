import { clients } from "@/lib/data";
import Image from "next/image";

export default function ClientsSection() {
  return (
    <section className="client-showcase bg-paper py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Clienți și proiecte Next Level
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-ink-soft">
            O selecție de branduri din proiectele noastre.
          </p>
        </div>

        <div className="grid grid-cols-2 items-center gap-x-10 gap-y-16 sm:grid-cols-3 lg:grid-cols-5">
          {clients.map((client) => {
            const logo = <div className="relative h-24 w-full sm:h-32 lg:h-40"><Image src={client.logo} alt={client.name} fill sizes="(min-width: 1280px) 180px, (min-width: 1024px) calc((100vw - 388px) / 5), (min-width: 640px) calc((100vw - 236px) / 3), calc((100vw - 160px) / 2)" className="object-contain" /></div>;
            return client.url && client.url !== "#" ? <a
              key={client.name}
              href={client.url}
              target="_blank"
              rel="noopener noreferrer"
              className="client-logo-tile group flex items-center justify-center transition hover:-translate-y-0.5"
              aria-label={client.name}
            >
              {logo}
            </a>
            : <div key={client.name} className="client-logo-tile flex items-center justify-center">{logo}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
