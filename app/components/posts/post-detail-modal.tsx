"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/app/components/ui/modal";
import { PostDetail, DetailPost } from "@/app/components/posts/post-detail";

export function PostDetailModal({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const [post, setPost] = useState<DetailPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setPost(null);
    setError(null);

    fetch(`/api/posts/${postId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const p = data.post;
        setPost({
          id: p.id,
          status: p.status,
          scheduledAt: p.scheduledAt,
          variants: p.variants.map((v: any) => ({
            id: v.id,
            platform: v.platform,
            content: v.content,
            mediaUrls: v.mediaUrls,
            status: v.status,
            errorLog: v.errorLog,
            scheduledAt: v.scheduledAt,
            publishedAt: v.publishedAt,
            accountName: v.account?.accountName ?? "",
          })),
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Eroare la încărcare");
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <Modal open={postId !== null} onClose={onClose} maxWidth="max-w-2xl">
      {error && (
        <p className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-3 text-sm text-state-error">
          {error}
        </p>
      )}
      {!error && !post && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal border-t-transparent" />
        </div>
      )}
      {post && <PostDetail post={post} />}
    </Modal>
  );
}
