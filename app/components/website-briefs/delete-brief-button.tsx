"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteBriefButton({ id, companyName }: { id: string; companyName: string }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    await fetch(`/api/oferte-web/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      onMouseLeave={() => setConfirmDelete(false)}
      disabled={isDeleting}
      title={confirmDelete ? `Confirmă ștergerea „${companyName}”` : "Șterge oferta"}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        confirmDelete
          ? "border-state-error bg-state-error text-white"
          : "border-ink-700 text-state-error hover:bg-state-error/10"
      }`}
    >
      {isDeleting ? "..." : confirmDelete ? "Sigur?" : "Șterge"}
    </button>
  );
}
