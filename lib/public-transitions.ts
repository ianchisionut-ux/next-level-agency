"use client";

import { startTransition, useSyncExternalStore } from "react";

type DataConnection = EventTarget & { saveData?: boolean };
const connection = () => (navigator as Navigator & { connection?: DataConnection }).connection;

export function publicMotionAllowed() {
  return typeof window !== "undefined" && !document.hidden
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    && !connection()?.saveData;
}

function subscribe(onChange: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const network = connection();
  reduced.addEventListener("change", onChange);
  network?.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    reduced.removeEventListener("change", onChange);
    network?.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function usePublicMotion() {
  return useSyncExternalStore(subscribe, publicMotionAllowed, () => false);
}

/** React owns the browser transition; navigation and state semantics stay native. */
export function startPublicTransition(update: () => void) {
  if (publicMotionAllowed()) startTransition(update);
  else update();
}
