import { clients } from "@/lib/data";
import Image from "next/image";

export default function ClientsSection() {
  return (
    <section className="client-showcase bg-paper py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Clienții noștri cu rezultate de top
          </h2>
          <p className="mt-3 max-w-xl text-base text-ink-soft">
            Ei au ajuns deja la rezultatele dorite și se îndreaptă spre nivelul următor
          </p>
        </div>

        <div className="grid grid-cols-2 items-center gap-x-10 gap-y-16 sm:grid-cols-3 lg:grid-cols-4">
          {clients.map((client) => (
            <a
              key={client.name}
              href={client.url}
              target="_blank"
              rel="noopener noreferrer"
              className="client-logo-tile group flex items-center justify-center transition hover:-translate-y-0.5"
              aria-label={client.name}
            >
              <div className="relative h-24 w-full sm:h-32 lg:h-40">
                <Image src={client.logo} alt={client.name} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 30vw, 45vw" className="object-contain" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
