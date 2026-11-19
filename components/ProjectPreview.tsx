"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

const PREVIEW_URLS = new Set(["https://www.pmcustoms.us", "https://www.draculasoil.com", "https://www.pro-bloc-manager.ro/"]);
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const INTENT_DELAY = 350;

export function projectPreviewUrl(url: string): string | null {
  return PREVIEW_URLS.has(url) ? url : null;
}

type PreviewPolicy = { allowed: boolean; automatic: boolean; visible: boolean; pageVisible: boolean };
type ActivePreview = { id: string; sequence: number; explicit: boolean };
type PreviewClock = { set: (callback: () => void, delay: number) => unknown; clear: (timer: unknown) => void };

/** One iframe and one pending intent for the whole page, including separate grids. */
export function createProjectPreviewCoordinator(clock: PreviewClock = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
}) {
  const policies = new Map<string, PreviewPolicy>();
  const listeners = new Set<() => void>();
  let active: ActivePreview | null = null;
  let pending: { id: string; request: number; timer: unknown } | null = null;
  let sequence = 0;
  let request = 0;
  const notify = () => listeners.forEach(listener => listener());
  const cancelPending = () => {
    if (pending) clock.clear(pending.timer);
    pending = null;
  };
  const release = (id: string) => {
    if (pending?.id === id) cancelPending();
    if (active?.id === id) { active = null; notify(); }
  };
  const eligible = (id: string, explicit: boolean) => {
    const policy = policies.get(id);
    return Boolean(policy?.allowed && policy.visible && policy.pageVisible && (explicit || policy.automatic));
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => active,
    update(id: string, policy: PreviewPolicy) {
      policies.set(id, policy);
      if (!eligible(id, true)) release(id);
      else if (!policy.automatic) {
        if (pending?.id === id) cancelPending();
        if (active?.id === id && !active.explicit) release(id);
      }
    },
    request(id: string, explicit = false) {
      if (!eligible(id, explicit)) return false;
      if (active?.id === id) return true;
      if (pending?.id === id && !explicit) return true;
      cancelPending();
      if (explicit) { active = { id, sequence: ++sequence, explicit }; notify(); return true; }
      const currentRequest = ++request;
      const timer = clock.set(() => {
        if (pending?.request !== currentRequest || pending.id !== id) return;
        pending = null;
        if (!eligible(id, false)) return;
        active = { id, sequence: ++sequence, explicit: false };
        notify();
      }, INTENT_DELAY);
      pending = { id, request: currentRequest, timer };
      return true;
    },
    release,
    remove(id: string) { release(id); policies.delete(id); },
  };
}

const previews = createProjectPreviewCoordinator();
const serverSnapshot = () => null;

