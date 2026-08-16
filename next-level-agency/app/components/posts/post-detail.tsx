"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export interface DetailVariant {
  id: string;
  platform: PlatformKey;
  content: string;
  mediaUrls: string[];
  status: string;
  errorLog: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  accountName: string;
}

export interface DetailPost {
  id: string;
  status: string;
  scheduledAt: string | null;
  variants: DetailVariant[];
}

const EDITABLE_STATUSES = ["DRAFT", "SCHEDULED"];

export function PostDetail({ post: initialPost }: { post: DetailPost }) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(post.variants.map((v) => [v.id, v.content]))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = EDITABLE_STATUSES.includes(post.status);

  async function saveEdits() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variants: post.variants.map((v) => ({
            id: v.id,
            content: drafts[v.id],
            mediaUrls: v.mediaUrls,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la salvare");
      setPost({
        ...post,
        variants: post.variants.map((v) => ({ ...v, content: drafts[v.id], status: "PENDING", errorLog: null })),
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!confirm("Sigur vrei să ștergi această postare? Nu poate fi anulat.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Eroare la ștergere");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la ștergere");
      setDeleting(false);
    }
  }

  async function retryVariant(variantId: string) {
    setRetrying(variantId);
    try {
      const res = await fetch(`/api/posts/${post.id}/variants/${variantId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Eroare la reîncercare");
      setPost({
        ...post,
        status: "SCHEDULED",
        variants: post.variants.map((v) =>
          v.id === variantId ? { ...v, status: "PENDING", errorLog: null } : v
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la reîncercare");
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-semibold">Detalii postare</h1>
            <StatusBadge status={post.status} />
          </div>
          <p className="text-sm text-mist-500">
            {post.scheduledAt
              ? `Programată pentru ${new Date(post.scheduledAt).toLocaleString("ro-RO")}`
              : "Fără programare"}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-ink-600 hover:border-ink-500 text-mist-100 text-sm px-3 py-2 transition-colors"
            >
              Editează
            </button>
          )}
          {canEdit && (
            <button
              onClick={deletePost}
              disabled={deleting}
              className="rounded-lg border border-state-error/30 text-state-error hover:bg-state-error/10 text-sm px-3 py-2 transition-colors disabled:opacity-50"
            >
              {deleting ? "Se șterge…" : "Șterge"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-3 text-sm text-state-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {post.variants.map((variant) => {
          const meta = PLATFORM_META[variant.platform];
          return (
            <div key={variant.id} className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={variant.platform} size={18} />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-xs text-mist-500">· {variant.accountName}</span>
                </div>
                <StatusBadge status={variant.status} />
              </div>

              {editing ? (
                <textarea
                  value={drafts[variant.id]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [variant.id]: e.target.value }))}
                  rows={4}
                  className="w-full bg-ink-900 border border-ink-600 rounded-xl p-3 text-sm text-mist-100 focus:border-signal outline-none resize-none"
                />
              ) : (
                <p className="text-sm text-mist-300 whitespace-pre-wrap">{variant.content}</p>
              )}

              {variant.mediaUrls.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {variant.mediaUrls.map((url) => (
                    <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {variant.status === "FAILED" && variant.errorLog && (
                <div className="mt-3 rounded-lg bg-state-error/10 border border-state-error/30 px-3 py-2">
                  <p className="text-xs text-state-error">{variant.errorLog}</p>
                  <button
                    onClick={() => retryVariant(variant.id)}
                    disabled={retrying === variant.id}
                    className="text-xs text-signal-bright font-medium hover:underline mt-1.5 disabled:opacity-50"
                  >
                    {retrying === variant.id ? "Se reîncearcă…" : "Reîncearcă publicarea"}
                  </button>
                </div>
              )}

              {variant.status === "PUBLISHED" && variant.publishedAt && (
                <p className="text-xs text-mist-500 mt-2">
                  Publicat {new Date(variant.publishedAt).toLocaleString("ro-RO")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditing(false);
              setDrafts(Object.fromEntries(post.variants.map((v) => [v.id, v.content])));
            }}
            className="flex-1 rounded-xl border border-ink-600 hover:border-ink-500 text-mist-100 text-sm font-medium py-3 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={saveEdits}
            disabled={saving}
            className="flex-1 rounded-xl bg-signal hover:bg-signal-bright text-white text-sm font-medium py-3 transition-colors disabled:opacity-50"
          >
            {saving ? "Se salvează…" : "Salvează modificările"}
          </button>
        </div>
      )}
    </div>
  );
}
