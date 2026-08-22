"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  // Esc inchide modalul; blocam scroll-ul paginii din spate cat timp e deschis.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-10 sm:items-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${maxWidth} rounded-2xl border border-ink-700 bg-ink-800 shadow-floating`}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="Închide"
          className="absolute right-3.5 top-3.5 z-10 rounded-lg p-1.5 text-mist-500 transition-colors hover:bg-ink-700 hover:text-mist-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
