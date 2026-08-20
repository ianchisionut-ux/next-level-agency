const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  NEW: { bg: "bg-signal-soft text-signal-bright", dot: "bg-signal", label: "Nou" },
  CONTACTED: { bg: "bg-state-warning/15 text-state-warning", dot: "bg-state-warning", label: "Contactat" },
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
