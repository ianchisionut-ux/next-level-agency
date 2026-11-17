"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const reveal = () => {
      observer?.disconnect();
      element.querySelectorAll("[data-reveal]").forEach(item => item.classList.remove("nl-revealed"));
      if (media.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add("nl-revealed"); observer?.unobserve(entry.target); }
        });
      }, { threshold: 0.12 });
      element.querySelectorAll("[data-reveal]").forEach(item => observer?.observe(item));
    };
    const move = (event: PointerEvent) => {
      if (media.matches || !finePointer.matches || event.pointerType === "touch") return;
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
    const resetMotion = () => { reveal(); element.querySelectorAll<HTMLElement>("[data-magnetic], [data-tilt]").forEach(item => item.style.removeProperty("transform")); };
    reveal();
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerout", reset, { passive: true });
    media.addEventListener("change", resetMotion);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); element.removeEventListener("pointermove", move); element.removeEventListener("pointerout", reset); media.removeEventListener("change", resetMotion); };
  }, []);
  return <div ref={root} className="nl-landing">{children}</div>;
}
