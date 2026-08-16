interface Props {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
  accent?: "signal" | "success" | "warning" | "error";
}

const ACCENT_MAP = {
  signal: "text-signal-bright",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
};

export function StatCard({ label, value, trend, accent = "signal" }: Props) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
      <p className="text-xs text-mist-500 uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`font-mono text-2xl font-medium ${ACCENT_MAP[accent]}`}>{value}</span>
        {trend && (
          <span className={`text-xs font-mono ${trend.positive ? "text-state-success" : "text-state-error"}`}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
