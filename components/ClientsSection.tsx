import { clients } from "@/lib/data";

export default function ClientsSection() {
  return (
    <section className="bg-paper py-20 text-slate-900">
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
              className="group flex items-center justify-center transition hover:-translate-y-0.5"
              aria-label={client.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={client.logo}
                alt={client.name}
                className="h-24 w-auto max-w-full object-contain sm:h-32 lg:h-40"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
