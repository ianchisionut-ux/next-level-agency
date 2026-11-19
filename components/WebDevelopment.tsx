import { webProjects } from "@/lib/data";
import Image from "next/image";
import ProjectPreview from "@/components/ProjectPreview";

export default function WebDevelopment() {
  return (
    <section className="nl-work-showcase bg-paper py-20 text-slate-900" aria-labelledby="work-title">
      <div className="mx-auto max-w-7xl px-6">
        <div className="nl-work-heading mb-12">
          <p className="nl-eyebrow">Proiecte digitale. Experiențe reale.</p>
          <h2 id="work-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Site-uri pe care le-am construit
          </h2>
          <p className="mt-3 max-w-xl text-base text-ink-soft">
            O parte din proiectele web dezvoltate pentru clienții noștri.
          </p>
        </div>

        {webProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-light bg-paper-soft p-10 text-center text-sm text-ink-soft">
            Selecția de proiecte web este în curs de actualizare.
          </div>
        ) : (
          <div className="nl-work-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {webProjects.map((project, index) => (
              <ProjectPreview
                key={project.url || project.title}
                url={project.url}
                title={project.title}
                thumbnail={<Image
                  src={project.thumbnail}
                  alt={`Site-ul ${project.title}`}
                  fill
                  sizes={`(min-width: 1024px) ${index < 2 ? 640 : 400}px, (min-width: 640px) 50vw, 100vw`}
                  className={`h-full w-full object-cover motion-safe:transition motion-safe:duration-300 ${project.previewCrop ? "scale-[1.35] object-center motion-safe:group-hover:scale-[1.39]" : "object-top motion-safe:group-hover:scale-105"}`}
                />}
              >
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 p-5">
                  <h3 className="font-bold text-slate-900">{project.title}</h3>
                  <span className="text-sm font-semibold text-blue">Vezi site-ul →</span>
                </a>
              </ProjectPreview>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
