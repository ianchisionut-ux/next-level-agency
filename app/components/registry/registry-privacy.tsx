"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

export function RegistryPrivacy({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(window.localStorage.getItem("registry-private") === "true");
  }, []);

  function togglePrivacy() {
    setHidden((value) => {
      const next = !value;
      window.localStorage.setItem("registry-private", String(next));
      return next;
    });
  }

  return (
    <div className="space-y-6 registry-privacy" data-private={hidden}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={togglePrivacy}
          aria-pressed={hidden}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-xs font-semibold text-mist-500 transition-colors hover:border-signal hover:text-signal"
          title={hidden ? "Afișează denumirile și sumele" : "Ascunde denumirile și sumele"}
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          {hidden ? "Date ascunse" : "Ascunde datele"}
        </button>
      </div>
      {children}
    </div>
  );
}