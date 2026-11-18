import { workVideos } from "@/lib/data";
import VideoFacade from "@/components/VideoFacade";

export default function OurWork() {
  return (
    <section className="bg-paper py-20 text-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Conținut video pentru branduri
          </h2>
          <p className="mt-3 max-w-xl text-base text-ink-soft">
            O parte din conținutul video creat pentru brandurile cu care lucrăm.
          </p>
        </div>

        {workVideos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-light bg-paper-soft p-10 text-center text-sm text-ink-soft">
            Selecția de proiecte video este în curs de actualizare.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {workVideos.map((video) => (
              <div key={video.embedUrl} className="group">
                <VideoFacade video={video} />
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