export default function ProjectPreview({ url, title, thumbnail, children }: {
  url: string;
  title: string;
  thumbnail: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const refreshVisibility = useRef<((rectangle?: DOMRect) => void) | null>(null);
  const previewUrl = projectPreviewUrl(url);
  const selected = useSyncExternalStore(previews.subscribe, previews.getSnapshot, serverSnapshot);
  const active = selected?.id === id ? selected : null;
  const [geometry, setGeometry] = useState<{ sequence: number; scale: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [loadedSequence, setLoadedSequence] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const loaded = Boolean(active && loadedSequence === active.sequence);
  const scale = active && geometry?.sequence === active.sequence ? geometry.scale : 0;

  useEffect(() => {
    const element = viewport.current;
    if (!element || !previewUrl) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: {
      saveData?: boolean;
      addEventListener?: (name: string, listener: () => void) => void;
      removeEventListener?: (name: string, listener: () => void) => void;
    } }).connection;
    let visible = false;
    const policy = () => previews.update(id, {
      allowed: true,
      automatic: fine.matches && !reduced.matches && !connection?.saveData,
      visible,
      pageVisible: !document.hidden,
    });
    const checkVisibility = (measured?: DOMRect) => {
      const rectangle = measured ?? element.getBoundingClientRect();
      visible = rectangle.width > 0 && rectangle.height > 0 && rectangle.bottom > 0 && rectangle.top < window.innerHeight && rectangle.right > 0 && rectangle.left < window.innerWidth;
      policy();
    };
    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      policy();
    });
    refreshVisibility.current = intersection ? null : checkVisibility;
    policy();
    intersection?.observe(element);
    fine.addEventListener("change", policy);
    reduced.addEventListener("change", policy);
    connection?.addEventListener?.("change", policy);
    document.addEventListener("visibilitychange", policy);
    setReady(true);
    return () => {
      intersection?.disconnect();
      refreshVisibility.current = null;
      fine.removeEventListener("change", policy);
      reduced.removeEventListener("change", policy);
      connection?.removeEventListener?.("change", policy);
      document.removeEventListener("visibilitychange", policy);
      previews.remove(id);
    };
  }, [id, previewUrl]);

  useEffect(() => {
    const element = viewport.current;
    if (!active || !element || !previewUrl) return;
    const updateScale = (width: number) => {
      const next = { sequence: active.sequence, scale: Math.max(0, width) / VIEWPORT_WIDTH };
      setGeometry(current => current?.sequence === next.sequence && current.scale === next.scale ? current : next);
    };
    const measure = () => {
      const rectangle = element.getBoundingClientRect();
      updateScale(rectangle.width);
      refreshVisibility.current?.(rectangle);
    };
    measure();
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(entries => {
      const entry = entries.find(item => item.target === element);
      if (entry) updateScale(entry.contentRect.width);
      refreshVisibility.current?.();
    });
    resize?.observe(element);
    // IO normally handles visibility; older browsers need checks only while active.
    if (!resize || refreshVisibility.current) window.addEventListener("resize", measure);
    if (refreshVisibility.current) window.addEventListener("scroll", measure, { passive: true });
    return () => {
      resize?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [active, previewUrl]);

  useEffect(() => {
    if (!active || loaded) return;
    const sequence = active.sequence;
    const timer = window.setTimeout(() => {
      if (previews.getSnapshot()?.id !== id || previews.getSnapshot()?.sequence !== sequence) return;
      previews.release(id);
      setFailed(true);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [active, id, loaded]);

  const requestAutomatic = () => { if (!failed) { refreshVisibility.current?.(); previews.request(id); } };
  const stop = () => previews.release(id);

  return (
    <article
      className="nl-project-card group overflow-hidden rounded-2xl border border-line-light bg-paper-soft motion-safe:transition hover:border-blue/40 hover:shadow-lg hover:shadow-blue/10 motion-safe:hover:-translate-y-1"
      onPointerEnter={event => { if (event.pointerType === "mouse") requestAutomatic(); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") stop(); }}
      onFocus={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) requestAutomatic(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stop(); }}
      onKeyDown={event => { if (event.key === "Escape") stop(); }}
    >
      <div ref={viewport} id={`preview-${id}`} className="relative aspect-video overflow-hidden bg-slate-950">
        {thumbnail}
        {active && previewUrl && scale > 0 && <iframe
          key={active.sequence}
          src={previewUrl}
          title={`Previzualizare ${title}`}
          width={VIEWPORT_WIDTH}
          height={VIEWPORT_HEIGHT}
          tabIndex={-1}
          aria-hidden="true"
          sandbox="allow-scripts allow-same-origin"
          allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; autoplay 'none'; fullscreen 'none'; clipboard-read 'none'; clipboard-write 'none'"
          referrerPolicy="no-referrer"
          className="absolute left-0 top-0 border-0"
          style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, maxWidth: "none", transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none", opacity: loaded ? 1 : 0 }}
          onLoad={() => { if (previews.getSnapshot() === active) setLoadedSequence(active.sequence); }}
          onError={() => { if (previews.getSnapshot() === active) { stop(); setFailed(true); } }}
        />}
        {active && <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-950/90 px-3 py-1 text-xs font-semibold text-[#ffffff]" role="status">{loaded ? "● Live" : "Se încarcă previzualizarea…"}</span>}
      </div>
      {children}
      <div className="px-5 pb-4">
        {previewUrl ? <>
          <button
            type="button"
            disabled={!ready}
            aria-controls={`preview-${id}`}
            aria-pressed={Boolean(active)}
            aria-label={`${active ? "Oprește previzualizarea" : "Previzualizare live"}: ${title}`}
            onClick={() => { if (active) stop(); else { setFailed(false); refreshVisibility.current?.(); previews.request(id, true); } }}
            className="rounded-lg border border-line-light px-3 py-2 text-sm font-semibold text-blue hover:border-blue/50 disabled:opacity-50"
          >{active ? "Oprește previzualizarea" : "Previzualizare live"}</button>
          {failed && <p className="mt-2 text-xs leading-relaxed text-ink-soft" role="status">Previzualizarea nu este disponibilă. Explorează site-ul într-o filă nouă.</p>}
        </> : <p className="text-xs text-ink-soft">Explorează site-ul într-o filă nouă.</p>}
      </div>
    </article>
  );
}
