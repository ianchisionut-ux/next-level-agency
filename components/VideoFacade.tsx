"use client";

import Image from "next/image";
import { useState } from "react";
import type { WorkVideo } from "@/lib/data";

/** Keep the public preview local; connect to the video provider on Play. */
export default function VideoFacade({ video }: { video: WorkVideo }) {
  const [playing, setPlaying] = useState(false);
  const source = new URL(video.embedUrl);
  const valid = source.protocol === "https:" && source.hostname === "player.vimeo.com" && /^\/video\/\d+$/.test(source.pathname);
  source.searchParams.set("autoplay", "1");
  source.searchParams.set("autopause", "1");
  source.searchParams.set("dnt", "1");

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-line-light bg-slate-950 shadow-sm">
      {playing && valid ? (
        <iframe
          src={source.toString()}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={`Videoclip: ${video.title}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          disabled={!valid}
          aria-label={`Redă videoclipul: ${video.title}`}
          className="group absolute inset-0 block h-full w-full cursor-pointer text-[#ffffff] focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-cyan-300"
        >
          <Image src={video.poster} alt="" fill sizes="(min-width: 1024px) 290px, (min-width: 640px) 30vw, 45vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" aria-hidden="true" />
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true"><span className="grid h-14 w-14 place-items-center rounded-full border border-[#ffffff]/70 bg-slate-950/65 shadow-lg transition-transform group-hover:scale-110"><svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span></span>
          <span className="absolute inset-x-3 bottom-5 text-center text-xs font-semibold">Redă videoclipul</span>
        </button>
      )}
    </div>
  );
}
