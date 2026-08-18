import type { Insight } from "@/lib/insights-engine";

const SEVERITY_STYLES: Record<Insight["severity"], { badge: string; dot: string }> = {
  positive: { badge: "bg-state-success/10 text-state-success", dot: "bg-state-success" },
  warning: { badge: "bg-state-error/10 text-state-error", dot: "bg-state-error" },
  info: { badge: "bg-signal-soft text-signal-bright", dot: "bg-signal" },
};

export function ProfessionalAnalysis({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold text-base">Rezumat profesional</h2>
        <span className="text-[10px] text-mist-500 uppercase tracking-wide">Generat automat, din datele tale</span>
      </div>
      <p className="text-xs text-mist-500 mb-4">
        Observații calculate direct din performanța reală — niciun API extern de AI implicat.
      </p>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-ink-700 p-3.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_STYLES[insight.severity].dot}`} />
            <div>
              <p className="text-sm font-medium text-mist-100">{insight.title}</p>
              <p className="text-xs text-mist-500 mt-1 leading-relaxed">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
