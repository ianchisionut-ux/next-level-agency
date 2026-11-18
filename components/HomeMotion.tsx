"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function landingMotionEnabled({ compact, finePointer, reduced, saveData }: {
  compact: boolean; finePointer: boolean; reduced: boolean; saveData: boolean;
}) {
  return !compact && finePointer && !reduced && !saveData;
}

export default function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const previousDocumentMotion = document.documentElement.dataset.landingMotion;
    let frame = 0;
    let active = false;
    let observer: IntersectionObserver | undefined;
    const move = (event: PointerEvent) => {
      if (!active || event.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-spotlight], [data-magnetic], [data-tilt]") : null;
      if (!target || !element.contains(target)) return;
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        target.style.setProperty("--pointer-x", `${x}px`);
        target.style.setProperty("--pointer-y", `${y}px`);
        if (target.hasAttribute("data-magnetic")) target.style.transform = `translate(${(x / rect.width - 0.5) * 7}px, ${(y / rect.height - 0.5) * 7}px)`;
        if (target.hasAttribute("data-tilt")) target.style.transform = `perspective(1100px) rotateX(${(0.5 - y / rect.height) * 5}deg) rotateY(${(x / rect.width - 0.5) * 5}deg)`;
      });
    };
    const reset = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-magnetic], [data-tilt]");
      if (target && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) { cancelAnimationFrame(frame); target.style.removeProperty("transform"); }
    };
    const stop = () => {
      observer?.disconnect();
      observer = undefined;
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerout", reset);
      if (active) {
        element.querySelectorAll("[data-reveal]").forEach(item => item.classList.remove("nl-revealed"));
        element.querySelectorAll<HTMLElement>("[data-magnetic], [data-tilt]").forEach(item => item.style.removeProperty("transform"));
      }
    };
    const update = () => {
      const enabled = !document.hidden && landingMotionEnabled({ compact: compact.matches, finePointer: finePointer.matches, reduced: media.matches, saveData: Boolean(connection?.saveData) });
      element.dataset.motion = enabled ? "full" : "static";
      // Includes the floating contact button, which is outside this wrapper.
      document.documentElement.dataset.landingMotion = element.dataset.motion;
      if (enabled === active) return;
      stop();
      active = enabled;
      if (!enabled) return;
      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add("nl-revealed"); observer?.unobserve(entry.target); }
          });
        }, { threshold: 0.12 });
        element.querySelectorAll("[data-reveal]").forEach(item => observer?.observe(item));
      }
      element.addEventListener("pointermove", move, { passive: true });
      element.addEventListener("pointerout", reset, { passive: true });
    };
    update();
    const queries = [media, compact, finePointer];
    queries.forEach(query => query.addEventListener("change", update));
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      stop();
      queries.forEach(query => query.removeEventListener("change", update));
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      if (previousDocumentMotion === undefined) delete document.documentElement.dataset.landingMotion;
      else document.documentElement.dataset.landingMotion = previousDocumentMotion;
    };
  }, []);
  return <div ref={root} className="nl-landing" data-motion="static">{children}</div>;
}
