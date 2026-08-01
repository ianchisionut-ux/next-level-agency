import { webProjects } from "@/lib/data";

export default function WebDevelopment() {
  return (
    <section className="bg-paper py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="eyebrow text-blue">Web Development</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Site-uri pe care le-am construit
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-ink-soft">
            O parte din proiectele web dezvoltate pentru clienții noștri.
          </p>
        </div>

        {webProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-light bg-paper-soft p-10 text-center text-sm text-ink-soft">
            Adaugă primele proiecte în <code className="rounded bg-slate-100 px-1.5 py-0.5">lib/data.ts</code> → <code className="rounded bg-slate-100 px-1.5 py-0.5">webProjects</code> — apar automat aici.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {webProjects.map((project) => (
              <a
                key={project.url || project.title}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-2xl border border-line-light bg-paper-soft transition hover:-translate-y-1 hover:border-blue/40 hover:shadow-lg hover:shadow-blue/10"
              >
                <div className="aspect-video overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between p-5">
                  <p className="font-bold text-slate-900">{project.title}</p>
                  <span className="text-sm font-semibold text-blue">Vezi site-ul →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
