"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { publicMotionAllowed } from "@/lib/public-transitions";

type DataConnection = EventTarget & { saveData?: boolean };

const nativeScrollKeys = new Set([
  "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ",
]);

/** Enhance desktop wheel scrolling without changing the public page's markup. */
export default function PublicSmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: DataConnection }).connection;
    let disposed = false;
    let importPending = false;
    let LenisConstructor: typeof Lenis | undefined;
    let instance: Lenis | undefined;

    // Release wheel inertia before the browser or Next handles a native action.
    // Do not prevent the action, replace history, or take ownership of its target.
    function handBackToBrowser() {
      if (instance?.isScrolling === "smooth") {
        instance.stop();
        instance.start();
      }
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.composedPath().some(node => node instanceof HTMLAnchorElement && node.hasAttribute("href"))) {
        handBackToBrowser();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (nativeScrollKeys.has(event.key)) handBackToBrowser();
    }

    function destroyInstance() {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("popstate", handBackToBrowser);
      window.removeEventListener("hashchange", handBackToBrowser);
      instance?.destroy();
      instance = undefined;
    }

    function reconcile() {
      if (disposed) return;
      if (!desktop.matches || !publicMotionAllowed()) {
        destroyInstance();
        return;
      }
      if (instance) return;

      if (!LenisConstructor) {
        if (importPending) return;
        importPending = true;
        void import("lenis").then(module => {
          importPending = false;
          LenisConstructor = module.default;
          reconcile();
        }).catch(() => {
          // Native scrolling remains available if the optional chunk cannot load.
          importPending = false;
        });
        return;
      }

      instance = new LenisConstructor({
        autoRaf: true,
        lerp: 0.12,
        smoothWheel: true,
        syncTouch: false,
        anchors: false,
        prevent: node => node.matches(".public-mobile-menu, input, textarea, select, [contenteditable='true'], [role='dialog']"),
      });
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKeyDown, true);
      window.addEventListener("popstate", handBackToBrowser);
      window.addEventListener("hashchange", handBackToBrowser);
    }

    desktop.addEventListener("change", reconcile);
    reduced.addEventListener("change", reconcile);
    connection?.addEventListener("change", reconcile);
    document.addEventListener("visibilitychange", reconcile);
    reconcile();

    return () => {
      disposed = true;
      desktop.removeEventListener("change", reconcile);
      reduced.removeEventListener("change", reconcile);
      connection?.removeEventListener("change", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      destroyInstance();
    };
  }, [pathname]);

  return null;
}
