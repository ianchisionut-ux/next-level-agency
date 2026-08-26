const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  NEW: { bg: "bg-signal-soft text-signal-bright", dot: "bg-signal", label: "Nou" },
  CONTACTED: { bg: "bg-state-warning/15 text-state-warning", dot: "bg-state-warning", label: "Contactat" },
  QUOTED: { bg: "bg-violet-100 text-violet-700", dot: "bg-violet-500", label: "Ofertat" },
  ACCEPTED: { bg: "bg-state-success/15 text-state-success", dot: "bg-state-success", label: "Acceptat" },
  REJECTED: { bg: "bg-state-error/15 text-state-error", dot: "bg-state-error", label: "Respins" },
  ARCHIVED: { bg: "bg-ink-700 text-mist-300", dot: "bg-mist-500", label: "Arhivat" },
};

export function BriefStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
