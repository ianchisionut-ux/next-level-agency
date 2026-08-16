const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  DRAFT: { bg: "bg-ink-700 text-mist-300", dot: "bg-mist-500", label: "Ciornă" },
  SCHEDULED: { bg: "bg-signal-soft text-signal-bright", dot: "bg-signal", label: "Programat" },
  PUBLISHING: { bg: "bg-state-warning/15 text-state-warning", dot: "bg-state-warning", label: "Se publică" },
  PUBLISHED: { bg: "bg-state-success/15 text-state-success", dot: "bg-state-success", label: "Publicat" },
  FAILED: { bg: "bg-state-error/15 text-state-error", dot: "bg-state-error", label: "Eșuat" },
  PARTIALLY_PUBLISHED: {
    bg: "bg-state-warning/15 text-state-warning",
    dot: "bg-state-warning",
    label: "Parțial publicat",
  },
  PENDING: { bg: "bg-ink-700 text-mist-300", dot: "bg-mist-500", label: "În așteptare" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
