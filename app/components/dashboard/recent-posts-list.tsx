"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { PlatformKey } from "@/lib/platform-meta";

export interface RecentPost {
  id: string;
  title: string | null;
  status: string;
  scheduledAt: string | null;
  variants: { id: string; platform: string; content: string }[];
}

export function RecentPostsList({
  posts,
  accountsCount,
}: {
  posts: RecentPost[];
  accountsCount: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(posts);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, postId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Sigur vrei să ștergi această postare? Nu poate fi anulat.")) return;

    setDeletingId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la ștergere");
      setItems((prev) => prev.filter((p) => p.id !== postId));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Eroare la ștergere");
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        {accountsCount === 0 ? (
          <>
            <p className="text-mist-500 text-sm">
              Ai nevoie de cel puțin un cont conectat înainte să poți programa o postare.
            </p>
            <Link
              href="/dashboard/accounts"
              className="inline-block mt-3 text-signal-bright text-sm font-medium hover:underline"
            >
              Conectează primul cont →
            </Link>
          </>
        ) : (
          <>
            <p className="text-mist-500 text-sm">Nicio postare încă. Prima ta postare durează două minute.</p>
            <Link
              href="/dashboard/compose"
              className="inline-block mt-3 text-signal-bright text-sm font-medium hover:underline"
            >
              Creează prima postare →
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {items.map((post) => {
        const canDelete = post.status !== "PUBLISHED" && post.status !== "PUBLISHING";
        return (
          <Link
            key={post.id}
            href={`/dashboard/posts/${post.id}`}
            className="px-4 py-3 flex items-center justify-between hover:bg-ink-900/50 transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {post.title || post.variants[0]?.content.slice(0, 60) || "(fără conținut)"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {post.variants.map((v) => (
                  <PlatformIcon key={v.id} platform={v.platform as PlatformKey} size={13} />
                ))}
                <span className="text-xs text-mist-500 font-mono ml-1">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "fără programare"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={post.status} />

              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, post.id)}
                  disabled={deletingId === post.id}
                  aria-label="Șterge"
                  className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-mist-500 hover:text-state-error hover:bg-ink-700 transition disabled:opacity-50"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path
                      d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </Link>
        );
      })}
    </>
  );
}
