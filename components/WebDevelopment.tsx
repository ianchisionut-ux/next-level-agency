import { webProjects } from "@/lib/data";
import Image from "next/image";
import ProjectPreview from "@/components/ProjectPreview";

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
            Selecția de proiecte web este în curs de actualizare.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {webProjects.map((project) => (
              <ProjectPreview
                key={project.url || project.title}
                url={project.url}
                title={project.title}
                thumbnail={<Image
                  src={project.thumbnail}
                  alt={`Site-ul ${project.title}`}
                  fill
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
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
