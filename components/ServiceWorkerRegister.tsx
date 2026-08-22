"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Doar in productie - in dev, un SW cu cache poate servi cod vechi si
    // deruta la fiecare modificare.
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Inregistrarea service worker-ului a eșuat:", err);
    });
  }, []);

  return null;
}
