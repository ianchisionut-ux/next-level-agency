import { workVideos } from "@/lib/data";

export default function OurWork() {
  return (
    <section className="bg-paper py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Our Work
          </h2>
          <p className="mt-3 max-w-xl text-base text-ink-soft">
            O parte din conținutul video creat pentru brandurile cu care lucrăm.
          </p>
        </div>

        {workVideos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-light bg-paper-soft p-10 text-center text-sm text-ink-soft">
            Adaugă primele videoclipuri în <code className="rounded bg-slate-100 px-1.5 py-0.5">lib/data.ts</code> → <code className="rounded bg-slate-100 px-1.5 py-0.5">workVideos</code> — apar automat aici.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {workVideos.map((video) => (
              <div key={video.embedUrl} className="group">
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-line-light bg-black shadow-sm">
                  <iframe
                    src={video.embedUrl}
                    className="absolute inset-0 h-full w-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                    allowFullScreen
                    loading="lazy"
                    title={video.title}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {video.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
