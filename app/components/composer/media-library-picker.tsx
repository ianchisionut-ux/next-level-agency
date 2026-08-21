"use client";

import { useEffect, useState } from "react";

export function MediaLibraryPicker({
  workspaceId,
  onSelect,
  onClose,
}: {
  workspaceId: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/media/library?workspaceId=${workspaceId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Eroare la încărcare");
        if (!cancelled) setMedia(data.media);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Eroare la încărcare");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700">
          <div>
            <p className="text-sm font-semibold text-mist-100">Bibliotecă media</p>
            <p className="text-xs text-mist-500 mt-0.5">Fișiere folosite anterior în postări</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mist-500 hover:bg-ink-900 hover:text-mist-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M6 18 18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {loading && <p className="text-sm text-mist-500 text-center py-10">Se încarcă…</p>}
          {error && <p className="text-sm text-state-error text-center py-10">{error}</p>}
          {!loading && !error && media.length === 0 && (
            <p className="text-sm text-mist-500 text-center py-10">
              Nicio postare cu media încă. Fișierele pe care le încarci apar aici automat, gata de refolosit.
            </p>
          )}
          {!loading && media.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {media.map((url) => (
                <button
                  key={url}
                  onClick={() => onSelect(url)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-ink-600 hover:border-signal transition-colors group"
                >
                  {url.match(/\.(mp4|mov)(\?|$)/i) ? (
                    <video src={url} className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-semibold transition-opacity">
                      Folosește
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
