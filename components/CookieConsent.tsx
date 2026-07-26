"use client";

import { useEffect, useState } from "react";

type Prefs = {
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "nl-cookie-consent";

function readPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage indisponibil (ex. mod privat) - ignorăm silențios.
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ analytics: false, marketing: false });

  useEffect(() => {
    const existing = readPrefs();
    if (!existing) {
      setVisible(true);
    } else {
      setPrefs(existing);
    }

    const openHandler = () => setSettingsOpen(true);
    window.addEventListener("open-cookie-settings", openHandler);
    return () => window.removeEventListener("open-cookie-settings", openHandler);
  }, []);

  function acceptAll() {
    const next = { analytics: true, marketing: true };
    savePrefs(next);
    setPrefs(next);
    setVisible(false);
    setSettingsOpen(false);
  }

  function rejectAll() {
    const next = { analytics: false, marketing: false };
    savePrefs(next);
    setPrefs(next);
    setVisible(false);
    setSettingsOpen(false);
  }

  function saveCustom() {
    savePrefs(prefs);
    setVisible(false);
    setSettingsOpen(false);
  }

  return (
    <>
      {visible && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-ink/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-5 sm:flex-row sm:justify-between">
            <p className="text-xs leading-relaxed text-white/60 sm:max-w-xl">
              Folosim cookie-uri necesare pentru funcționarea site-ului și,
              opțional, cookie-uri de analiză și marketing. Vezi{" "}
              <a href="/politica-de-cookies" className="text-blue-bright underline">
                Politica de Cookies
              </a>
              .
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white/40"
              >
                Setări
              </button>
              <button
                onClick={rejectAll}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white/40"
              >
                Respinge
              </button>
              <button
                onClick={acceptAll}
                className="rounded-lg bg-blue px-4 py-2 text-xs font-bold text-white hover:bg-blue-glow"
              >
                Acceptă tot
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900">
            <h2 className="text-lg font-extrabold">Setări Cookies</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Alege ce categorii de cookie-uri accepți. Cele necesare rămân
              mereu active — fără ele site-ul nu funcționează corect.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-line-light p-3">
                <div>
                  <p className="text-sm font-semibold">Necesare</p>
                  <p className="text-xs text-ink-soft">Mereu active</p>
                </div>
                <input type="checkbox" checked disabled className="h-4 w-4" />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-line-light p-3">
                <div>
                  <p className="text-sm font-semibold">Analitice</p>
                  <p className="text-xs text-ink-soft">Ne ajută să înțelegem traficul</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-line-light p-3">
                <div>
                  <p className="text-sm font-semibold">Marketing</p>
                  <p className="text-xs text-ink-soft">Măsurarea campaniilor</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg border border-line-light px-4 py-2 text-xs font-semibold"
              >
                Închide
              </button>
              <button
                onClick={saveCustom}
                className="rounded-lg bg-blue px-4 py-2 text-xs font-bold text-white hover:bg-blue-glow"
              >
                Salvează preferințele
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
