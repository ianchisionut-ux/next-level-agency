"use client";

import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Fețe & Reacții",
    emojis: ["😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "😇", "🙌", "👏", "🔥", "✨", "💯", "🎉", "🎊", "👍", "❤️", "💙"],
  },
  {
    label: "Business",
    emojis: ["🚀", "📈", "📊", "💡", "🎯", "✅", "⭐", "🏆", "💼", "📢", "🔔", "📌", "🆕", "🔑", "💰", "🤝", "👇", "👉", "➡️", "✔️"],
  },
  {
    label: "Obiecte",
    emojis: ["📱", "💻", "🎬", "📷", "🎨", "🛍️", "🎁", "🏷️", "📦", "🕐", "📅", "📍", "🌟", "☀️", "🌙", "☕", "🍕", "🎵", "🌈", "🌸"],
  },
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Adaugă emoji"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-600 text-base hover:border-signal hover:bg-signal-soft transition-colors"
      >
        🙂
      </button>

      {open && (
        <div className="glass-card absolute bottom-full left-0 mb-2 w-72 max-w-[85vw] rounded-2xl p-3 z-30 shadow-floating">
          <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-mist-500 mb-1.5">
                  {cat.label}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onSelect(emoji);
                        setOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-signal-soft transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
